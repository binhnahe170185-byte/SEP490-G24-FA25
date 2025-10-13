using Dapper;
using Microsoft.Extensions.DependencyInjection;

namespace FJAP.Infrastructure.Extensions
{
    public static class DapperExtensions
    {
        public static IServiceCollection AddDapperMapping(this IServiceCollection services)
        {
            DefaultTypeMap.MatchNamesWithUnderscores = true;
            return services;
        }
    }
}
