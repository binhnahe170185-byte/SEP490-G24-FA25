using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models
{
    // DTO để hiển thị danh sách điểm (Grade List)
    public class GradeListDto
    {
        public int GradeId { get; set; }
        public int StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public decimal? FinalScore { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
        public string? LevelName { get; set; }
        public string? SemesterName { get; set; }
    }

    // DTO để hiển thị chi tiết điểm của 1 sinh viên trong 1 môn
    public class GradeDetailDto
    {
        public int GradeId { get; set; }
        public int StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public decimal? PassMark { get; set; }
        public decimal? FinalScore { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Danh sách các loại điểm thành phần
        public List<GradeComponentDto> GradeComponents { get; set; } = new();
    }

    // DTO cho từng thành phần điểm
    public class GradeComponentDto
    {
        public int GradeTypeId { get; set; }
        public int SubjectGradeTypeId { get; set; }
        public string GradeTypeName { get; set; } = string.Empty;
        public decimal Weight { get; set; }
        public decimal MaxScore { get; set; }
        public decimal? Score { get; set; }
        public string? Comment { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? GradedBy { get; set; }
        public string? GradedByName { get; set; }
        public DateTime? GradedAt { get; set; }
    }

    // Request DTO để lọc danh sách điểm
    public class GradeFilterRequest
    {
        public int? SubjectId { get; set; }
        public int? LevelId { get; set; }
        public int? SemesterId { get; set; }
        public string? Status { get; set; }
        public string? SearchTerm { get; set; } // Tìm theo tên/mã sinh viên
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    // Response DTO có phân trang
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;
    }

    // DTO cho dropdown options trong form filter
    public class GradeFilterOptions
    {
        public List<LookupItem> Subjects { get; set; } = new();
        public List<LookupItem> Levels { get; set; } = new();
        public List<LookupItem> Semesters { get; set; } = new();
        public List<string> Statuses { get; set; } = new() { "In Progress", "Completed", "Failed" };
    }

    // DTO để cập nhật trạng thái grade
    public class UpdateGradeStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    // DTO cho thống kê tổng quan
    public class GradeStatisticsDto
    {
        public int TotalGrades { get; set; }
        public int InProgressCount { get; set; }
        public int CompletedCount { get; set; }
        public int FailedCount { get; set; }
        public decimal AverageScore { get; set; }
    }

    // DTO để cập nhật điểm thành phần
    public class UpdateGradeComponentsRequest
    {
        public int GradeId { get; set; }
        public List<GradeComponentUpdateDto> GradeComponents { get; set; } = new();
    }

    // DTO cho từng thành phần điểm cần update
    public class GradeComponentUpdateDto
    {
        public int SubjectGradeTypeId { get; set; }
        public decimal? Score { get; set; }
        public string? Comment { get; set; }
    }
}