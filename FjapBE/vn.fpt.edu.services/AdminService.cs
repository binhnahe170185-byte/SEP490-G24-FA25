using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace FJAP.Services;

public class AdminService : IAdminService
{
    private readonly IAdminRepository _adminRepository;
    private readonly FjapDbContext _db; // cần để validate role/enum khi import

    public AdminService(IAdminRepository adminRepository, FjapDbContext db)
    {
        _adminRepository = adminRepository;
        _db = db;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
        => await _adminRepository.GetAllUsersAsync();

    public Task<User?> GetByIdAsync(int id)
        => _adminRepository.GetByIdAsync(id);

    public async Task<User> CreateAsync(User user)
    {
        await _adminRepository.AddAsync(user);
        await _adminRepository.SaveChangesAsync();
        return user;
    }

    public async Task<bool> UpdateAsync(User user)
    {
        var existing = await _adminRepository.GetByIdAsync(user.UserId);
        if (existing == null) return false;

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

        await _adminRepository.UpdateAsync(existing);
        await _adminRepository.SaveChangesAsync();
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
}
