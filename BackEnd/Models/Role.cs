using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Role
{
    public int RoleId { get; set; }

    public string RoleName { get; set; } = null!;

    public  ICollection<User> Users { get; set; } = new List<User>();
}
