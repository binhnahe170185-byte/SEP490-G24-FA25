namespace FJAP.vn.fpt.edu.models;

public class LecturerDto
{
    public int LecturerId { get; set; }
    public string LecturerCode { get; set; } = string.Empty;
    public string? Email { get; set; }
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

public class LecturerDetailDto
{
    public int LecturerId { get; set; }
    public string LecturerCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string Email { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public DateOnly Dob { get; set; }
    public string? DepartmentName { get; set; }
}

