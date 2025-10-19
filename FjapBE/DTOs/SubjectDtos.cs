using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models
{
    // DTO cho một thành phần điểm
    public class GradeTypeDto
    {
        // Thêm thuộc tính này để logic update hoạt động
        public int SubjectGradeTypeId { get; set; }
        public string GradeTypeName { get; set; } = string.Empty;
        public decimal Weight { get; set; }
    }

    // DTO để hiển thị thông tin Subject chi tiết
    public class SubjectDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int LevelId { get; set; }
        public string? LevelName { get; set; }

        public List<GradeTypeDto> GradeTypes { get; set; } = new();
    }

    // DTO để tạo mới Subject (đã xóa bản bị trùng)
    public class CreateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; } = 5.0m;
        public int LevelId { get; set; }
        public List<GradeTypeDto> GradeTypes { get; set; } = new();
    }

    // DTO để cập nhật Subject
    public class UpdateSubjectRequest
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? PassMark { get; set; }
        public int LevelId { get; set; }
        public List<GradeTypeDto> GradeTypes { get; set; } = new();
    }

    // Các DTO còn lại giữ nguyên
    public class LookupItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class SubjectFormOptions
    {
        public List<LookupItem> Levels { get; set; } = new();
    }
}