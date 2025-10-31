using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateNewsRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(255, ErrorMessage = "Title must not exceed 255 characters")]
    public string Title { get; set; } = null!;

    public string? Content { get; set; }

    [StringLength(512, ErrorMessage = "News image URL must not exceed 512 characters")]
    public string? NewsImage { get; set; }
}

public class UpdateNewsRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(255, ErrorMessage = "Title must not exceed 255 characters")]
    public string Title { get; set; } = null!;

    public string? Content { get; set; }

    [StringLength(512, ErrorMessage = "News image URL must not exceed 512 characters")]
    public string? NewsImage { get; set; }
}

public class NewsDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? Content { get; set; }
    public string? NewsImage { get; set; }
    public string Status { get; set; } = null!;
    public string? ReviewComment { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public object? CreatedByNavigation { get; set; }
    public object? ApprovedByNavigation { get; set; }
    public object? UpdatedByNavigation { get; set; }
}

public class NewsListDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? Content { get; set; }
    public string? NewsImage { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatorName { get; set; }
    public string? CreatorEmail { get; set; }
}

public class RejectNewsRequest
{
    [Required(ErrorMessage = "Review comment is required when rejecting")]
    [StringLength(1000, ErrorMessage = "Review comment must not exceed 1000 characters")]
    public string ReviewComment { get; set; } = null!;
}

