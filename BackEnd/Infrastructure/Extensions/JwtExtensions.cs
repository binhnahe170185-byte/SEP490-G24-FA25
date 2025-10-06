// Infrastructure/Extensions/JwtExtensions.cs
using FJAP.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace FJAP.Infrastructure.Extensions
{
    public static class JwtExtensions
    {
        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
        {
            var jwt = config.GetSection("Jwt").Get<JwtOptions>()
                      ?? throw new Exception("Missing Jwt section");
            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));

            // Service phát token
            services.AddSingleton(new JwtTokenService(jwt));

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(o =>
                {
                    o.RequireHttpsMetadata = false; // dev
                    o.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateIssuerSigningKey = true,
                        ValidateLifetime = true,
                        IssuerSigningKey = signingKey,
                        ValidIssuer = jwt.Issuer,
                        ValidAudience = jwt.Audience,
                        ClockSkew = TimeSpan.FromSeconds(30)
                    };
                });

            // Policies ví dụ
            services.AddAuthorization(opt =>
            {
                opt.AddPolicy("ManagerOrAdmin", p => p.RequireRole("Manager", "Admin"));
                opt.AddPolicy("RoleId>=2", p => p.RequireAssertion(ctx =>
                {
                    var roleIdStr = ctx.User.FindFirst("role_id")?.Value;
                    return int.TryParse(roleIdStr, out var roleId) && roleId >= 2;
                }));
            });

            return services;
        }
    }
}
