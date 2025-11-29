using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.DTOs;
using Google.Apis.Auth;

namespace FJAP.Services.Interfaces;

public interface IAuthService 
{
  //Task<bool> ValidatePasswordAsync(string email, string password);
    public string GenerateJwtToken(User user);
    public Task<LoginResponse?> LoginAsync(string credential, string clientId);
}