namespace FJAP.Infrastructure.Extensions
{
    public static class EmailExtensions
    {
        // Lấy phần trước @, ví dụ "a@b.com" -> "a"
        public static string? ToHandle(this string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var at = email.IndexOf('@');
            return at > 0 ? email[..at] : email;
        }
    }
}
