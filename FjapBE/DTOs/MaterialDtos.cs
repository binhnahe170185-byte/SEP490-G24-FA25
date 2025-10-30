using System.ComponentModel.DataAnnotations;
namespace FJAP.DTOs;

public class CreateMaterialRequest
{
    [Required]
    public string Title { get; set; } = null!;

    [Required]
    public string FileUrl { get; set; } = null!;

    [Required]
    public int SubjectId { get; set; }

    public string? Description { get; set; }
    public string? Status { get; set; }
}

public class UpdateMaterialRequest
{
    [Required]
    public int MaterialId { get; set; }

    [Required]
    public string Title { get; set; } = null!;

    [Required]
    public string FileUrl { get; set; } = null!;

    [Required]
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

