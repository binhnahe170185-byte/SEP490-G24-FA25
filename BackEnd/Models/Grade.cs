using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Grade
{
    public int GradeId { get; set; }

    public string? UserId { get; set; }

    public int StudentId { get; set; }

    public int SubjectId { get; set; }

    public virtual ICollection<GradeType> GradeTypes { get; set; } = new List<GradeType>();

    public virtual Student Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;
}
