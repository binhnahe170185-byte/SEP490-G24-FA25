using Microsoft.AspNetCore.Mvc;
using FJAP.Services.Interfaces;
using FJAP.DTOs;

namespace FJAP.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _config;

    public AuthController(IAuthService authService, IConfiguration config)
    {
        _authService = authService;
        _config = config;
    }

    public record GoogleLoginRequest(string Credential); // id_token từ FE

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] GoogleLoginRequest request)
    {
        var clientId = _config["Google:ClientId"];
        var response = await _authService.LoginAsync(request.Credential, clientId);
        
        if (response == null) 
            return Unauthorized();

        return Ok(response);
    }
}
