using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomController : ControllerBase
{
    private readonly FjapDbContext _db;

    public RoomController(FjapDbContext dbContext)
    {
        _db = dbContext;
    }

    // ===================== Rooms (list) =====================
    [HttpGet]
    public async Task<IActionResult> GetRooms(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        Console.WriteLine("=== RoomController.GetRooms called ===");
        Console.WriteLine($"Parameters: search={search}, status={status}, page={page}, pageSize={pageSize}");
        
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 500) pageSize = 100;

        try
        {
            Console.WriteLine("Querying Rooms from database...");
            var baseQuery = _db.Rooms.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                Console.WriteLine($"Applying search filter: {term}");
                baseQuery = baseQuery.Where(x => x.RoomName.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                Console.WriteLine($"Applying status filter: {status}");
                baseQuery = baseQuery.Where(x => x.Status.ToLower() == status.ToLower());
            }

            // Count total first
            var total = await baseQuery.CountAsync();
            Console.WriteLine($"Total rooms found: {total}");

            // Get items with pagination
            var rooms = await baseQuery
                .OrderBy(x => x.RoomName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            Console.WriteLine($"Rooms retrieved: {rooms.Count}");

            // Transform to response format
            var items = rooms.Select(x => new
            {
                roomId = x.RoomId,
                roomName = x.RoomName,
                status = x.Status
            }).ToList();

            Console.WriteLine($"Returning {items.Count} items");
            var response = new
            {
                total,
                items
            };
            Console.WriteLine($"Response: Total={response.total}, Items count={response.items.Count}");

            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetRooms: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Room (detail) =====================
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var room = await _db.Rooms
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RoomId == id);

            if (room == null)
            {
                return NotFound(new { code = 404, message = "Room not found" });
            }

            return Ok(new
            {
                code = 200,
                data = new
                {
                    roomId = room.RoomId,
                    roomName = room.RoomName,
                    status = room.Status
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetRoomById: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ===================== Test endpoint =====================
    [HttpGet("test")]
    public async Task<IActionResult> TestRooms()
    {
        try
        {
            Console.WriteLine("=== RoomController.TestRooms called ===");
            var count = await _db.Rooms.CountAsync();
            Console.WriteLine($"Total rooms in database: {count}");
            
            var allRooms = await _db.Rooms
                .AsNoTracking()
                .Select(x => new
                {
                    roomId = x.RoomId,
                    roomName = x.RoomName,
                    status = x.Status
                })
                .ToListAsync();

            Console.WriteLine($"Retrieved {allRooms.Count} rooms");

            return Ok(new
            {
                message = "Test successful",
                count,
                rooms = allRooms
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in TestRooms: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }
}

