// Infrastructure/Extensions/Level.cs
using System.Text.Json.Serialization;

namespace FJAP.Models
{
    public partial class Level
    {
        public int LevelId { get; set; }
        public string LevelName { get; set; } = null!;
        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
        public virtual ICollection<Student> Students { get; set; } = new List<Student>();
        public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

        // CHẶN vòng Level.Users -> User.Level -> ...
        [JsonIgnore]
        public virtual ICollection<User> Users { get; set; } = new List<User>();
    }
}
