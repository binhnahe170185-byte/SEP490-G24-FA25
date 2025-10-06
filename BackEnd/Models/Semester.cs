using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Semester
{
    public int SemesterId { get; set; }

    public string Name { get; set; } = null!;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();
}
