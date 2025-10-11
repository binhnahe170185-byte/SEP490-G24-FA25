using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class User
{
    public int UserId { get; set; }

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string? Address { get; set; }

    public string? Email { get; set; }

    public string? Gender { get; set; }

    public string? Avatar { get; set; }

    public DateOnly? Dob { get; set; }

    public string? PhoneNumber { get; set; }

    public int RoleId { get; set; }

    public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();

    public virtual ICollection<Lecture> Lectures { get; set; } = new List<Lecture>();

    public virtual ICollection<News> News { get; set; } = new List<News>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
