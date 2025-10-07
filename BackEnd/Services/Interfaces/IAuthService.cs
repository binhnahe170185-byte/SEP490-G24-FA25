using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Google.Apis.Auth;

namespace FJAP.Services.Interfaces;

public interface IAuthService 
{
  //Task<bool> ValidatePasswordAsync(string email, string password);
    public string GenerateJwtToken(Account account);
}