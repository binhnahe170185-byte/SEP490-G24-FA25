// Infrastructure/Extensions/IAdminRepository.cs
using System.Linq.Expressions;
using FJAP.Models;

namespace FJAP.Repositories.Interfaces;

public interface IAdminRepository
{
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task<User?> GetByIdAsync(int id);

    // ⬇️ NEW: tiện cho import/check trùng
    Task<bool> ExistsAsync(Expression<Func<User, bool>> predicate);
    Task<User?> GetByEmailAsync(string email);

    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(int id);
    Task SaveChangesAsync();
}
