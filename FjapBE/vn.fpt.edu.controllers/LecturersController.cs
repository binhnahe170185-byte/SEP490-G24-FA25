using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LecturersController : ControllerBase
{
    private readonly ILecturerService _lecturerService;

    public LecturersController(ILecturerService lecturerService)
    {
        _lecturerService = lecturerService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<LecturerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllLecturers()
    {
        var lecturers = await _lecturerService.GetAllLecturersAsync();
        return Ok(new { code = 200, data = lecturers });
    }

    [HttpGet("{id:int}/lesson")]
    [ProducesResponseType(typeof(IEnumerable<LessonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAllLessonByLecturerId(int id)
    {
        var lessonDto = await _lecturerService.GetLessonsByLecturerIdAsync(id);
        if (lessonDto == null) return NotFound();
        return Ok(new { code = 200, data = lessonDto });
    }

    /// <summary>
    /// Lấy danh sách lớp mà giảng viên dạy
    /// GET: api/Lecturers/{id}/classes?semesterId={semesterId}
    /// </summary>
    [HttpGet("{id:int}/classes")]
    [ProducesResponseType(typeof(IEnumerable<LecturerClassDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetClassesByLecturerId(int id, [FromQuery] int? semesterId = null)
    {
        try
        {
            var classes = await _lecturerService.GetClassesByLecturerIdAsync(id, semesterId);
            return Ok(new { code = 200, data = classes });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = $"Error: {ex.Message}" });
        }
    }
}

