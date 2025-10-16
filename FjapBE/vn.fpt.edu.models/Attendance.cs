using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Attendance
{
    public int AttendanceId { get; set; }

    public string? Status { get; set; }

    public DateTime? TimeAttendance { get; set; }

    public int LessonId { get; set; }

    public int StudentId { get; set; }

    public virtual Lesson Lesson { get; set; } = null!;

    public virtual Student Student { get; set; } = null!;
}
