using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateSemesterRequest
{
    [Required(ErrorMessage = "Semester name is required")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Semester name must be between 3 and 100 characters")]
    [RegularExpression(@"^[A-Za-z0-9\s\-_]+$", ErrorMessage = "Semester name can only contain letters, numbers, spaces, hyphens, and underscores")]
    public string Name { get; set; } = null!;

    [Required(ErrorMessage = "Start date is required")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "End date is required")]
    public DateOnly EndDate { get; set; }

    public HolidayRequest[]? Holidays { get; set; }
}

public class UpdateSemesterRequest
{
    [Required(ErrorMessage = "Semester name is required")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Semester name must be between 3 and 100 characters")]
    [RegularExpression(@"^[A-Za-z0-9\s\-_]+$", ErrorMessage = "Semester name can only contain letters, numbers, spaces, hyphens, and underscores")]
    public string Name { get; set; } = null!;

    [Required(ErrorMessage = "Start date is required")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "End date is required")]
    public DateOnly EndDate { get; set; }
}

public class HolidayRequest
{
    [Required(ErrorMessage = "Holiday name is required")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Holiday name must be between 2 and 200 characters")]
    public string Name { get; set; } = null!;

    [Required(ErrorMessage = "Holiday date is required")]
    public DateOnly Date { get; set; }

    [Required(ErrorMessage = "Holiday type is required")]
    [StringLength(100, ErrorMessage = "Holiday type cannot exceed 100 characters")]
    public string Type { get; set; } = null!;

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string? Description { get; set; }

    public bool IsRecurring { get; set; } = false;
}
