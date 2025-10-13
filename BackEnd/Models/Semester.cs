using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Semester
{
    public int SemesterId { get; set; }
    public string Name { get; set; } = null!;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

    // CHẶN vòng: User.Semester -> Semester.Users -> User...
    [JsonIgnore]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
