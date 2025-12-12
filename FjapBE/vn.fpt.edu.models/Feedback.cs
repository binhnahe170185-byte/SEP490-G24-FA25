using System;
using System.Collections.Generic;
using System.Text.Json;

namespace FJAP.vn.fpt.edu.models;

/// <summary>
/// Bảng lưu feedback của student và kết quả AI analysis
/// </summary>
public partial class Feedback
{
    public int Id { get; set; }

    /// <summary>
    /// ID của student gửi feedback
    /// </summary>
    public int StudentId { get; set; }

    /// <summary>
    /// ID của class được feedback
    /// </summary>
    public int ClassId { get; set; }

    /// <summary>
    /// ID của subject được feedback
    /// </summary>
    public int SubjectId { get; set; }

    /// <summary>
    /// 1 = Có muốn hỗ trợ 1-1, 0 = Không
    /// </summary>
    public bool WantsOneToOne { get; set; }

    /// <summary>
    /// Mô tả thêm vấn đề (tối đa 1200 ký tự)
    /// </summary>
    public string? FreeText { get; set; }

    /// <summary>
    /// Transcript từ speech-to-text (nếu có)
    /// </summary>
    public string? FreeTextTranscript { get; set; }

    /// <summary>
    /// 0.00 - 1.00
    /// </summary>
    public decimal SatisfactionScore { get; set; }

    public string Sentiment { get; set; } = null!;

    /// <summary>
    /// -1.00 đến 1.00
    /// </summary>
    public decimal? SentimentScore { get; set; }

    /// <summary>
    /// Array các keywords từ AI
    /// </summary>
    public string? Keywords { get; set; }

    /// <summary>
    /// Array các suggestions từ AI (1-3 items)
    /// </summary>
    public string? AiSuggestions { get; set; }

    /// <summary>
    /// 0-10, urgency &gt;= 7 sẽ gửi notification
    /// </summary>
    public int Urgency { get; set; }

    /// <summary>
    /// Vấn đề chính được AI phát hiện
    /// </summary>
    public string? MainIssue { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Map of questionId to answer value (1-4), lưu dạng JSON
    /// </summary>
    public string? Answers { get; set; }

    public Dictionary<int, int>? GetAnswersDict()
    {
        if (string.IsNullOrWhiteSpace(Answers))
            return null;
        try
        {
            return JsonSerializer.Deserialize<Dictionary<int, int>>(Answers);
        }
        catch
        {
            return null;
        }
    }

    public void SetAnswersDict(Dictionary<int, int>? answers)
    {
        Answers = answers == null ? null : JsonSerializer.Serialize(answers);
    }

    /// <summary>
    /// Category code for feedback issue (e.g., ASSESSMENT_LOAD, FACILITY_ISSUES)
    /// </summary>
    public string? IssueCategory { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual Student Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;
}
