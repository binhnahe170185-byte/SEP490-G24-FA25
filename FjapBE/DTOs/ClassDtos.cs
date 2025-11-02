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
}

