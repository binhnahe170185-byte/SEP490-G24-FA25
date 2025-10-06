using System.ComponentModel.DataAnnotations;
using FAJP.Models;
using FJAP.Handles.Manager;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.Manager;

[ApiController]
[Route("api/manager/classes")]
public class ClassesController : ControllerBase
{
    private readonly IClassHandle _handle;

    public ClassesController(IClassHandle handle)
    {
        _handle = handle;
    }

    // GET /api/manager/classes
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Class>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var rows = await _handle.GetAllAsync();

            return Ok(new
            {
                code = StatusCodes.Status200OK,
                message = "Success",
                data = rows
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                code = StatusCodes.Status500InternalServerError,
                message = "Internal Server Error",
                detail = ex.Message
            });
        }
    }

    // GET /api/manager/classes/{classId}
    [HttpGet("{classId}")]
    [ProducesResponseType(typeof(IEnumerable<ClassSubjectDetail>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSubjects(string classId)
    {
        try
        {
            var rows = await _handle.GetSubjectsAsync(classId);

            return Ok(new
            {
                code = StatusCodes.Status200OK,
                message = "Success",
                data = rows
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                code = StatusCodes.Status500InternalServerError,
                message = "Internal Server Error",
                detail = ex.Message
            });
        }
    }

    // PATCH /api/manager/classes/{classId}/status
    [HttpPatch("{classId}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateStatus(string classId, [FromBody] UpdateClassStatusRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            await _handle.UpdateStatusAsync(classId, request.Status);
            return Ok(new
            {
                code = StatusCodes.Status200OK,
                message = "Class status updated"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                code = StatusCodes.Status500InternalServerError,
                message = "Internal Server Error",
                detail = ex.Message
            });
        }
    }
}

public class UpdateClassStatusRequest
{
    [Required]
    public bool Status { get; set; }
}
