using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateSemesterRequest
{
    [Required(ErrorMessage = "Start date is required")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "End date is required")]
    public DateOnly EndDate { get; set; }

    public HolidayRequest[]? Holidays { get; set; }

    // Helper methods to generate name and code
    private string GetSemesterSeason()
    {
        var month = StartDate.Month;
        var day = StartDate.Day;

        // Spring: 01/01 - 30/04
        if (month == 1 || month == 2 || month == 3 || (month == 4 && day <= 30))
        {
            return "spring";
        }
        // Summer: 01/05 - 31/08
        if (month == 5 || month == 6 || month == 7 || month == 8)
        {
            return "summer";
        }
        // Fall: 01/09 - 31/12
        if (month >= 9 && month <= 12)
        {
            return "fall";
        }

        return null;
    }

    public string GenerateSemesterName()
    {
        var season = GetSemesterSeason();
        var year = StartDate.Year;

        return season switch
        {
            "spring" => $"Spring {year}",
            "summer" => $"Summer {year}",
            "fall" => $"Fall {year}",
            _ => $"Semester {year}"
        };
    }

    public string GenerateSemesterCode()
    {
        var season = GetSemesterSeason();
        var year = StartDate.Year;
        var yearShort = year % 100; // Last 2 digits

        // Generate code: SP25, SU25, FA25 (2 chars season + 2 digits year)
        return season switch
        {
            "spring" => $"SP{yearShort:D2}",
            "summer" => $"SU{yearShort:D2}",
            "fall" => $"FA{yearShort:D2}",
            _ => $"SEM{yearShort:D2}"
        };
    }
}

public class UpdateSemesterRequest
{
    [Required(ErrorMessage = "Start date is required")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "End date is required")]
    public DateOnly EndDate { get; set; }

    // Helper methods to generate name and code
    private string GetSemesterSeason()
    {
        var month = StartDate.Month;
        var day = StartDate.Day;

        // Spring: 01/01 - 30/04
        if (month == 1 || month == 2 || month == 3 || (month == 4 && day <= 30))
        {
            return "spring";
        }
        // Summer: 01/05 - 31/08
        if (month == 5 || month == 6 || month == 7 || month == 8)
        {
            return "summer";
        }
        // Fall: 01/09 - 31/12
        if (month >= 9 && month <= 12)
        {
            return "fall";
        }

        return null;
    }

    public string GenerateSemesterName()
    {
        var season = GetSemesterSeason();
        var year = StartDate.Year;

        return season switch
        {
            "spring" => $"Spring {year}",
            "summer" => $"Summer {year}",
            "fall" => $"Fall {year}",
            _ => $"Semester {year}"
        };
    }

    public string GenerateSemesterCode()
    {
        var season = GetSemesterSeason();
        var year = StartDate.Year;
        var yearShort = year % 100;

        // Generate code: SP25, SU25, FA25 (2 chars season + 2 digits year)
        return season switch
        {
            "spring" => $"SP{yearShort:D2}",
            "summer" => $"SU{yearShort:D2}",
            "fall" => $"FA{yearShort:D2}",
            _ => $"SEM{yearShort:D2}"
        };
    }
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
