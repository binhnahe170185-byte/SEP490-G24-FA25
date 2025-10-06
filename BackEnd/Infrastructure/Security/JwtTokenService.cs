using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace FJAP.Infrastructure.Security
{
    /// <summary>
    /// Chỉ phát token sau khi đã xác thực người dùng.
    /// </summary>
    public class JwtTokenService
    {
        private readonly JwtOptions _opt;
        private readonly SymmetricSecurityKey _key;

        public JwtTokenService(JwtOptions opt)
        {
            _opt = opt;
            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opt.Key));
        }

        public string CreateToken(AppUser user, int? minutes = null)
        {
            var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);

            // NHỚ: claim Role theo chuẩn => ClaimTypes.Role
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.UserId ?? string.Empty),
                new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new("name", user.Name ?? string.Empty)
            };

            if (user.RoleId.HasValue)
                claims.Add(new Claim("role_id", user.RoleId.Value.ToString()));

            if (!string.IsNullOrWhiteSpace(user.RoleName))
                claims.Add(new Claim(ClaimTypes.Role, user.RoleName!)); // để [Authorize(Roles="...")] hoạt động

            var token = new JwtSecurityToken(
                issuer: _opt.Issuer,
                audience: _opt.Audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddMinutes(minutes ?? _opt.ExpireMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
