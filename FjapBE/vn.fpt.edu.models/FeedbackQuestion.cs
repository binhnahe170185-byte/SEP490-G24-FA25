using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

/// <summary>
/// Bảng quản lý câu hỏi feedback (Academic Staff có thể tạo/sửa)
/// </summary>
public partial class FeedbackQuestion
{
    public int Id { get; set; }

    /// <summary>
    /// Nội dung câu hỏi
    /// </summary>
    public string QuestionText { get; set; } = null!;

    public string? EvaluationLabel { get; set; }

    /// <summary>
    /// Thứ tự hiển thị (1, 2, 3...)
    /// </summary>
    public int OrderIndex { get; set; }

    /// <summary>
    /// 1 = Active, 0 = Inactive
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// NULL = áp dụng cho tất cả môn, có giá trị = chỉ áp dụng cho môn đó
    /// </summary>
    public int? SubjectId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Array of answer options: [{value, label, icon, color}]
    /// </summary>
    public string? AnswerOptions { get; set; }

    public virtual Subject? Subject { get; set; }
}
