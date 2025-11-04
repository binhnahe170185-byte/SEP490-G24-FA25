using FJAP.vn.fpt.edu.models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FJAP.Services.Interfaces;
public class AuthService : IAuthService
{
    private readonly IAuthRepository _repo;
    private readonly IConfiguration _config;

    public AuthService(IAuthRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }



    public string GenerateJwtToken(Account account)
    {
        var claims = new List<Claim>
        {
            // Đặt sub = Users.UserId (số) để controller đọc được userId trực tiếp
            new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
            // Thêm claim chuẩn email để các chỗ khác có thể đọc email khi cần
            new Claim(JwtRegisteredClaimNames.Email, account.Email)
        };

        // Bổ sung role_id và role name để phân quyền ở backend
        var roleId = account.User?.RoleId;
        if (roleId != null)
        {
            claims.Add(new Claim("role_id", roleId.Value.ToString()));
        }
        var roleName = account.User?.Role?.RoleName;
        if (!string.IsNullOrWhiteSpace(roleName))
        {
            claims.Add(new Claim(ClaimTypes.Role, roleName!));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddMinutes(60),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}