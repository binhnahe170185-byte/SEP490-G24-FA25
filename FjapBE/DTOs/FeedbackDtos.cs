using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace FJAP.DTOs;

public record CreateFeedbackRequest(
    int StudentId,
    int ClassId,
    int SubjectId,
    Dictionary<int, int> Answers,
    bool WantsOneToOne,
    string? FreeText,
    string? FreeTextTranscript
);

public record FeedbackDto(
    int Id,
    int StudentId,
    string? StudentName,
    string? StudentCode,
    int ClassId,
    string? ClassName,
    int SubjectId,
    string? SubjectCode,
    string? SubjectName,
    Dictionary<int, int>? Answers,
    List<FeedbackQuestionDto>? Questions,
    bool WantsOneToOne,
    string? FreeText,
    string? FreeTextTranscript,
    decimal SatisfactionScore,
    string Sentiment,
    decimal? SentimentScore,
    List<string>? Keywords,
    List<string>? AiSuggestions,
    int Urgency,
    string? MainIssue,
    string? IssueCategory,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record FeedbackFilterRequest(
    int? ClassId = null,
    int? SubjectId = null,
    string? Sentiment = null,
    int? Urgency = null,
    string? Status = null,
    List<int>? LecturerClassIds = null,
    int Page = 1,
    int PageSize = 20
);

public record UpdateFeedbackStatusRequest(
    string Status
);

public record AnswerOptionDto(
    int Value,
    string Label,
    string Icon,
    string Color
);

public record CreateFeedbackQuestionRequest(
    string QuestionText,
    string? EvaluationLabel = null,
    int OrderIndex = 0,
    int? SubjectId = null,
    List<AnswerOptionDto>? AnswerOptions = null
);

public record UpdateFeedbackQuestionRequest(
    string? QuestionText = null,
    string? EvaluationLabel = null,
    int? OrderIndex = null,
    bool? IsActive = null,
    int? SubjectId = null,
    List<AnswerOptionDto>? AnswerOptions = null
);

public record FeedbackQuestionDto(
    int Id,
    string QuestionText,
    string? EvaluationLabel,
    int OrderIndex,
    bool IsActive,
    int? SubjectId,
    string? SubjectCode,
    string? SubjectName,
    List<AnswerOptionDto>? AnswerOptions,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AiAnalysisResult(
    [property: JsonPropertyName("sentiment")] string Sentiment,
    [property: JsonPropertyName("sentiment_score")] decimal SentimentScore,
    [property: JsonPropertyName("keywords")] List<string>? Keywords,
    [property: JsonPropertyName("suggestions")] List<string>? Suggestions,
    [property: JsonPropertyName("urgency")] int Urgency,
    [property: JsonPropertyName("main_issue")] string MainIssue,
    [property: JsonPropertyName("issue_category")] string? IssueCategory = null,
    // New fields for 8-category system (C1..F1)
    [property: JsonPropertyName("category_code")] string? CategoryCode = null,
    [property: JsonPropertyName("category_name")] string? CategoryName = null,
    [property: JsonPropertyName("confidence")] decimal? Confidence = null,
    [property: JsonPropertyName("reason")] string? Reason = null
);

// New AI result model for 8 fixed categories (C1..F1)
public record AiFeedbackAnalysisResult(
    string CategoryCode,
    string CategoryName,
    FJAP.vn.fpt.edu.models.IssueCategory CategoryEnum,
    double Confidence,
    int Urgency,
    string Reason,
    string Sentiment,
    double? SentimentScore
);

public record FeedbackIssueParetoItemDto(
    string Issue,
    int Count,
    decimal Percent,
    decimal CumulativePercent,
    string? Description = null
);

// Lecturer view DTOs (ẩn danh sinh viên)
public record LecturerFeedbackClassDto(
    int ClassId,
    string ClassName,
    string SubjectName,
    string? SubjectCode,
    string SemesterName,
    int FeedbackCount
);

public record LecturerClassFeedbackItemDto(
    int Id,
    int ClassId,
    string? ClassName,
    int SubjectId,
    string? SubjectCode,
    string? SubjectName,
    Dictionary<int, int>? Answers,
    bool WantsOneToOne,
    string? FreeText,
    string? FreeTextTranscript,
    decimal SatisfactionScore,
    string Sentiment,
    decimal? SentimentScore,
    int Urgency,
    string? MainIssue,
    string? IssueCategory,
    DateTime CreatedAt
);

public record PendingFeedbackClassDto(
    int ClassId,
    string ClassName,
    string SubjectName,
    string? SubjectCode,
    int DaysUntilEnd
);

public record FeedbackQuestionParetoItemDto(
    int QuestionId,
    string QuestionText,
    string? EvaluationLabel,
    decimal AverageScore,
    int ResponseCount,
    int OrderIndex,
    decimal Percentage
);

public record TextSummaryItemDto(
    string Topic,
    string Summary,
    int MentionCount,
    List<string> Examples,
    int UrgencyScore
);

public record FeedbackTextSummaryDto(
    List<TextSummaryItemDto> PositiveSummary,
    List<TextSummaryItemDto> NegativeSummary,
    int TotalPositiveCount,
    int TotalNegativeCount
);

// Daily Feedback DTOs
public record CreateDailyFeedbackRequest(
    int StudentId,
    int LessonId,
    int ClassId,
    int SubjectId,
    string FeedbackText,
    string? FeedbackTextTranscript
);

public record DailyFeedbackDto(
    int Id,
    int StudentId,
    string? StudentName,
    string? StudentCode,
    int LessonId,
    string? LessonDate,
    int ClassId,
    string? ClassName,
    int SubjectId,
    string? SubjectCode,
    string? SubjectName,
    string FeedbackText,
    string? FeedbackTextTranscript,
    string Sentiment,
    int Urgency,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record DailyFeedbackFilterRequest(
    int? ClassId = null,
    int? SubjectId = null,
    int? LessonId = null,
    DateTime? DateFrom = null,
    DateTime? DateTo = null,
    string? Sentiment = null,
    int? Urgency = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 20
);

public record UpdateDailyFeedbackStatusRequest(
    string Status
);

