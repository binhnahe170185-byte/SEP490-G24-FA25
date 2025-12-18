using FJAP.vn.fpt.edu.models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FJAP.Services.Interfaces;
using FJAP.DTOs;

public class AuthService : IAuthService
{
    private readonly IAuthRepository _repo;
    private readonly IConfiguration _config;

    public AuthService(IAuthRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }



    public string GenerateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            // Đặt sub = Users.UserId (số) để controller đọc được userId trực tiếp
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            // Thêm claim chuẩn email để các chỗ khác có thể đọc email khi cần
            new Claim(JwtRegisteredClaimNames.Email, user.Email)
        };

        // Bổ sung role_id và role name để phân quyền ở backend
        claims.Add(new Claim("role_id", user.RoleId.ToString()));
        var roleName = user.Role?.RoleName;
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

    public async Task<LoginResponse?> LoginAsync(string credential, string clientId)
    {
        // Verify Google token
        var payload = await _repo.VerifyGoogleTokenAsync(credential, clientId);
        if (payload == null) return null;

        // Get user by email
        var user = await _repo.GetByEmailAsync(payload.Email);
        if (user == null) return null;

        // Generate JWT token
        var token = GenerateJwtToken(user);

        // Build response
        var response = new LoginResponse
        {
            Token = token,
            Email = user.Email,
            Name = user.FirstName,
            Picture = user.Avatar,
            RoleId = user.RoleId,
            UserId = user.UserId
        };

        // Add role-specific IDs
        if (user.RoleId == 4) // Student
        {
            var studentId = await _repo.GetStudentIdByUserIdAsync(user.UserId);
            response.StudentId = studentId;
        }
        else if (user.RoleId == 3) // Lecturer
        {
            var lecturerId = await _repo.GetLectureIdByUserIdAsync(user.UserId);
            response.LecturerId = lecturerId;
        }

        return response;
    }
}