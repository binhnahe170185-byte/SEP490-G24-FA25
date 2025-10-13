using System.Text.Json.Serialization;

namespace FJAP.Models
{
    public partial class Role
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;

        // CHẶN vòng Role.Users -> User.Role -> ...
        [JsonIgnore]
        public virtual ICollection<User> Users { get; set; } = new List<User>();
    }
}
