using System;
using System.Collections.Generic;
using System.Text.Json;
using FJAP.DTOs;

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

    /// <summary>
    /// Helper: deserialize AnswerOptions JSON thành List&lt;AnswerOptionDto&gt;
    /// </summary>
    public List<AnswerOptionDto>? GetAnswerOptionsList()
    {
        if (string.IsNullOrWhiteSpace(AnswerOptions))
            return null;

        try
        {
            return JsonSerializer.Deserialize<List<AnswerOptionDto>>(AnswerOptions);
        }
        catch
        {
            // Nếu JSON lỗi, coi như không có options để tránh làm hỏng toàn bộ flow
            return null;
        }
    }

    /// <summary>
    /// Helper: serialize List&lt;AnswerOptionDto&gt; vào cột AnswerOptions (JSON)
    /// </summary>
    public void SetAnswerOptionsList(List<AnswerOptionDto>? options)
    {
        AnswerOptions = options == null ? null : JsonSerializer.Serialize(options);
    }
}
