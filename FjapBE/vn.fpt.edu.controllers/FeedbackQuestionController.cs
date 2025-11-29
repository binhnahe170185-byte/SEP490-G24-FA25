using System.Security.Claims;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/feedback/questions")]
[Authorize]
public class FeedbackQuestionController : ControllerBase
{
    private readonly IFeedbackQuestionService _questionService;

    public FeedbackQuestionController(IFeedbackQuestionService questionService)
    {
        _questionService = questionService;
    }

    private int? GetCurrentRoleId()
    {
        var roleIdClaim = User.FindFirstValue("role_id");
        if (int.TryParse(roleIdClaim, out var roleId))
            return roleId;
        return null;
    }

    // GET: api/feedback/questions?subjectId={subjectId}
    [HttpGet]
    public async Task<IActionResult> GetActiveQuestions([FromQuery] int? subjectId = null)
    {
        try
        {
            var questions = await _questionService.GetActiveQuestionsAsync(subjectId);
            return Ok(new { code = 200, message = "Success", data = questions });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/feedback/questions/all
    [HttpGet("all")]
    public async Task<IActionResult> GetAllQuestions()
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Academic Staff (RoleId 7) can view all questions
            if (roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Academic Staff can view all questions" });
            }

            var questions = await _questionService.GetAllQuestionsAsync();
            return Ok(new { code = 200, message = "Success", data = questions });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/feedback/questions
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackQuestionRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Academic Staff (RoleId 7) can create questions
            if (roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Academic Staff can create questions" });
            }

            var created = await _questionService.CreateQuestionAsync(request);
            return CreatedAtAction(nameof(GetAllQuestions), null,
                new { code = 201, message = "Question created successfully", data = created });
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

    // PUT: api/feedback/questions/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFeedbackQuestionRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Academic Staff (RoleId 7) can update questions
            if (roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Academic Staff can update questions" });
            }

            var updated = await _questionService.UpdateQuestionAsync(id, request);
            if (updated == null)
            {
                return NotFound(new { code = 404, message = "Question not found" });
            }

            return Ok(new { code = 200, message = "Question updated successfully", data = updated });
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

    // DELETE: api/feedback/questions/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Only Academic Staff (RoleId 7) can delete questions
            if (roleId != 7)
            {
                return StatusCode(403, new { code = 403, message = "Only Academic Staff can delete questions" });
            }

            var success = await _questionService.DeleteQuestionAsync(id);
            if (!success)
            {
                return NotFound(new { code = 404, message = "Question not found" });
            }

            return Ok(new { code = 200, message = "Question deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }
}

