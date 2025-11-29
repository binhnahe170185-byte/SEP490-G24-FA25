using System.Security.Claims;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FJAP.Controllers;

[ApiController]
[Route("api/feedback")]
[Authorize]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;
    private readonly IFeedbackCheckService _feedbackCheckService;
    private readonly FjapDbContext _context;
    private readonly ILogger<FeedbackController>? _logger;

    public FeedbackController(
        IFeedbackService feedbackService,
        IFeedbackCheckService feedbackCheckService,
        FjapDbContext context,
        ILogger<FeedbackController>? logger = null)
    {
        _feedbackService = feedbackService;
        _feedbackCheckService = feedbackCheckService;
        _context = context;
        _logger = logger;
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

    private async Task<List<int>> GetCurrentLecturerClassIdsAsync()
    {
        var userId = GetCurrentUserId();
        // Get LectureId from UserId
        var lectureId = await _context.Lectures
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => (int?)l.LectureId)
            .FirstOrDefaultAsync();

        if (!lectureId.HasValue)
        {
            return new List<int>();
        }

        // Get ClassIds from Lessons where LectureId matches
        var classIds = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
            .Where(l => l.LectureId == lectureId.Value && l.Class.Status == "Active")
            .Select(l => l.ClassId)
            .Distinct()
            .ToListAsync();

        return classIds;
    }

    // POST: api/feedback
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Students (RoleId 4) can create feedback
            if (roleId != 4)
            {
                return StatusCode(403, new { code = 403, message = "Only Students can create feedback" });
            }

            var studentId = await GetCurrentStudentIdAsync();
            if (!studentId.HasValue)
            {
                return StatusCode(403, new { code = 403, message = "Current user is not a student" });
            }
            
            // Override StudentId from request với studentId từ token để đảm bảo security
            var createRequest = request with { StudentId = studentId.Value };

            var created = await _feedbackService.CreateFeedbackAsync(createRequest);
            return CreatedAtAction(nameof(GetById), new { id = created.Id },
                new { code = 201, message = "Feedback created successfully", data = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? classId, [FromQuery] int? subjectId,
        [FromQuery] string? sentiment, [FromQuery] int? urgency, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (RoleId 5, 6, 7) and Lecturer (RoleId 3) can view feedback
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can view feedbacks" });
            }

            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 100) pageSize = 20;

            // If lecturer (role 3), get their class IDs and filter feedbacks
            List<int>? lecturerClassIds = null;
            if (roleId == 3)
            {
                lecturerClassIds = await GetCurrentLecturerClassIdsAsync();
                // If lecturer has no classes, return empty result
                if (!lecturerClassIds.Any())
                {
                    return Ok(new { code = 200, message = "Success", total = 0, page, pageSize, data = new List<FeedbackDto>() });
                }
            }

            var filter = new FeedbackFilterRequest(
                classId,
                subjectId,
                sentiment,
                urgency,
                status,
                lecturerClassIds,
                page,
                pageSize
            );

            var (items, total) = await _feedbackService.GetFeedbacksAsync(filter);

            return Ok(new { code = 200, message = "Success", total, page, pageSize, data = items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (RoleId 5, 6, 7) and Lecturer (RoleId 3) can view feedback
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can view feedback details" });
            }

            var feedback = await _feedbackService.GetFeedbackByIdAsync(id);
            if (feedback == null)
            {
                return NotFound(new { code = 404, message = "Feedback not found" });
            }

            // If lecturer (role 3), check if they teach this class
            if (roleId == 3)
            {
                var lecturerClassIds = await GetCurrentLecturerClassIdsAsync();
                if (!lecturerClassIds.Contains(feedback.ClassId))
                {
                    return StatusCode(403, new { code = 403, message = "You can only view feedback for classes you teach" });
                }
            }

            return Ok(new { code = 200, message = "Success", data = feedback });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // PUT: api/feedback/{id}/status
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateFeedbackStatusRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (RoleId 5, 6, 7) and Lecturer (RoleId 3) can update status
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can update feedback status" });
            }

            // If lecturer (role 3), check if they teach this class
            if (roleId == 3)
            {
                var feedback = await _feedbackService.GetFeedbackByIdAsync(id);
                if (feedback == null)
                {
                    return NotFound(new { code = 404, message = "Feedback not found" });
                }

                var lecturerClassIds = await GetCurrentLecturerClassIdsAsync();
                if (!lecturerClassIds.Contains(feedback.ClassId))
                {
                    return StatusCode(403, new { code = 403, message = "You can only update feedback status for classes you teach" });
                }
            }

            var success = await _feedbackService.UpdateStatusAsync(id, request);
            if (!success)
            {
                return NotFound(new { code = 404, message = "Feedback not found" });
            }

            return Ok(new { code = 200, message = "Feedback status updated successfully" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/feedback/{id}/analyze
    [HttpPost("{id:int}/analyze")]
    public async Task<IActionResult> ReAnalyze(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (RoleId 5, 6, 7) can re-analyze
            if (roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff can re-analyze feedback" });
            }

            var feedback = await _feedbackService.ReAnalyzeFeedbackAsync(id);
            return Ok(new { code = 200, message = "Feedback re-analyzed successfully", data = feedback });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { code = 404, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/pending
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingFeedback()
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Students (RoleId 4) can view pending feedback
            if (roleId != 4)
            {
                return StatusCode(403, new { code = 403, message = "Only Students can view pending feedback" });
            }

            var studentId = await GetCurrentStudentIdAsync();
            if (!studentId.HasValue)
            {
                return StatusCode(403, new { code = 403, message = "Current user is not a student" });
            }

            var pendingClasses = await _feedbackCheckService.GetPendingFeedbackClassesAsync(studentId.Value);
            return Ok(new { code = 200, message = "Success", data = pendingClasses });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/analytics/pareto
    [HttpGet("analytics/pareto")]
    public async Task<IActionResult> GetIssuePareto(
        [FromQuery] int? classId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? groupBy = "category")
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (5,6,7) and Lecturer (3) can view analytics
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can view analytics" });
            }

            if (from.HasValue && to.HasValue && from > to)
            {
                return BadRequest(new { code = 400, message = "Invalid time range: from must be <= to" });
            }

            var data = await _feedbackService.GetIssueParetoAsync(classId, from, to, groupBy);
            return Ok(new { code = 200, message = "Success", data });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/question-pareto
    [HttpGet("question-pareto")]
    public async Task<IActionResult> GetQuestionPareto(
        [FromQuery] int? classId,
        [FromQuery] int? semesterId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (5,6,7) and Lecturer (3) can view analytics
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can view analytics" });
            }

            if (from.HasValue && to.HasValue && from > to)
            {
                return BadRequest(new { code = 400, message = "Invalid time range: from must be <= to" });
            }

            var data = await _feedbackService.GetQuestionParetoAsync(classId, semesterId, from, to);
            return Ok(new { code = 200, message = "Success", data });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/text-summary
    [HttpGet("text-summary")]
    public async Task<IActionResult> GetTextSummary(
        [FromQuery] int? classId,
        [FromQuery] int? semesterId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Staff (5,6,7) and Lecturer (3) can view analytics
            if (roleId != 3 && roleId != 5 && roleId != 6 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Staff or Lecturers can view analytics" });
            }

            if (from.HasValue && to.HasValue && from > to)
            {
                return BadRequest(new { code = 400, message = "Invalid time range: from must be <= to" });
            }

            var data = await _feedbackService.GetTextSummaryAsync(classId, semesterId, from, to);
            return Ok(new { code = 200, message = "Success", data });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/feedback/re-analyze-all
    [HttpPost("re-analyze-all")]
    public async Task<IActionResult> ReAnalyzeAllWithoutCategory([FromQuery] int? limit = null)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Head of Academic (5) and Staff Academic (7) can batch re-analyze
            if (roleId != 5 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Head of Academic or Staff Academic can batch re-analyze feedback" });
            }

            var (total, processed, succeeded, failed) = await _feedbackService.ReAnalyzeAllWithoutCategoryAsync(limit);
            
            return Ok(new 
            { 
                code = 200, 
                message = "Batch re-analysis completed",
                data = new
                {
                    total,
                    processed,
                    succeeded,
                    failed
                }
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error re-analyzing feedbacks");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/feedback/re-analyze-all-force
    [HttpPost("re-analyze-all-force")]
    public async Task<IActionResult> ReAnalyzeAllForce([FromQuery] int? limit = null)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Head of Academic (5) and Staff Academic (7) can force re-analyze
            if (roleId != 5 && roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Head of Academic or Staff Academic can force re-analyze all feedbacks" });
            }

            _logger?.LogInformation("Force re-analyze all feedbacks requested. Limit: {Limit}", limit);
            var (total, processed, succeeded, failed) = await _feedbackService.ReAnalyzeAllFeedbacksAsync(limit, force: true);
            
            return Ok(new 
            { 
                code = 200, 
                message = "Force re-analysis completed",
                data = new
                {
                    total,
                    processed,
                    succeeded,
                    failed
                }
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error force re-analyzing feedbacks");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

}

