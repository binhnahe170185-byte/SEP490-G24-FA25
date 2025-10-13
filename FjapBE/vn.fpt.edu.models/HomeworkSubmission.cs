using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class HomeworkSubmission
{
    public int HomeworkSubmissionId { get; set; }

    public int StudentId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? Comment { get; set; }

    public string? Feedback { get; set; }

    public string? Status { get; set; }

    public string? FilePath { get; set; }

    public int HomeworkId { get; set; }

    public virtual Homework Homework { get; set; } = null!;
}
