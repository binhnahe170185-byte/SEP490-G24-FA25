using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidayController : ControllerBase
{
    private readonly IHolidayService _holidayService;
    private readonly FjapDbContext _db;

    public HolidayController(IHolidayService holidayService, FjapDbContext dbContext)
    {
        _holidayService = holidayService;
        _db = dbContext;
    }

    // ===================== Holidays (list) =====================
    [HttpGet]
    public async Task<IActionResult> GetHolidays(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] int? semesterId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        try
        {
            var baseQuery = _db.Holidays.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                baseQuery = baseQuery.Where(x => x.Name.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                baseQuery = baseQuery.Where(x => x.Type == type);
            }

            if (semesterId.HasValue)
            {
                baseQuery = baseQuery.Where(x => x.SemesterId == semesterId);
            }

            // Count total first
            var total = await baseQuery.CountAsync();

            // Get items with pagination
            var holidays = await baseQuery
                .OrderByDescending(x => x.Date)
                .ThenBy(x => x.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Transform to response format
            var items = holidays.Select(x => new
            {
                holidayId = x.HolidayId,
                name = x.Name,
                date = x.Date.ToString("yyyy-MM-dd"),
                type = x.Type,
                description = x.Description,
                isRecurring = x.IsRecurring,
                semesterId = x.SemesterId,
            }).ToList();

            return Ok(new
            {
                total,
                items
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetHolidays: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Holiday (detail CRUD) =====================
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var item = await _holidayService.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(new { code = 200, data = item });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetById: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateHolidayRequest request)
    {
        try
        {
            var created = await _holidayService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = created.HolidayId }, 
                new { code = 201, data = created });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in Create: {ex.Message}");
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateHolidayRequest request)
    {
        try
        {
            var ok = await _holidayService.UpdateAsync(id, request);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in Update: {ex.Message}");
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var ok = await _holidayService.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in Delete: {ex.Message}");
            return BadRequest(ex.Message);
        }
    }

    // ===================== Helper: Get holidays by semester =====================
    [HttpGet("semester/{semesterId:int}")]
    public async Task<IActionResult> GetHolidaysBySemester(int semesterId)
    {
        try
        {
            var holidays = await _db.Holidays
                .AsNoTracking()
                .Where(h => h.SemesterId == semesterId)
                .OrderBy(h => h.Date)
                .Select(h => new
                {
                    holidayId = h.HolidayId,
                    name = h.Name,
                    date = h.Date.ToString("yyyy-MM-dd"),
                    type = h.Type,
                    description = h.Description,
                    isRecurring = h.IsRecurring,
                })
                .ToListAsync();

            return Ok(holidays);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetHolidaysBySemester: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Helper: Get holiday types =====================
    [HttpGet("types")]
    public IActionResult GetHolidayTypes()
    {
        var types = new[]
        {
            new { value = "National", label = "National Holiday" },
            new { value = "Religious", label = "Religious Holiday" },
            new { value = "Cultural", label = "Cultural Holiday" },
            new { value = "Academic", label = "Academic Holiday" },
            new { value = "Custom", label = "Custom Holiday" }
        };

        return Ok(types);
    }

    // ===================== Bulk operations =====================
    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulkHolidays([FromBody] CreateHolidayRequest[] requests)
    {
        try
        {
            var created = await _holidayService.CreateBulkAsync(requests);
            return Ok(new { code = 201, data = created, count = created.Count() });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in CreateBulkHolidays: {ex.Message}");
            return BadRequest(ex.Message);
        }
    }
}
