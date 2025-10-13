using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

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
}
