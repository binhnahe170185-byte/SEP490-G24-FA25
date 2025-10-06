namespace FJAP.Infrastructure.Security
{
    public class JwtOptions
    {
        public string Issuer { get; set; } = default!;
        public string Audience { get; set; } = default!;
        public string Key { get; set; } = default!;
        public int ExpireMinutes { get; set; } = 60; // mặc định
    }
}
