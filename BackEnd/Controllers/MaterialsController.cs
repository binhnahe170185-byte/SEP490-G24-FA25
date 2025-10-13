using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaterialsController : ControllerBase
{
    private readonly IMaterialService _materialService;

    public MaterialsController(IMaterialService materialService)
    {
        _materialService = materialService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _materialService.GetAllAsync();
        var data = list.Select(m => new {
            m.MaterialId,
            m.Title,
            m.FilePath,
            m.MaterialDescription,
            m.CreateAt,
            m.UpdateAt,
            m.Status,
            m.CreateBy,
            m.UpdateBy,
            m.UserId,
            m.SubjectId,
            subjectCode = m.Subject.SubjectCode   // <-- tên môn
        });

        return Ok(new { code = 200, data });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _materialService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var item = await _materialService.GetDetailAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    //[HttpGet("lesson/{lessonId:int}")]
    //public async Task<IActionResult> GetByLesson(int lessonId)
    //{
    //    var list = await _materialService.GetByLessonAsync(lessonId);
    //    return Ok(new { code = 200, data = list });
    //}

    [HttpPost]
    public async Task<IActionResult> Create(Material request)
    {
        var created = await _materialService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.MaterialId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Material request)
    {
        if (id != request.MaterialId) return BadRequest();
        var ok = await _materialService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _materialService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
