namespace FJAP.DTOs;

public class LoginResponse
{
    public string Token { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Picture { get; set; }
    public int RoleId { get; set; }
    public int? StudentId { get; set; }
    public int? LecturerId { get; set; }
}

