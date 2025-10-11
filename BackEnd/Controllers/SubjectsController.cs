using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubjectsController : ControllerBase
{
    private readonly ISubjectService _subjectService;

    public SubjectsController(ISubjectService subjectService)
    {
        _subjectService = subjectService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _subjectService.GetAllAsync();
        return Ok(new { code = 200, data });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _subjectService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var item = await _subjectService.GetDetailAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Subject request)
    {
        var created = await _subjectService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.SubjectId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, Subject request)
    {
        if (id != request.SubjectId) return BadRequest();
        var ok = await _subjectService.UpdateAsync(id, request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _subjectService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}