using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Material
{
    public int MaterialId { get; set; }

    public string Title { get; set; } = null!;

    public string? FilePath { get; set; }

    public string? MaterialDescription { get; set; }

    public DateTime CreateAt { get; set; }

    public DateTime UpdateAt { get; set; }

    public string Status { get; set; } = null!;

    public int? CreateBy { get; set; }

    public int? UpdateBy { get; set; }

<<<<<<< HEAD
    public int UserId { get; set; }

    public virtual User User { get; set; } = null!;
=======
    public int? UserId { get; set; }

    public int? SubjectId { get; set; }

    public virtual Subject? Subject { get; set; }
>>>>>>> 179db62 (View list material, create api for subject)
}
