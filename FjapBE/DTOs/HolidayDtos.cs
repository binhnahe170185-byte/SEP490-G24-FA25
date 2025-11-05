namespace FJAP.DTOs;

public class CreateHolidayRequest
{
    public string Name { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public int? SemesterId { get; set; }
}

public class UpdateHolidayRequest
{
    public string Name { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public int? SemesterId { get; set; }
}

public class HolidayDto
{
    public int HolidayId { get; set; }
    public string Name { get; set; } = null!;
    public string Date { get; set; } = null!; // Formatted as YYYY-MM-DD
    public string Type { get; set; } = null!;
    public string? Description { get; set; }
    public int? SemesterId { get; set; }
    public string? SemesterName { get; set; }
}
