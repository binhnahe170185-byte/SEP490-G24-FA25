namespace FJAP.DTOs;

public class AttendanceClassDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
}

public class AttendanceLessonDto
{
    public int LessonId { get; set; }
    public int ClassId { get; set; }
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd
    public string RoomName { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty; // HH:mm-HH:mm
    public string SubjectName { get; set; } = string.Empty;
}

public class AttendanceStudentDto
{
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string Status { get; set; } = "Absent";
    public int AttendanceId { get; set; }
    public DateTime? TimeAttendance { get; set; }
}

public class AttendanceLessonStudentsResponseDto
{
    public int LessonId { get; set; }
    public int ClassId { get; set; }
    public string Date { get; set; } = string.Empty;
    public string? RoomName { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public List<AttendanceStudentDto> Students { get; set; } = new();
}

public class AttendanceReportItemDto
{
    public AttendanceStudentInfoDto Student { get; set; } = new();
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
}

public class AttendanceStudentInfoDto
{
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public AttendanceUserInfoDto User { get; set; } = new();
}

public class AttendanceUserInfoDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
}

public class UpdateAttendanceRequestDto
{
    public int LessonId { get; set; }
    public int StudentId { get; set; }
    public string Status { get; set; } = "Present";
}

public class BulkUpdateAttendanceRequestDto
{
    public int LessonId { get; set; }
    public List<AttendanceUpdateItemDto> Attendances { get; set; } = new();
}

public class AttendanceUpdateItemDto
{
    public int StudentId { get; set; }
    public string Status { get; set; } = "Present";
}

