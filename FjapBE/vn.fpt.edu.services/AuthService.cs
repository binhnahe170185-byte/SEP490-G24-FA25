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
        var claims = new[]
        {
            // Đặt sub = Users.UserId (số) để controller đọc được userId trực tiếp
            new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
            // Thêm claim chuẩn email để các chỗ khác có thể đọc email khi cần
            new Claim(JwtRegisteredClaimNames.Email, account.Email)
        };

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