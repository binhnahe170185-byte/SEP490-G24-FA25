using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Timeslot
{
    public int TimeId { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}
