using FJAP.Repositories;
using FJAP.Repositories.Interfaces;
using FJAP.Services;
using FJAP.Services.Interfaces;

namespace FJAP.Infrastructure.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddAppServices(
            this IServiceCollection services, IConfiguration cfg)
        {
            // Đăng ký DbContext nếu chưa có
            // services.AddDbContext<FjapDbContext>(...);

            // Đăng ký Repository & Service chuẩn
            services.AddScoped<IStudentRepository, StudentRepository>();
            services.AddScoped<IClassRepository, ClassRepository>();
            services.AddScoped<IAuthRepository, AuthRepository>();

            services.AddScoped<IStudentService, StudentService>();
            services.AddScoped<IClassService, ClassService>();
            services.AddScoped<IAuthService, AuthService>();

            return services;
        }
    }
}