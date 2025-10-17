using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class GradeType
{
    public int GradeTypeId { get; set; }

    public int GradeId { get; set; }

    public int SubjectGradeTypeId { get; set; }

    /// <summary>
    /// Điểm thực tế của sinh viên
    /// </summary>
    public decimal? Score { get; set; }

    /// <summary>
    /// Nhận xét của giảng viên
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// Lecturer ID đã chấm
    /// </summary>
    public int? GradedBy { get; set; }

    public DateTime? GradedAt { get; set; }

    public string? Status { get; set; }

    public virtual Grade Grade { get; set; } = null!;

    public virtual SubjectGradeType SubjectGradeType { get; set; } = null!;
}
