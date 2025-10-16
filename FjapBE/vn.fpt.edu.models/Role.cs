using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Role
{
    public int RoleId { get; set; }

    public string RoleName { get; set; } = null!;

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
