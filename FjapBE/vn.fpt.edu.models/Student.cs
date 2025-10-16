using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Student
{
    public int StudentId { get; set; }

    public string? StudentCode { get; set; }

    public string? Status { get; set; }

    public int UserId { get; set; }

    public int LevelId { get; set; }

    public int? SemesterId { get; set; }

    public DateOnly EnrollmentDate { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual ICollection<HomeworkSubmission> HomeworkSubmissions { get; set; } = new List<HomeworkSubmission>();

    public virtual Level Level { get; set; } = null!;

    public virtual Semester? Semester { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
