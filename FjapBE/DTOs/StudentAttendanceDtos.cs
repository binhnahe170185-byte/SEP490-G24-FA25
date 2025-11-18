namespace FJAP.DTOs;

public class StudentAttendanceSubjectDto
{
    public int SubjectId { get; set; }
    public string SubjectCode { get; set; } = "";
    public string SubjectName { get; set; } = "";
    public string ClassName { get; set; } = "";
    public int ClassId { get; set; }
}

public class StudentAttendanceLessonDto
{
    public int LessonId { get; set; }
    public string Date { get; set; } = ""; // yyyy-MM-dd
    public int TimeId { get; set; }
    public string RoomName { get; set; } = "";
    public string Status { get; set; } = "Absent";
    public string LectureCode { get; set; } = "";
}


