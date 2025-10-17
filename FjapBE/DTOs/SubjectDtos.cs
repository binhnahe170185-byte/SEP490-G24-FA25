// File: FJAP.vn.fpt.edu.models/SubjectDtos.cs (Tên file có thể khác)

using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models
{
    // DTO để hiển thị thông tin Subject
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        public DateTime? CreatedAt { get; set; }
        
        // Chỉ còn lại LevelId và LevelName
        public int LevelId { get; set; }
        public string? LevelName { get; set; }
    }

    // DTO để tạo mới Subject
    public class CreateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; } = 5.0m;
        
        // Chỉ cần LevelId để tạo mới
        public int LevelId { get; set; }
    }

    // DTO để cập nhật Subject
    public class UpdateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        
        // Chỉ cần LevelId để cập nhật
        public int LevelId { get; set; }
    }

    // DTO cho dropdown/select options
    public class LookupItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    // DTO cho form options (bây giờ chỉ cần Levels)
    public class SubjectFormOptions
    {
        public List<LookupItem> Levels { get; set; } = new();
    }
}