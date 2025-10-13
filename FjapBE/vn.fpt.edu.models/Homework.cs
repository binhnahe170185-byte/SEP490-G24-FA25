using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Homework
{
    public int HomeworkId { get; set; }

    public int LessonId { get; set; }

    public string Title { get; set; } = null!;

    public string? Content { get; set; }

    public string? FilePath { get; set; }

    public DateTime? Deadline { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<HomeworkSubmission> HomeworkSubmissions { get; set; } = new List<HomeworkSubmission>();

    public virtual ICollection<HomeworkType> HomeworkTypes { get; set; } = new List<HomeworkType>();

    public virtual Lesson Lesson { get; set; } = null!;
}
