using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class News
{
    public int Id { get; set; }

    public int CreatedBy { get; set; }

    public string Title { get; set; } = null!;

    public string? NewsImage { get; set; }

    public string? Content { get; set; }

    public DateTime? CreatedTime { get; set; }

    public int UpdateBy { get; set; }

    public int UserId { get; set; }

    public virtual User User { get; set; } = null!;
}
