using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidayController : ControllerBase
{
    private readonly IHolidayService _holidayService;
    private readonly FjapDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public HolidayController(IHolidayService holidayService, FjapDbContext dbContext, IHttpClientFactory httpClientFactory)
    {
        _holidayService = holidayService;
        _db = dbContext;
        _httpClientFactory = httpClientFactory;
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

            // Note: Type filter removed as Type column doesn't exist in database
            // if (!string.IsNullOrWhiteSpace(type))
            // {
            //     baseQuery = baseQuery.Where(x => x.Type == type);
            // }

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
                description = x.Description,
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
                    description = h.Description,
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

    // ===================== Get Japan Holidays from External API =====================
    [HttpGet("japan/{year:int}")]
    public async Task<IActionResult> GetJapanHolidays(int year)
    {
        try
        {
            if (year < 2000 || year > 2100)
            {
                return BadRequest(new { error = "Year must be between 2000 and 2100" });
            }

            var httpClient = _httpClientFactory.CreateClient();
            var apiUrl = $"https://date.nager.at/api/v3/PublicHolidays/{year}/JP";
            
            var response = await httpClient.GetAsync(apiUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Failed to fetch holidays from external API" });
            }

            var jsonString = await response.Content.ReadAsStringAsync();
            
            // Parse the JSON response from Nager.Date API
            var holidays = JsonSerializer.Deserialize<List<JapanHolidayResponse>>(jsonString, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (holidays == null || !holidays.Any())
            {
                return Ok(new { year, holidays = new List<object>() });
            }

            // Transform to our format
            var result = holidays.Select(h => new
            {
                name = h.Name,
                date = h.Date,
                type = "National", // Japan public holidays are national holidays
                description = $"{h.LocalName} ({h.Name})",
                isRecurring = true
            }).ToList();

            return Ok(new { year, holidays = result });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetJapanHolidays: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { error = "Failed to fetch Japan holidays", message = ex.Message });
        }
    }

    // Helper class for deserializing Nager.Date API response
    private class JapanHolidayResponse
    {
        public string Date { get; set; } = string.Empty;
        public string LocalName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string CountryCode { get; set; } = string.Empty;
        public bool Fixed { get; set; }
        public bool Global { get; set; }
        public string? Counties { get; set; }
        public int? LaunchYear { get; set; }
        public string[]? Types { get; set; }
    }
}
