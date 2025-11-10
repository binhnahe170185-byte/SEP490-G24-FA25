using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TimeslotController : ControllerBase
{
    private readonly FjapDbContext _db;

    public TimeslotController(FjapDbContext dbContext)
    {
        _db = dbContext;
    }

    // ===================== Timeslots (list) =====================
    [HttpGet]
    public async Task<IActionResult> GetTimeslots()
    {
        try
        {
            var timeslots = await _db.Timeslots
                .AsNoTracking()
                .OrderBy(t => t.StartTime)
                .ToListAsync();

            // Transform to response format
            var items = timeslots.Select(x => new
            {
                timeId = x.TimeId,
                startTime = x.StartTime.ToString("HH:mm"),
                endTime = x.EndTime.ToString("HH:mm")
            }).ToList();

            return Ok(new
            {
                code = 200,
                data = items
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTimeslots: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Timeslot (detail) =====================
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var timeslot = await _db.Timeslots
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TimeId == id);

            if (timeslot == null)
            {
                return NotFound(new { code = 404, message = "Timeslot not found" });
            }

            return Ok(new
            {
                code = 200,
                data = new
                {
                    timeId = timeslot.TimeId,
                    startTime = timeslot.StartTime.ToString("HH:mm"),
                    endTime = timeslot.EndTime.ToString("HH:mm")
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTimeslotById: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

