using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Account
{
    public int AccountId { get; set; }

    public string Email { get; set; } = null!;

    public int UserId { get; set; }

    public virtual User User { get; set; } = null!;
}
