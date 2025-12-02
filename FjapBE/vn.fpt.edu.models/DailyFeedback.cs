using System;

namespace FJAP.vn.fpt.edu.models;

public partial class DailyFeedback
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int LessonId { get; set; }

    public int ClassId { get; set; }

    public int SubjectId { get; set; }

    public string FeedbackText { get; set; } = string.Empty;

    public string? FeedbackTextTranscript { get; set; }

    public string Sentiment { get; set; } = "Neutral";

    public int Urgency { get; set; }

    public string Status { get; set; } = "New";

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Student Student { get; set; } = null!;

    public virtual Lesson Lesson { get; set; } = null!;

    public virtual Class Class { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;
}

