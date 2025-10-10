using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class Lesson
{
    public int LessonId { get; set; }

    public DateOnly Date { get; set; }

    public int ClassId { get; set; }

    public int RoomId { get; set; }

    public int TimeId { get; set; }

    public int LectureId { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual Class Class { get; set; } = null!;

    public virtual ICollection<Homework> Homeworks { get; set; } = new List<Homework>();

    public virtual Lecture Lecture { get; set; } = null!;

    public virtual Room Room { get; set; } = null!;

    public virtual Timeslot Time { get; set; } = null!;
}
