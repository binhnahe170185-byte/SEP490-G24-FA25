using System.Security.Claims;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/daily-feedback")]
[Authorize]
public class DailyFeedbackController : ControllerBase
{
    private readonly IDailyFeedbackService _dailyFeedbackService;
    private readonly FjapDbContext _context;

    public DailyFeedbackController(
        IDailyFeedbackService dailyFeedbackService,
        FjapDbContext context)
    {
        _dailyFeedbackService = dailyFeedbackService;
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        throw new InvalidOperationException("Cannot resolve current user id from token.");
    }

    private int? GetCurrentRoleId()
    {
        var roleIdClaim = User.FindFirstValue("role_id");
        if (int.TryParse(roleIdClaim, out var roleId))
            return roleId;
        return null;
    }

    private async Task<int?> GetCurrentStudentIdAsync()
    {
        var userId = GetCurrentUserId();
        var student = await _context.Students
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => (int?)s.StudentId)
            .FirstOrDefaultAsync();
        return student;
    }

    [HttpPost]
    public async Task<IActionResult> CreateDailyFeedback([FromBody] CreateDailyFeedbackRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            if (roleId != 4) // Student only (RoleId 4)
            {
                return Forbid("Only students can create daily feedback");
            }

            var studentId = await GetCurrentStudentIdAsync();
            if (!studentId.HasValue)
            {
                return Unauthorized("Student ID not found");
            }

            // Override studentId from request with authenticated student
            var createRequest = request with { StudentId = studentId.Value };

            var result = await _dailyFeedbackService.CreateDailyFeedbackAsync(createRequest);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while creating daily feedback", error = ex.Message });
        }
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetStudentDailyFeedbacks([FromQuery] DailyFeedbackFilterRequest filter)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            if (roleId != 4) // Student only (RoleId 4)
            {
                return Forbid("Only students can view their own daily feedbacks");
            }

            var studentId = await GetCurrentStudentIdAsync();
            if (!studentId.HasValue)
            {
                return Unauthorized("Student ID not found");
            }

            var result = await _dailyFeedbackService.GetStudentDailyFeedbacksAsync(studentId.Value, filter);
            return Ok(new { items = result.Items, total = result.Total });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching daily feedbacks", error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAllDailyFeedbacks([FromQuery] DailyFeedbackFilterRequest filter)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Allow Lecturer (3), Head of Academic (5), Academic Staff (7)
            if (roleId != 3 && roleId != 5 && roleId != 7)
            {
                return Forbid("Only lecturers and staff can view daily feedbacks");
            }

            var result = await _dailyFeedbackService.GetAllDailyFeedbacksAsync(filter);
            return Ok(new { items = result.Items, total = result.Total });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching daily feedbacks", error = ex.Message });
        }
    }

    [HttpGet("class/{classId}")]
    public async Task<IActionResult> GetClassDailyFeedbacks(int classId, [FromQuery] DailyFeedbackFilterRequest filter)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Allow Lecturer (3), Head of Academic (5), Academic Staff (7)
            if (roleId != 3 && roleId != 5 && roleId != 7)
            {
                return Forbid("Only lecturers and staff can view class daily feedbacks");
            }

            var result = await _dailyFeedbackService.GetClassDailyFeedbacksAsync(classId, filter);
            return Ok(new { items = result.Items, total = result.Total });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching class daily feedbacks", error = ex.Message });
        }
    }

    [HttpGet("lesson/{lessonId}")]
    public async Task<IActionResult> CheckFeedbackForLesson(int lessonId)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            if (roleId != 4) // Student only (RoleId 4)
            {
                return Forbid("Only students can check their feedback status");
            }

            var studentId = await GetCurrentStudentIdAsync();
            if (!studentId.HasValue)
            {
                return Unauthorized("Student ID not found");
            }

            var hasFeedback = await _dailyFeedbackService.HasFeedbackForLessonAsync(studentId.Value, lessonId);
            return Ok(new { hasFeedback });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while checking feedback status", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDailyFeedbackById(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            var feedback = await _dailyFeedbackService.GetDailyFeedbackByIdAsync(id);

            if (feedback == null)
            {
                return NotFound("Daily feedback not found");
            }

            // Students can only view their own feedbacks
            if (roleId == 4)
            {
                var studentId = await GetCurrentStudentIdAsync();
                if (!studentId.HasValue || feedback.StudentId != studentId.Value)
                {
                    return Forbid("You can only view your own daily feedbacks");
                }
            }
            // Lecturers and Staff can view feedbacks for their classes
            else if (roleId == 3 || roleId == 5 || roleId == 7)
            {
                // Allow viewing
            }
            else
            {
                return Forbid("You don't have permission to view this feedback");
            }

            return Ok(feedback);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while fetching daily feedback", error = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDailyFeedbackStatusRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (5, 7) can update status
            if (roleId != 5 && roleId != 7)
            {
                return Forbid("Only staff can update feedback status");
            }

            var success = await _dailyFeedbackService.UpdateStatusAsync(id, request);
            if (!success)
            {
                return NotFound("Daily feedback not found");
            }

            return Ok(new { message = "Status updated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while updating status", error = ex.Message });
        }
    }
}

