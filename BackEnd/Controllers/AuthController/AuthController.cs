using Dapper;
using FJAP.Infrastructure.Security;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _cfg;
    private readonly JwtTokenService _jwt;
    private readonly IDbConnection _db;

    public AuthController(IConfiguration cfg, JwtTokenService jwt, IDbConnection db)
    {
        _cfg = cfg;
        _jwt = jwt;
        _db = db;
    }

    public class GoogleLoginRequest
    {
        public string? Credential { get; set; }   // Google id_token từ FE
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest req)
    {
        if (req is null) return BadRequest("Missing JSON body");
        if (string.IsNullOrWhiteSpace(req.Credential))
            return BadRequest("Missing 'credential' (Google id_token)");

        try
        {
            var clientId = _cfg["Google:ClientId"] ?? throw new Exception("Missing Google:ClientId");
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            };

            // 1) Verify id_token
            var payload = await GoogleJsonWebSignature.ValidateAsync(req.Credential, settings);
            // payload.Email, payload.Name, payload.Picture

            // 2) Lấy user + role từ DB
            const string sql = @"
              SELECT a.account_id, a.email, u.user_id, u.first_name, u.last_name, r.role_id, r.role_name
              FROM fjap.account a
              JOIN fjap.user u ON a.user_id = u.user_id
              JOIN fjap.role r ON u.role_id = r.role_id
              WHERE a.email = @email
              LIMIT 1";
            var row = await _db.QueryFirstOrDefaultAsync(sql, new { email = payload.Email });

            if (row is null) return Unauthorized("Account not found"); // hoặc auto-create

            var appUser = new FJAP.Infrastructure.Security.AppUser
            {
                UserId = row.user_id.ToString(),
                Email = row.email,
                Name = $"{row.first_name} {row.last_name}",
                RoleId = (int)row.role_id,
                RoleName = (string)row.role_name
            };

            // 3) Phát JWT có role
            var token = _jwt.CreateToken(appUser);

            return Ok(new
            {
                token,
                profile = new { appUser.UserId, appUser.Email, appUser.Name, appUser.RoleId, appUser.RoleName }
            });
        }
        catch (InvalidJwtException ex)
        {
            // Token Google không hợp lệ → 400
            return BadRequest("Invalid Google token: " + ex.Message);
        }
        catch (Exception ex)
        {
            // Lỗi khác (DB, cấu hình…) → 500
            Console.WriteLine("GoogleLogin error: " + ex);
            return StatusCode(500, "Internal error");
        }
    }
}
