namespace FJAP.vn.fpt.edu.models;

public class LecturerDto
{
    public int LecturerId { get; set; }
    public string LecturerCode { get; set; } = string.Empty;
}

public class LecturerClassDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string? ClassCode { get; set; }
    public int SemesterId { get; set; }
    public string? SemesterName { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<LecturerClassSubjectDto> Subjects { get; set; } = new();
}

public class LecturerClassSubjectDto
{
    public int SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
}

