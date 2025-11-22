 using System.Collections.Generic;
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
    public int? TotalLesson { get; set; } // Optional: limit number of lessons to create
}
 
public class StudentScheduleCache
{
    public IReadOnlyList<int> StudentIds { get; set; } = new List<int>();
    public Dictionary<int, HashSet<string>> StudentTimeMap { get; set; } = new();
}

 public class AvailabilityCheckRequest
 {
         public DateOnly Date { get; set; }
     public int TimeId { get; set; }
     public int? ClassId { get; set; }
     public int? RoomId { get; set; }
     public int? LecturerId { get; set; }
     public List<int>? StudentIds { get; set; }
 }
 
 public class AvailabilityCheckResponse
 {
         public bool IsClassBusy { get; set; }
     public bool IsRoomBusy { get; set; }
     public bool IsLecturerBusy { get; set; }
     public List<int> ConflictedStudentIds { get; set; } = new();
     public List<int> ConflictedClassIds { get; set; } = new();
     public string SnapshotSource { get; set; } = "slot_view";
 }
 
