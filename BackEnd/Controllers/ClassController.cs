using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;

    public ClassController(IClassService classService)
    {
        _classService = classService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _classService.GetAllAsync();
        return Ok(new { code = 200, data });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _classService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpGet("{id:int}/students")]
    public async Task<IActionResult> GetWithStudents(int id)
    {
        var item = await _classService.GetWithStudentsAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Class request)
    {
        var created = await _classService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ClassId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Class request)
    {
        if (id != request.ClassId) return BadRequest();
        var ok = await _classService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _classService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
