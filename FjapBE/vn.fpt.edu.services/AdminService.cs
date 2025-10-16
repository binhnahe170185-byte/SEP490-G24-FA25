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

    public AdminService(IAdminRepository adminRepository)
    {
        _adminRepository = adminRepository;
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

        existing.FirstName = user.FirstName;
        existing.LastName = user.LastName;
        existing.Email = user.Email;
        existing.RoleId = user.RoleId;
        existing.Gender = user.Gender;
        existing.PhoneNumber = user.PhoneNumber;
        existing.Address = user.Address;
        existing.Avatar = user.Avatar;
        existing.Dob = user.Dob;

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
    // Yêu cầu header: FirstName | LastName | Address | Email | Gender | Avatar | Dob | PhoneNumber | RoleId
    public async Task<(int inserted, int skipped, List<string> errors)> ImportExcelAsync(Stream stream)
    {
        var errors = new List<string>();
        var inserted = 0;
        var skipped = 0;

        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First(); // sheet đầu

        bool isHeader = true;
        foreach (var row in ws.RowsUsed())
        {
            if (isHeader) { isHeader = false; continue; } // bỏ dòng tiêu đề

            string firstName = row.Cell(1).GetString().Trim();
            string lastName = row.Cell(2).GetString().Trim();
            string? address = row.Cell(3).GetString().Trim();
            string email = row.Cell(4).GetString().Trim();
            string? gender = row.Cell(5).GetString().Trim();
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

            if (!int.TryParse(roleStr, out int roleId))
            {
                skipped++; errors.Add($"Row {row.RowNumber()}: RoleId không hợp lệ");
                continue;
            }

            DateOnly? dob = null;
            if (!string.IsNullOrWhiteSpace(dobStr))
            {
                // cho phép: yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy
                if (DateTime.TryParse(dobStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                    dob = DateOnly.FromDateTime(dt);
                else
                {
                    // thử từ giá trị ô kiểu DateNumber của Excel
                    if (double.TryParse(dobStr, out var oa))
                    {
                        var asDate = DateTime.FromOADate(oa);
                        dob = DateOnly.FromDateTime(asDate);
                    }
                    else
                    {
                        errors.Add($"Row {row.RowNumber()}: Dob không parse được");
                    }
                }
            }

            var user = new User
            {
                FirstName = firstName,
                LastName = lastName,
                Address = string.IsNullOrWhiteSpace(address) ? null : address,
                Email = email,
                Gender = string.IsNullOrWhiteSpace(gender) ? null : gender,
                Avatar = string.IsNullOrWhiteSpace(avatar) ? null : avatar,
                Dob = (DateOnly)dob,
                PhoneNumber = string.IsNullOrWhiteSpace(phone) ? null : phone,
                RoleId = roleId
            };

            await _adminRepository.AddAsync(user);
            inserted++;
        }

        await _adminRepository.SaveChangesAsync();
        return (inserted, skipped, errors);
    }
}
