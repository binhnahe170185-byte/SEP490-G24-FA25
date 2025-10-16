using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Notification
{
    public int Id { get; set; }

    public DateTime? CreatedTime { get; set; }

    public int? CreatedBy { get; set; }

    public string Title { get; set; } = null!;

    public string? Content { get; set; }

    public int UserId { get; set; }

    public virtual User User { get; set; } = null!;
}
