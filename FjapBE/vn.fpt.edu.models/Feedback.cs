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

    /// <summary>
    /// New 8-category code (C1..F1 or UNK) used for incremental text analysis summaries
    /// </summary>
    public string? CategoryCode { get; set; }

    /// <summary>
    /// Display name of the category (aligned with CategoryCode)
    /// </summary>
    public string? CategoryName { get; set; }

    /// <summary>
    /// Confidence returned by AI for the category classification (0..1)
    /// </summary>
    public decimal? CategoryConfidence { get; set; }

    /// <summary>
    /// Detailed reasoning/explanation returned by AI
    /// </summary>
    public string? AiReason { get; set; }

    /// <summary>
    /// Timestamp when this feedback was last analyzed by AI (used for incremental processing)
    /// </summary>
    public DateTime? AnalyzedAt { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual Student Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;
}
