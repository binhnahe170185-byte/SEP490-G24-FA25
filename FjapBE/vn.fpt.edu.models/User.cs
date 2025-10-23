using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class User
{
    public int UserId { get; set; }

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string Gender { get; set; } = null!;

    public string? Avatar { get; set; }

    public DateOnly Dob { get; set; }

    public string PhoneNumber { get; set; } = null!;

    public int RoleId { get; set; }

    public string Status { get; set; } = null!;

    public int? DepartmentId { get; set; }

    public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();

    public virtual Department? Department { get; set; }

    public virtual ICollection<Lecture> Lectures { get; set; } = new List<Lecture>();

    public virtual ICollection<Material> Materials { get; set; } = new List<Material>();

    public virtual ICollection<News> News { get; set; } = new List<News>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
