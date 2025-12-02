using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Subject
{
    public int SubjectId { get; set; }

    public string SubjectCode { get; set; } = null!;

    public string SubjectName { get; set; } = null!;

    public string? Status { get; set; }

    public string? Description { get; set; }

    public decimal? PassMark { get; set; }

    public DateTime? CreatedAt { get; set; }

    public int LevelId { get; set; }

    public int TotalLesson { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<FeedbackQuestion> FeedbackQuestions { get; set; } = new List<FeedbackQuestion>();

    public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual Level Level { get; set; } = null!;

    public virtual ICollection<Material> Materials { get; set; } = new List<Material>();

    public virtual ICollection<SubjectGradeType> SubjectGradeTypes { get; set; } = new List<SubjectGradeType>();
}
