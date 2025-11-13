using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

/// <summary>
/// Request to import students from Excel
/// </summary>
public class ImportStudentRequest
{
    [Required]
    public int EnrollmentSemesterId { get; set; }
    
    [Required]
    public int LevelId { get; set; }
    
    [Required]
    public List<ImportStudentRow> Students { get; set; } = new();
}

/// <summary>
/// Single student row from Excel
/// </summary>
public class ImportStudentRow
{
    [Required]
    public string FirstName { get; set; } = null!;
    
    [Required]
    public string LastName { get; set; } = null!;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
    
    [Required]
    public string Gender { get; set; } = null!; // Male | Female | Other
    
    [Required]
    public DateOnly Dob { get; set; }
    
    public string? Address { get; set; }
    
    public string? PhoneNumber { get; set; }
    
    /// <summary>
    /// Avatar URL from Google Form response (will be downloaded and processed to base64)
    /// </summary>
    public string? AvatarUrl { get; set; }
    
    // Auto-generated fields (will be set by backend)
    public string? StudentCode { get; set; }
    
    public int? TargetSemesterId { get; set; }
}

/// <summary>
/// Response for preview request
/// </summary>
public class ImportStudentPreviewResponse
{
    public List<ImportStudentPreviewRow> Students { get; set; } = new();
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
}

/// <summary>
/// Preview row with validation
/// </summary>
public class ImportStudentPreviewRow
{
    public int RowNumber { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Gender { get; set; } = null!;
    public DateOnly Dob { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    
    /// <summary>
    /// Avatar URL from Google Form response
    /// </summary>
    public string? AvatarUrl { get; set; }
    
    // Auto-generated
    public string? StudentCode { get; set; }
    public int? TargetSemesterId { get; set; }
    public string? TargetSemesterName { get; set; }
    
    // Validation
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Response for import request
/// </summary>
public class ImportStudentResponse
{
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<ImportStudentResultRow> Results { get; set; } = new();
}

/// <summary>
/// Result for each imported row
/// </summary>
public class ImportStudentResultRow
{
    public int RowNumber { get; set; }
    public string Email { get; set; } = null!;
    public bool Success { get; set; }
    public string? StudentCode { get; set; }
    public int? StudentId { get; set; }
    public string? ErrorMessage { get; set; }
}

