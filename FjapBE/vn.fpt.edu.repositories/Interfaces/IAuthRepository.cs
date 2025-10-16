using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Google.Apis.Auth;

public interface IAuthRepository : IGenericRepository<Account>
{
    Task<Account?> GetByEmailAsync(string email);
    //ask<bool> ValidatePasswordAsync(string email, string password);
    Task<GoogleJsonWebSignature.Payload?> VerifyGoogleTokenAsync(string idToken, string clientId);

    Task<int?> GetStudentIdByUserIdAsync(int userId);
    Task<int?> GetLectureIdByUserIdAsync(int userId);


}
