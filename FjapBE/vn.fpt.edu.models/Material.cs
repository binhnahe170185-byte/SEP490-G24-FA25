using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Material
{
    public int MaterialId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string FileUrl { get; set; } = null!;

    public string Status { get; set; } = null!;

    public int SubjectId { get; set; }

    public int? CreatedBy { get; set; }

    public int? UpdatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Subject Subject { get; set; } = null!;

    public virtual User? UpdatedByNavigation { get; set; }
}
