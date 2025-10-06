using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;

    public StudentsController(IStudentService studentService)
    {
        _studentService = studentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Student>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var students = await _studentService.GetAllAsync();
        return Ok(new { code = 200, data = students });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Student), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var student = await _studentService.GetByIdAsync(id);
        if (student == null) return NotFound();
        return Ok(new { code = 200, data = student });
    }

    [HttpGet("{id:int}/classes")]
    [ProducesResponseType(typeof(Student), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWithClasses(int id)
    {
        var student = await _studentService.GetWithClassesAsync(id);
        if (student == null) return NotFound();
        return Ok(new { code = 200, data = student });
    }

    [HttpPost]
    [ProducesResponseType(typeof(Student), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(Student request)
    {
        var created = await _studentService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.StudentId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, Student request)
    {
        if (id != request.StudentId) return BadRequest();
        var ok = await _studentService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _studentService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
