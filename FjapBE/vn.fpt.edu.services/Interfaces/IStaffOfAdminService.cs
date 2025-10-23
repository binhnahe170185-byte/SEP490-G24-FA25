using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface IStaffOfAdminService
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByIdAsync(int id);
    Task<User> CreateAsync(User user);
    Task<bool> UpdateAsync(User user);
    Task<bool> DeleteAsync(int id);

    // Import từ Excel (.xlsx/.xls)
    Task<(int inserted, int skipped, List<string> errors)> ImportExcelAsync(Stream stream);
}
