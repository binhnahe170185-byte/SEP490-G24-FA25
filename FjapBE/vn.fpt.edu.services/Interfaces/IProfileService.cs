using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IProfileService
{
    Task<ProfileDto?> GetProfileAsync(int userId);
    Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request);
}

