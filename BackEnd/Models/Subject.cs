using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Subject
{
    public int SubjectId { get; set; }

    public string SubjectCode { get; set; } = null!;

    public string SubjectName { get; set; } = null!;

    public string? Status { get; set; }

    public string? Description { get; set; }

    public decimal? PassMark { get; set; }

    public DateTime? CreatedAt { get; set; }

    public int SemesterId { get; set; }

    public int LevelId { get; set; }

    public int ClassId { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual Level Level { get; set; } = null!;

    public virtual ICollection<Material> Materials { get; set; } = new List<Material>();

    public virtual Semester Semester { get; set; } = null!;
}
