using System;
using System.Collections.Generic;

namespace FJAP.Models
{
    public partial class Subject
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = null!;
        public string SubjectName { get; set; } = null!;
        public bool Status { get; set; }
        public string? Description { get; set; }
        public decimal PassMark { get; set; }
        public DateTime CreatedAt { get; set; }
        public int SemesterId { get; set; }
        public int LevelId { get; set; }
        public int ClassId { get; set; }

        // Navigation properties
        public virtual Semester Semester { get; set; } = null!;
        public virtual Level Level { get; set; } = null!;
        public virtual Class Class { get; set; } = null!;
        public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    }

    // DTOs
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public bool Status { get; set; }
        public string? Description { get; set; }
        public decimal PassMark { get; set; }
        public DateTime CreatedAt { get; set; }
        public int SemesterId { get; set; }
        public int LevelId { get; set; }
        public int ClassId { get; set; }
        public string? SemesterName { get; set; }
        public string? LevelName { get; set; }
        public string? ClassName { get; set; }
    }

    public class CreateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal PassMark { get; set; }
        public int SemesterId { get; set; } = 1;
        public int LevelId { get; set; } = 1;
        public int ClassId { get; set; }
    }

    public class UpdateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal PassMark { get; set; }
        public int SemesterId { get; set; } = 1; // Giá trị mặc định
        public int LevelId { get; set; } = 1;    // Giá trị mặc định
        public int ClassId { get; set; }
    }

    public class LookupItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class SubjectFormOptions
    {
        public List<LookupItem> Semesters { get; set; } = new();
        public List<LookupItem> Levels { get; set; } = new();
        public List<LookupItem> Classes { get; set; } = new();
    }
}