using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using FJAP.Repositories;
using FJAP.Repositories.Interfaces;
using FJAP.Services;
using FJAP.Services.Interfaces;

namespace FJAP.Infrastructure.Extensions
{
    public static class SwaggerExtensions
    {
        public static IServiceCollection AddAppSwagger(this IServiceCollection services)
        {
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "FJAP API", Version = "v1" });

                var securityScheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Description = "Nhập JWT theo dạng: Bearer {token}",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                };

                c.AddSecurityDefinition("Bearer", securityScheme);
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    { securityScheme, Array.Empty<string>() }
                });
            });

            return services;
        }

        //public static IServiceCollection AddAppServices(
        //    this IServiceCollection services, IConfiguration cfg)
        //{
        //    // Đăng ký DbContext nếu chưa có
        //    // services.AddDbContext<FjapDbContext>(...);

        //    // Đăng ký Repository & Service chuẩn
        //    services.AddScoped<IStudentRepository, StudentRepository>();
        //    services.AddScoped<IClassRepository, ClassRepository>();
        //    services.AddScoped<IAuthRepository, AuthRepository>();

        //    services.AddScoped<IStudentService, StudentService>();
        //    services.AddScoped<IClassService, ClassService>();
        //    services.AddScoped<IAuthService, AuthService>();

        //    return services;
        //}
    }
}
