using System;
using System.Collections.Generic;
using System.Text.Json;
using FJAP.DTOs;

namespace FJAP.vn.fpt.edu.models;

public partial class FeedbackQuestion
{
    public int Id { get; set; }

    public string QuestionText { get; set; } = null!;

    public string? EvaluationLabel { get; set; }

    public int OrderIndex { get; set; }

    public bool IsActive { get; set; }

    public int? SubjectId { get; set; }

    public string? AnswerOptions { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Subject? Subject { get; set; }

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
            return null;
        }
    }

    public void SetAnswerOptionsList(List<AnswerOptionDto>? options)
    {
        AnswerOptions = options == null ? null : JsonSerializer.Serialize(options);
    }
}

