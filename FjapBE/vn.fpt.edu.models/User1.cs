using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class User1
{
    public string UserId { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string? Password { get; set; }

    public string? FullName { get; set; }

    public string? Phone { get; set; }

    public ulong? Gender { get; set; }

    public DateOnly? Dob { get; set; }

    public int? Point { get; set; }

    public ulong? IsActive { get; set; }

    public string? Username { get; set; }

    public string? Image { get; set; }
}
