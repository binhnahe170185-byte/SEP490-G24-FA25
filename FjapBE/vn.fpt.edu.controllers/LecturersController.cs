using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
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

    [HttpGet("{id:int}/lesson")]
    [ProducesResponseType(typeof(IEnumerable<LessonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAllLessonByLecturerId(int id)
    {
        var lessonDto = await _lecturerService.GetLessonsByLecturerIdAsync(id);
        if (lessonDto == null) return NotFound();
        return Ok(new { code = 200, data = lessonDto });
    }
}

