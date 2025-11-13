using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Semester
{
    public int SemesterId { get; set; }

    public string Name { get; set; } = null!;

    public string SemesterCode { get; set; } = null!;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
