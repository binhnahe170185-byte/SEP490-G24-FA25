// Infrastructure/Extensions/ServiceCollectionExtensions.cs
using Backend.Data;
using FJAP.Handles.Manager;
using FJAP.Handles.student;
using MySqlConnector;
using System.Data;

namespace FJAP.Infrastructure.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddAppServices(
            this IServiceCollection services, IConfiguration cfg)
        {
            // Nếu MySqlDb KHÔNG giữ connection thì giữ nguyên Singleton.
            // Còn nếu có giữ MySqlConnection bên trong -> đổi sang Scoped.
            services.AddSingleton<MySqlDb>();

            // Đăng ký IDbConnection chuẩn (mọi Handle có thể Inject)
            services.AddScoped<IDbConnection>(_ =>
            {
                var cs = cfg.GetConnectionString("MySql")
                    ?? throw new InvalidOperationException("Missing ConnectionStrings:MySql");
                return new MySqlConnection(cs);
            });

            // Các Handles của bạn
            services.AddScoped<IStudentsHandle, StudentsHandle>();
            services.AddScoped<IClassHandle, ClassHandle>();

            // (nếu có) services.AddScoped<IAccountHandles, AccountHandles>();

            return services;
        }
    }
}
