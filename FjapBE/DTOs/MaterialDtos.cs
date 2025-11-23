using System.ComponentModel.DataAnnotations;
namespace FJAP.DTOs;

public class CreateMaterialRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = null!;

    [Required]
    public string FileUrl { get; set; } = null!;

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "SubjectId must be greater than 0")]
    public int SubjectId { get; set; }

    public string? Description { get; set; }
    public string? Status { get; set; }
}

public class UpdateMaterialRequest
{
    [Required]
    public int MaterialId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = null!;

    [Required]
    public string FileUrl { get; set; } = null!;

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "SubjectId must be greater than 0")]
    public int SubjectId { get; set; }

    public string? Description { get; set; }
    public string? Status { get; set; }
}


public class MaterialResponseDto
{
    public int MaterialId { get; set; }
    public string Title { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Status { get; set; } = null!;
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    public int SubjectId { get; set; }
    public object? Subject { get; set; }
    public object? Creator { get; set; }
}

