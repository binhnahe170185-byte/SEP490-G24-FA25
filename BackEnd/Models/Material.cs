using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Material
{
    public int MaterialId { get; set; }

    public string Title { get; set; } = null!;

    public string? FilePath { get; set; }

    public string? MaterialDescription { get; set; }

    public DateTime? CreateAt { get; set; }

    public DateTime? UpdateAt { get; set; }

    public string? Status { get; set; }

    public int? CreateBy { get; set; }

    public int? UpdateBy { get; set; }

    public int LessonId { get; set; }

    public int UserId { get; set; }

    public virtual Lesson Lesson { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
