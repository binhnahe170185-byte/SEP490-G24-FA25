// Infrastructure/Extensions/IAdminRepository.cs
using FJAP.Models;

namespace FJAP.Repositories.Interfaces;

public interface IAdminRepository
{
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task<User?> GetByIdAsync(int id);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(int id);
    Task SaveChangesAsync();
}
