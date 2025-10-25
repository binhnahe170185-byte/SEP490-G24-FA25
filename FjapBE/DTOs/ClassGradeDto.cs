using System;

namespace FJAP.vn.fpt.edu.models
{
    /// <summary>
    /// DTO cho danh sách lớp học với thông tin điểm để quản lý
    /// </summary>
    public class ClassGradeDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        
        // Semester Info
        public int SemesterId { get; set; }
        public string SemesterName { get; set; } = string.Empty;
        public DateTime? SemesterStartDate { get; set; }
        public DateTime? SemesterEndDate { get; set; }
        
        // Subject Info
        public int? SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        
        // Level Info
        public int LevelId { get; set; }
        public string LevelName { get; set; } = string.Empty;
        
        // Class Status
        public string Status { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
        
        // Student & Grade Statistics
        public int TotalStudents { get; set; }
        public int StudentsWithGrades { get; set; }
        public int PassedCount { get; set; }
        public int FailedCount { get; set; }
        public int IncompleteCount { get; set; }
        public decimal AverageScore { get; set; }
        
        // Progress Info
        public int GradingProgress { get; set; }
        public int GradingTotal { get; set; }
        public int GradingPercent { get; set; }
        public int CompletionPercent { get; set; }
        public string CompletionStatus { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request filter cho danh sách lớp với điểm
    /// </summary>
    public class ClassGradeFilterRequest
    {
        public int? SemesterId { get; set; }
        public int? LevelId { get; set; }
        public string? Status { get; set; } // "Active", "Inactive"
        public string? CompletionStatus { get; set; } // "100% Complete", "In Progress", "Not Started"
        public string? SearchTerm { get; set; }
    }

    /// <summary>
    /// DTO cho chi tiết lớp với danh sách sinh viên và điểm
    /// </summary>
    public class ClassGradeDetailDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SemesterName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public List<StudentGradeDto> Students { get; set; } = new();
        
        // Grade component weights for this subject
        public List<GradeComponentWeightDto> GradeComponentWeights { get; set; } = new();
    }

    /// <summary>
    /// DTO cho thông tin sinh viên với điểm trong 1 lớp
    /// </summary>
    public class StudentGradeDto
    {
        public int StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        
        // Grade Components - Legacy fields for backward compatibility
        public decimal? Participation { get; set; }
        public decimal? Assignment { get; set; }
        public decimal? ProgressTest1 { get; set; }
        public decimal? ProgressTest2 { get; set; }
        public decimal? FinalExam { get; set; }
        
        // Dynamic grade components - new approach
        public List<GradeComponentScoreDto> GradeComponentScores { get; set; } = new();
        
        // Final Grade
        public decimal? Average { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? GradeId { get; set; }
    }

    /// <summary>
    /// DTO cho thông tin weight của các thành phần điểm
    /// </summary>
    public class GradeComponentWeightDto
    {
        public int SubjectGradeTypeId { get; set; }
        public string GradeTypeName { get; set; } = string.Empty;
        public decimal Weight { get; set; }
        public decimal MaxScore { get; set; }
    }

    /// <summary>
    /// DTO cho điểm của từng thành phần điểm
    /// </summary>
    public class GradeComponentScoreDto
    {
        public int SubjectGradeTypeId { get; set; }
        public string GradeTypeName { get; set; } = string.Empty;
        public decimal? Score { get; set; }
        public string? Comment { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}