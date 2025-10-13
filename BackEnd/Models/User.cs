using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace FJAP.Models;

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
    public DateOnly EnrollmentDate { get; set; }

    public int? SemesterId { get; set; }
    public int? LevelId { get; set; }
    public string PhoneNumber { get; set; } = null!;
    public int RoleId { get; set; }

    // ⛔ Các collection này dễ tạo vòng qua back-reference → bỏ serialize
    [JsonIgnore] public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();
    [JsonIgnore] public virtual ICollection<Lecture> Lectures { get; set; } = new List<Lecture>();
    [JsonIgnore] public virtual ICollection<Material> Materials { get; set; } = new List<Material>();
    [JsonIgnore] public virtual ICollection<News> News { get; set; } = new List<News>();
    [JsonIgnore] public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    [JsonIgnore] public virtual ICollection<Student> Students { get; set; } = new List<Student>();

    // Nếu FE không cần Role chi tiết thì cũng nên chặn để tránh vòng Role.Users
    [JsonIgnore] public virtual Role Role { get; set; } = null!;

    // GIỮ lại để FE đọc semester.name
    public virtual Semester? Semester { get; set; }

    // Nếu FE không dùng Level chi tiết, chặn luôn (tránh Level.Users vòng)
    [JsonIgnore] public virtual Level? Level { get; set; }
}
