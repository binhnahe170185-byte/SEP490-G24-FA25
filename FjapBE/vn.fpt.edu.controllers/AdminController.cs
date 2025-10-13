using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using CsvHelper; 
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Http;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{

    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAll()
    {
        var data = await _adminService.GetAllAsync();
        return Ok(new { code = 200, data });
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _adminService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpPost("users")]
    public async Task<IActionResult> Create(User request)
    {
        var created = await _adminService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.UserId }, new { code = 201, data = created });
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> Update(int id, User request)
    {
        if (id != request.UserId) return BadRequest();
        var ok = await _adminService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _adminService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }
}
