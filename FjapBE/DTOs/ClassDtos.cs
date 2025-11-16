namespace FJAP.vn.fpt.edu.models;

public class ClassScheduleDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = "";
    public DateOnly Date { get; set; }
    public string RoomName { get; set; } = "";
    public int TimeId { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string SubjectCode { get; set; } = "";
    public string LecturerCode { get; set; } = "";
}

public class SchedulePatternDto
{
    public int Weekday { get; set; } // 2=Mon ... 7=Sat, 8=Sun
    public int TimeId { get; set; } // Slot ID
    public int RoomId { get; set; } // Room ID
}

public class CreateScheduleRequest
{
    public int SemesterId { get; set; }
    public int ClassId { get; set; }
    public int LecturerId { get; set; }
    public List<SchedulePatternDto> Patterns { get; set; } = new();
}

