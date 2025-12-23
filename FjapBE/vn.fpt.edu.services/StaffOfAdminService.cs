using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Globalization;
using System.Linq;
using System.Threading;

namespace FJAP.Services;

public class StaffOfAdminService : IStaffOfAdminService
{
    private readonly IStaffOfAdminRepository _adminRepository;
    private readonly FjapDbContext _db; // cần để validate role/enum khi import
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IConfiguration _configuration;
    private static readonly SemaphoreSlim LecturerCodeLock = new(1, 1);
    private static bool _lecturerCodeInitialized;
    private static int _lecturerCodeCounter;

    public StaffOfAdminService(IStaffOfAdminRepository adminRepository, FjapDbContext db, IServiceScopeFactory serviceScopeFactory, IConfiguration configuration)
    {
        _adminRepository = adminRepository;
        _db = db;
        _serviceScopeFactory = serviceScopeFactory;
        _configuration = configuration;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
        => await _adminRepository.GetAllUsersAsync();

    public Task<User?> GetByIdAsync(int id)
        => _adminRepository.GetByIdAsync(id);

    public async Task<User> CreateAsync(User user)
    {
        await _adminRepository.AddAsync(user);

        if (user.RoleId == 3)
        {
            var lecturer = new Lecture
            {
                LecturerCode = await GenerateNextLecturerCodeAsync(),
                User = user
            };

            await _db.Lectures.AddAsync(lecturer);
            user.Lectures.Add(lecturer);
        }

        await _adminRepository.SaveChangesAsync();

        // Gửi email chào mừng sau khi tạo user thành công
        try
        {
            Console.WriteLine($"=== Setting up welcome email for user: {user.Email} ===");
            var frontendOrigins = _configuration.GetSection("Frontend:Origins").Get<string[]>();
            // Ưu tiên production URL (không phải localhost)
            var loginUrl = GetProductionLoginUrl(frontendOrigins);

            Console.WriteLine($"Login URL: {loginUrl}");

            // Gửi email bất đồng bộ, không chờ kết quả để không làm chậm response
            // Sử dụng service scope factory để tạo scope mới cho email service
            _ = Task.Run(async () =>
            {
                try
                {
                    Console.WriteLine($"Starting email send task for {user.Email}");
                    using var scope = _serviceScopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    await emailService.SendWelcomeEmailAsync(
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        loginUrl
                    );
                    Console.WriteLine($"Email send task completed for {user.Email}");
                }
                catch (Exception ex)
                {
                    // Log lỗi nhưng không throw để không ảnh hưởng đến quá trình tạo user
                    Console.WriteLine($"Error sending welcome email to {user.Email}: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                }
            });
        }
        catch (Exception ex)
        {
            // Log lỗi nhưng không throw để không ảnh hưởng đến quá trình tạo user
            Console.WriteLine($"Error setting up welcome email for {user.Email}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }

        return user;
    }

    public async Task<bool> UpdateAsync(User user)
    {
        var existing = await _adminRepository.GetByIdForUpdateAsync(user.UserId);
        if (existing == null) return false;

        Console.WriteLine($"Updating user {user.UserId}: Status from '{existing.Status}' to '{user.Status}'");

        // map an toàn với schema mới
        existing.FirstName = user.FirstName;
        existing.LastName = user.LastName;
        existing.Email = user.Email;
        existing.RoleId = user.RoleId;
        existing.Gender = user.Gender;     // ENUM('Male','Female','Other') trong DB
        existing.PhoneNumber = user.PhoneNumber;
        existing.Address = user.Address;
        existing.Avatar = user.Avatar;
        existing.Dob = user.Dob;        // DateOnly
        existing.Status = user.Status;    // Update status field

        Console.WriteLine($"After update - Status: '{existing.Status}'");

        await _adminRepository.UpdateAsync(existing);
        await _adminRepository.SaveChangesAsync();

        Console.WriteLine("SaveChanges completed successfully");
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _adminRepository.GetByIdAsync(id);
        if (existing == null) return false;

        await _adminRepository.DeleteAsync(id);
        await _adminRepository.SaveChangesAsync();
        return true;
    }

    // ===================== IMPORT EXCEL =====================
    // Header: FirstName | LastName | Address | Email | Gender | Avatar | Dob | PhoneNumber | RoleId
    public async Task<(int inserted, int skipped, List<string> errors)> ImportExcelAsync(Stream stream)
    {
        var errors = new List<string>();
        var inserted = 0;
        var skipped = 0;

        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        bool isHeader = true;
        foreach (var row in ws.RowsUsed())
        {
            if (isHeader) { isHeader = false; continue; }

            string firstName = row.Cell(1).GetString().Trim();
            string lastName = row.Cell(2).GetString().Trim();
            string? address = row.Cell(3).GetString().Trim();
            string email = row.Cell(4).GetString().Trim();
            string? gender = row.Cell(5).GetString().Trim();   // "Male"/"Female"/"Other" hoặc rỗng
            string? avatar = row.Cell(6).GetString().Trim();
            string dobStr = row.Cell(7).GetString().Trim();
            string? phone = row.Cell(8).GetString().Trim();
            string roleStr = row.Cell(9).GetString().Trim();

            if (string.IsNullOrWhiteSpace(email))
            {
                skipped++; errors.Add($"Row {row.RowNumber()}: Email rỗng");
                continue;
            }

            // Trùng email -> bỏ
            var exists = await _adminRepository.ExistsAsync(u => u.Email == email);
            if (exists) { skipped++; continue; }

            // Validate RoleId
            if (!int.TryParse(roleStr, out int roleId))
            {
                skipped++; errors.Add($"Row {row.RowNumber()}: RoleId không hợp lệ");
                continue;
            }
            var roleExists = await _db.Roles.AnyAsync(r => r.RoleId == roleId);
            if (!roleExists)
            {
                skipped++; errors.Add($"Row {row.RowNumber()}: RoleId={roleId} không tồn tại");
                continue;
            }

            // Parse DOB (nullable)
            DateOnly? dob = null;
            if (!string.IsNullOrWhiteSpace(dobStr))
            {
                // chấp nhận các format thông dụng
                if (DateTime.TryParse(dobStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                {
                    dob = DateOnly.FromDateTime(dt);
                }
                else if (double.TryParse(dobStr, out var oa)) // Excel DateNumber
                {
                    var asDate = DateTime.FromOADate(oa);
                    dob = DateOnly.FromDateTime(asDate);
                }
                else
                {
                    errors.Add($"Row {row.RowNumber()}: Dob không parse được -> bỏ qua DOB");
                }
            }

            // Chuẩn hoá Gender theo ENUM DB
            string? normalizedGender = null;
            if (!string.IsNullOrWhiteSpace(gender))
            {
                var g = gender.Trim();
                if (g.Equals("Male", StringComparison.OrdinalIgnoreCase)) normalizedGender = "Male";
                else if (g.Equals("Female", StringComparison.OrdinalIgnoreCase)) normalizedGender = "Female";
                else normalizedGender = "Other"; // fallback hợp lệ với ENUM
            }

            // Lưu ý: các cột UNIQUE trong DB (email, phone_number) -> phone có thể rỗng
            var user = new User
            {
                FirstName = firstName,
                LastName = lastName,
                Address = string.IsNullOrWhiteSpace(address) ? null : address,
                Email = email,
                Gender = normalizedGender ?? "Other",
                Avatar = string.IsNullOrWhiteSpace(avatar) ? null : avatar,
                Dob = dob ?? new DateOnly(1990, 1, 1), // default an toàn nếu thiếu
                PhoneNumber = string.IsNullOrWhiteSpace(phone) ? null : phone,
                RoleId = roleId,
                Status = "Active" // default theo schema
            };

            try
            {
                await _adminRepository.AddAsync(user);

                if (roleId == 3)
                {
                    var lecturer = new Lecture
                    {
                        LecturerCode = await GenerateNextLecturerCodeAsync(),
                        User = user
                    };

                    await _db.Lectures.AddAsync(lecturer);
                    user.Lectures.Add(lecturer);
                }

                inserted++;
            }
            catch (Exception ex)
            {
                skipped++;
                errors.Add($"Row {row.RowNumber()}: Lỗi ghi DB - {ex.Message}");
            }
        }

        await _adminRepository.SaveChangesAsync();
        return (inserted, skipped, errors);
    }

    public async Task EnsureLecturerEntriesAsync()
    {
        await LecturerCodeLock.WaitAsync();
        try
        {
            var lecturerUserIds = await _db.Users
                .AsNoTracking()
                .Where(u => u.RoleId == 3)
                .Select(u => u.UserId)
                .ToListAsync();

            var existingLectureUserIds = await _db.Lectures
                .AsNoTracking()
                .Select(l => l.UserId)
                .ToListAsync();

            var missingLecturerUserIds = lecturerUserIds
                .Except(existingLectureUserIds)
                .ToList();

            if (missingLecturerUserIds.Count == 0)
            {
                return;
            }

            if (!_lecturerCodeInitialized)
            {
                var existingCodes = await _db.Lectures
                    .AsNoTracking()
                    .Select(l => l.LecturerCode)
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .ToListAsync();

                _lecturerCodeCounter = existingCodes
                    .Select(ExtractLecturerNumber)
                    .DefaultIfEmpty(0)
                    .Max();

                _lecturerCodeInitialized = true;
            }

            foreach (var userId in missingLecturerUserIds)
            {
                _lecturerCodeCounter++;
                var lecturer = new Lecture
                {
                    UserId = userId,
                    LecturerCode = $"LEC{_lecturerCodeCounter.ToString().PadLeft(2, '0')}"
                };
                await _db.Lectures.AddAsync(lecturer);
            }

            await _db.SaveChangesAsync();
        }
        finally
        {
            LecturerCodeLock.Release();
        }
    }

    private async Task<string> GenerateNextLecturerCodeAsync()
    {
        await LecturerCodeLock.WaitAsync();
        try
        {
            if (!_lecturerCodeInitialized)
            {
                var existingCodes = await _db.Lectures
                    .AsNoTracking()
                    .Select(l => l.LecturerCode)
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .ToListAsync();

                _lecturerCodeCounter = existingCodes
                    .Select(ExtractLecturerNumber)
                    .DefaultIfEmpty(0)
                    .Max(); _lecturerCodeInitialized = true;

                _lecturerCodeInitialized = true;
            }

            _lecturerCodeCounter++;
            return $"LEC{_lecturerCodeCounter.ToString().PadLeft(2, '0')}";
        }
        finally
        {
            LecturerCodeLock.Release();
        }
    }

    private static string GetProductionLoginUrl(string[]? frontendOrigins)
    {
        if (frontendOrigins == null || frontendOrigins.Length == 0)
        {
            return "http://localhost:3000/login";
        }

        var productionUrl = frontendOrigins
            .FirstOrDefault(url => !string.IsNullOrWhiteSpace(url) &&
                                   !url.Contains("localhost", StringComparison.OrdinalIgnoreCase) &&
                                   !url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(productionUrl))
        {
            return $"{productionUrl.TrimEnd('/')}/login";
        }

        // Fallback về URL đầu tiên nếu không tìm thấy production URL
        return $"{frontendOrigins[0].TrimEnd('/')}/login";
    }

    private static int ExtractLecturerNumber(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return 0;
        var normalized = code.Trim();
        if (!normalized.StartsWith("lec", StringComparison.OrdinalIgnoreCase) || normalized.Length <= 3)
        {
            return 0;
        }

        var numericPart = normalized[3..];
        return int.TryParse(numericPart, out var number) ? number : 0;
    }
}
