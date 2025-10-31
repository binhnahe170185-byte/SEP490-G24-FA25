using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SemesterController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly IHolidayService _holidayService;
    private readonly FjapDbContext _db;

    public SemesterController(ISemesterService semesterService, IHolidayService holidayService, FjapDbContext dbContext)
    {
        _semesterService = semesterService;
        _holidayService = holidayService;
        _db = dbContext;
    }

    // ===================== Semesters (list) =====================
    [HttpGet]
    public async Task<IActionResult> GetSemesters(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        try
        {
            var baseQuery = _db.Semesters.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                baseQuery = baseQuery.Where(x => x.Name.Contains(term));
            }

            // Count total first
            var total = await baseQuery.CountAsync();

            // Get items with pagination
            var semesters = await baseQuery
                .OrderByDescending(x => x.StartDate)
                .ThenByDescending(x => x.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Transform to response format
            var items = semesters.Select(x => new
            {
                semesterId = x.SemesterId,
                name = x.Name,
                semesterCode = x.SemesterCode,
                startDate = x.StartDate.ToString("yyyy-MM-dd"),
                endDate = x.EndDate.ToString("yyyy-MM-dd"),
                duration = (x.EndDate.DayNumber - x.StartDate.DayNumber),
                classCount = x.Classes?.Count ?? 0,
                studentCount = x.Students?.Count ?? 0
            }).ToList();

            return Ok(new
            {
                total,
                items
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetSemesters: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Semester (detail CRUD) =====================
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _semesterService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSemesterRequest request)
    {
        try
        {
            Console.WriteLine("=== SemesterController.Create called ===");
            Console.WriteLine($"Request received - StartDate: {request.StartDate}, EndDate: {request.EndDate}");
            Console.WriteLine($"StartDate default: {request.StartDate == default(DateOnly)}");
            Console.WriteLine($"EndDate default: {request.EndDate == default(DateOnly)}");
            Console.WriteLine($"Holidays count: {request.Holidays?.Length ?? 0}");
            
            if (request.Holidays != null && request.Holidays.Length > 0)
            {
                Console.WriteLine("Holidays details:");
                foreach (var h in request.Holidays)
                {
                    Console.WriteLine($"  - Name: {h.Name}, Date: {h.Date}, Description: {h.Description}");
                }
            }
            
            // Model validation is handled by Data Annotations
            if (!ModelState.IsValid)
            {
                Console.WriteLine("ModelState is invalid:");
                foreach (var error in ModelState)
                {
                    Console.WriteLine($"  {error.Key}: {string.Join(", ", error.Value.Errors.Select(e => e.ErrorMessage))}");
                    if (error.Value.Errors.Any())
                    {
                        foreach (var err in error.Value.Errors)
                        {
                            Console.WriteLine($"    - {err.ErrorMessage}");
                            if (!string.IsNullOrEmpty(err.Exception?.Message))
                            {
                                Console.WriteLine($"    - Exception: {err.Exception.Message}");
                            }
                        }
                    }
                }
                return BadRequest(new { 
                    code = 400, 
                    message = "Validation failed",
                    errors = ModelState.ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                    )
                });
            }
            
            Console.WriteLine("ModelState is valid, proceeding with creation...");

            // Check for overlapping semesters
            var overlappingSemesters = await _db.Semesters
                .Where(s =>
                    (request.StartDate >= s.StartDate && request.StartDate <= s.EndDate) ||
                    (request.EndDate >= s.StartDate && request.EndDate <= s.EndDate) ||
                    (request.StartDate <= s.StartDate && request.EndDate >= s.EndDate))
                .Select(s => new
                {
                    s.SemesterId,
                    s.Name,
                    s.SemesterCode,
                    s.StartDate,
                    s.EndDate
                })
                .ToListAsync();

            if (overlappingSemesters.Any())
            {
                var conflictList = string.Join(", ", overlappingSemesters.Select(s => 
                    $"{s.Name} ({s.SemesterCode}) [{s.StartDate:yyyy-MM-dd} to {s.EndDate:yyyy-MM-dd}]"));
                
                Console.WriteLine($"Overlapping semester found: {conflictList}");
                
                return BadRequest(new { 
                    code = 400, 
                    message = "Semester dates overlap with existing semester(s)",
                    details = $"Your semester dates conflict with: {conflictList}. Please choose different dates.",
                    overlappingSemesters = overlappingSemesters
                });
            }

            var created = await _semesterService.CreateAsync(request);
            Console.WriteLine($"Semester created with ID: {created.SemesterId}");
            
            // Create holidays if provided
            if (request.Holidays != null && request.Holidays.Any())
            {
                Console.WriteLine($"Creating {request.Holidays.Length} holidays...");
                var holidayRequests = request.Holidays.Select(h => new CreateHolidayRequest
                {
                    Name = h.Name,
                    Date = h.Date,
                    Description = h.Description,
                    SemesterId = created.SemesterId
                }).ToArray();

                await _holidayService.CreateBulkAsync(holidayRequests);
                Console.WriteLine("Holidays created successfully");
            }

            Console.WriteLine("=== SemesterController.Create completed successfully ===");
            return CreatedAtAction(nameof(GetById), new { id = created.SemesterId }, 
                new { code = 201, data = created });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== SemesterController.Create ERROR ===");
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Error Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
                if (ex.InnerException.InnerException != null)
                {
                    Console.WriteLine($"Inner-Inner exception: {ex.InnerException.InnerException.Message}");
                }
            }
            
            // Return detailed error for debugging
            var errorResponse = new
            {
                code = 400,
                message = ex.Message,
                errorType = ex.GetType().Name,
                innerException = ex.InnerException != null ? new
                {
                    type = ex.InnerException.GetType().Name,
                    message = ex.InnerException.Message
                } : null
            };
            
            return BadRequest(errorResponse);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateSemesterRequest request)
    {
        try
        {
            // Validate date range
            if (request.StartDate >= request.EndDate)
            {
                return BadRequest("Start date must be before end date");
            }

            // Check for overlapping semesters (excluding current semester)
            var hasOverlap = await _db.Semesters.AnyAsync(s =>
                s.SemesterId != id &&
                ((request.StartDate >= s.StartDate && request.StartDate <= s.EndDate) ||
                 (request.EndDate >= s.StartDate && request.EndDate <= s.EndDate) ||
                 (request.StartDate <= s.StartDate && request.EndDate >= s.EndDate)));

            if (hasOverlap)
            {
                return BadRequest("Semester dates overlap with existing semester");
            }

            var ok = await _semesterService.UpdateAsync(id, request);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            // Check if semester has classes or students
            var hasClasses = await _db.Classes.AnyAsync(c => c.SemesterId == id);
            var hasStudents = await _db.Students.AnyAsync(s => s.SemesterId == id);

            if (hasClasses || hasStudents)
            {
                return BadRequest("Cannot delete semester that has classes or students");
            }

            var ok = await _semesterService.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ===================== Helper: Get active semesters =====================
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveSemesters()
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            
            var activeSemesters = await _db.Semesters
                .AsNoTracking()
                .Where(s => s.StartDate <= today && s.EndDate >= today)
                .OrderByDescending(x => x.StartDate)
                .Select(x => new { semesterId = x.SemesterId, name = x.Name })
                .ToListAsync();

            return Ok(activeSemesters);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetActiveSemesters: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Helper: Get upcoming semesters =====================
    [HttpGet("upcoming")]
    public async Task<IActionResult> GetUpcomingSemesters()
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            
            var upcomingSemesters = await _db.Semesters
                .AsNoTracking()
                .Where(s => s.StartDate > today)
                .OrderBy(x => x.StartDate)
                .Select(x => new { semesterId = x.SemesterId, name = x.Name })
                .ToListAsync();

            return Ok(upcomingSemesters);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetUpcomingSemesters: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Test endpoint =====================
    [HttpGet("test")]
    public async Task<IActionResult> TestSemesters()
    {
        try
        {
            var count = await _db.Semesters.CountAsync();
            var allSemesters = await _db.Semesters
                .AsNoTracking()
                .Select(x => new { 
                    semesterId = x.SemesterId, 
                    name = x.Name,
                    startDate = x.StartDate.ToString("yyyy-MM-dd"),
                    endDate = x.EndDate.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            return Ok(new { 
                message = "Test successful", 
                count, 
                semesters = allSemesters 
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in TestSemesters: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Seed data endpoint =====================
    [HttpPost("seed")]
    public async Task<IActionResult> SeedSemesters()
    {
        try
        {
            // Check if data already exists
            var existingCount = await _db.Semesters.CountAsync();
            if (existingCount > 0)
            {
                return Ok(new { message = "Data already exists", count = existingCount });
            }

            // Create sample semesters
            var semesters = new List<Semester>
            {
                new Semester
                {
                    Name = "Học kỳ 1 năm học 2024-2025",
                    StartDate = new DateOnly(2024, 9, 1),
                    EndDate = new DateOnly(2024, 12, 31)
                },
                new Semester
                {
                    Name = "Học kỳ 2 năm học 2024-2025",
                    StartDate = new DateOnly(2025, 1, 1),
                    EndDate = new DateOnly(2025, 4, 30)
                },
                new Semester
                {
                    Name = "Học kỳ hè năm học 2024-2025",
                    StartDate = new DateOnly(2025, 5, 1),
                    EndDate = new DateOnly(2025, 8, 31)
                }
            };

            await _db.Semesters.AddRangeAsync(semesters);
            await _db.SaveChangesAsync();

            return Ok(new { 
                message = "Sample data created successfully", 
                count = semesters.Count 
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in SeedSemesters: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

