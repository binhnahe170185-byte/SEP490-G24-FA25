using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.DependencyInjection;

namespace FJAP.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AIController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly FjapDbContext _context;

    public AIController(
        IAIService aiService,
        FjapDbContext context)
    {
        _aiService = aiService;
        _context = context;
    }

    // Helper method to get current user ID from JWT token
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        if (int.TryParse(userIdClaim, out var userIdNumeric))
            return userIdNumeric;

        throw new InvalidOperationException($"Cannot resolve current user id from token. value='{userIdClaim}'");
    }

    // Helper method to get current role ID from JWT token
    private int? GetCurrentRoleId()
    {
        var roleIdClaim = User.FindFirstValue("role_id");
        if (int.TryParse(roleIdClaim, out var roleId))
            return roleId;
        return null;
    }

    /// <summary>
    /// Chat với AI (Study Companion)
    /// POST: api/ai/chat
    /// </summary>
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AIChatRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Chỉ Student (RoleId 4) mới được chat với AI
            if (roleId != 4)
                return StatusCode(403, new { code = 403, message = "Only students can chat with AI" });

            var userId = GetCurrentUserId();
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.UserId == userId);
            
            if (student == null)
                return BadRequest(new { code = 400, message = "Student not found" });
            
            var studentId = student.StudentId;

            var response = await _aiService.ChatWithStudentAsync(request, studentId);
            return Ok(new { code = 200, data = response });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    /// <summary>
    /// Test endpoint để kiểm tra AI có hoạt động không
    /// GET: api/ai/test
    /// </summary>
    [HttpGet("test")]
    [AllowAnonymous]
    public async Task<IActionResult> TestAI()
    {
        try
        {
            // Inject AIProvider để test
            var aiProvider = HttpContext.RequestServices.GetRequiredService<FJAP.Services.Interfaces.IAIProvider>();
            
            var testMessage = "Xin chào, bạn có thể giúp tôi học tiếng Nhật không?";
            var response = await aiProvider.ChatAsync(testMessage);
            
            return Ok(new 
            { 
                code = 200, 
                message = "AI is working!",
                testMessage = testMessage,
                aiResponse = response,
                timestamp = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                code = 500, 
                message = "AI test failed",
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }
}

