using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class ProfileService : IProfileService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly FjapDbContext _context;

    public ProfileService(IGenericRepository<User> userRepository, FjapDbContext context)
    {
        _userRepository = userRepository;
        _context = context;
    }

    public async Task<ProfileDto?> GetProfileAsync(int userId)
    {
        var user = await _userRepository.FirstOrDefaultAsync(
            u => u.UserId == userId,
            includeProperties: "Department,Role",
            noTracking: true);

        if (user == null) return null;

        return new ProfileDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Address = user.Address,
            Email = user.Email,
            Gender = user.Gender,
            Avatar = user.Avatar,
            Dob = user.Dob,
            PhoneNumber = user.PhoneNumber,
            RoleId = user.RoleId,
            Status = user.Status,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.DepartmentName,
            RoleName = user.Role?.RoleName
        };
    }

    public async Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return false;

        // Update các trường có thể chỉnh sửa
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Address = request.Address.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.Gender = request.Gender.Trim();
        user.Dob = request.Dob;
        
        if (!string.IsNullOrWhiteSpace(request.Avatar))
        {
            user.Avatar = request.Avatar.Trim();
        }

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();
        return true;
    }
}

