using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FJAP.Infrastructure.Extensions
{
    public static class CorsExtensions
    {
        public const string PolicyName = "AllowFrontend";

        public static IServiceCollection AddAppCors(this IServiceCollection services, IConfiguration config)
        {
            var origins = config.GetSection("Frontend:Origins").Get<string[]>()
                          ?? new[] { "http://localhost:3000" };

            services.AddCors(opt =>
            {
                opt.AddPolicy(PolicyName, p =>
                    p.WithOrigins(origins)
                     .AllowAnyHeader()
                     .AllowAnyMethod()
                // .AllowCredentials() // nếu dùng cookie httpOnly
                );
            });

            return services;
        }
    }
}
