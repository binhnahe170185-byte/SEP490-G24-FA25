namespace FJAP.vn.fpt.edu.models;

public class LessonDto
{
    public int LessonId { get; set; }
    public int ClassId { get; set; }
    public string ClassName { get; set; } = "";

    public DateOnly Date { get; set; }

    public string RoomName { get; set; } = "";

    public int TimeId { get; set; }
    public int LectureId { get; set; }
    public string LectureCode { get; set; } = "";
    public string? Attendance { get; set; }

    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public string SubjectCode { get; set; } = "";
}


public class UpdateLessonRequest
{
    public string Date { get; set; } = null!; // Format: YYYY-MM-DD
    public int TimeId { get; set; }
    public int RoomId { get; set; }
    public int LecturerId { get; set; }
}

