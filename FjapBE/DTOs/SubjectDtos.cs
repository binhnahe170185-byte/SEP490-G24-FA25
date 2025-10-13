using System;
using System.Collections.Generic;

namespace FJAP.Models
{
    // DTO để hiển thị thông tin Subject với navigation properties
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int SemesterId { get; set; }
        public int LevelId { get; set; }
        public int ClassId { get; set; }

        // Navigation properties names
        public string? SemesterName { get; set; }
        public string? LevelName { get; set; }
        public string? ClassName { get; set; }
    }

    // DTO để tạo mới Subject
    public class CreateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; } = 5.0m;
        public int SemesterId { get; set; } = 1;
        public int LevelId { get; set; } = 1;
        public int ClassId { get; set; } = 1;
    }

    // DTO để cập nhật Subject
    public class UpdateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        public int SemesterId { get; set; } = 1;
        public int LevelId { get; set; } = 1;
        public int ClassId { get; set; } = 1;
    }

    // DTO cho dropdown/select options
    public class LookupItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    // DTO cho form options (Semesters, Levels, Classes)
    public class SubjectFormOptions
    {
        public List<LookupItem> Semesters { get; set; } = new();
        public List<LookupItem> Levels { get; set; } = new();
        public List<LookupItem> Classes { get; set; } = new();
    }
}