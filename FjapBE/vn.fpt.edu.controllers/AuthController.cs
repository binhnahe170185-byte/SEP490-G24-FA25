using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using FJAP.Services.Interfaces;
using FJAP.Repositories.Interfaces;

namespace FJAP.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IConfiguration _config;
    private readonly IAuthRepository _accountRepo;

    public AuthController(IAuthService auth, IConfiguration config, IAuthRepository accountRepo)
    {
        _auth = auth;
        _config = config;
        _accountRepo = accountRepo;
    }

    public record GoogleLoginRequest(string Credential); // id_token từ FE
    public record AuthResponse(string Token, string Email, string Name, string Picture);
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] GoogleLoginRequest request)
    {
        var clientId = _config["Google:ClientId"];
        var payload = await _accountRepo.VerifyGoogleTokenAsync(request.Credential, clientId);
        if (payload == null) return Unauthorized();

        var account = await _accountRepo.GetByEmailAsync(payload.Email);
        if (account == null) return Unauthorized(); 

        var token = _auth.GenerateJwtToken(account);

        object response = new
        {
            token,
            email = account.Email,
            name = account.User.FirstName,
            picture = account.User.Avatar,
            roleId = account.User.RoleId
        };

        if (account.User.RoleId == 4)
        {
            var studentId = await _accountRepo.GetStudentIdByUserIdAsync(account.UserId);
            response = new
            {
                token,
                email = account.Email,
                name = account.User.FirstName,
                picture = account.User.Avatar,
                roleId = account.User.RoleId,
                studentId
            };
        }
        else if (account.User.RoleId == 3)
        {
            var lecturerId = await _accountRepo.GetLectureIdByUserIdAsync(account.UserId);
            response = new
            {
                token,
                email = account.Email,
                name = account.User.FirstName,
                picture = account.User.Avatar,
                roleId = account.User.RoleId,
                lecturerId
            };
        }

        return Ok(response);
    }
}
