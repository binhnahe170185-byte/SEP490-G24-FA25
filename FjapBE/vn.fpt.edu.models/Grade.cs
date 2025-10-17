using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Grade
{
    public int GradeId { get; set; }

    public int StudentId { get; set; }

    public int SubjectId { get; set; }

    /// <summary>
    /// Điểm tổng kết (tự động tính)
    /// </summary>
    public decimal? FinalScore { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<GradeType> GradeTypes { get; set; } = new List<GradeType>();

    public virtual Student Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;
}
