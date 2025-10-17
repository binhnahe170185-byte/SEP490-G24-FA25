using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Class
{
    public int ClassId { get; set; }

    public string ClassName { get; set; } = null!;

    public int SemesterId { get; set; }

    public string? Status { get; set; }

    public int LevelId { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int SubjectId { get; set; }

    public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();

    public virtual Level Level { get; set; } = null!;

    public virtual Semester Semester { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
