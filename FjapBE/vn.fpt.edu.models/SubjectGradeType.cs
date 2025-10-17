using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class SubjectGradeType
{
    public int SubjectGradeTypeId { get; set; }

    public int SubjectId { get; set; }

    /// <summary>
    /// Quiz, Assignment, Midterm, Final, etc.
    /// </summary>
    public string GradeTypeName { get; set; } = null!;

    /// <summary>
    /// Tỷ trọng % (0-100)
    /// </summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// Điểm tối đa (thường là 10)
    /// </summary>
    public decimal MaxScore { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    /// <summary>
    /// Manager ID tạo cấu hình
    /// </summary>
    public int? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<GradeType> GradeTypes { get; set; } = new List<GradeType>();

    public virtual Subject Subject { get; set; } = null!;
}
