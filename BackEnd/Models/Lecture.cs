using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Lecture
{
    public int LectureId { get; set; }

    public int UserId { get; set; }

    public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();

    public virtual User User { get; set; } = null!;
}
