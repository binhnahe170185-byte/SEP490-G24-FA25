using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly FjapDbContext _dbContext;

    public AdminController(IAdminService adminService, FjapDbContext dbContext)
    {
        _adminService = adminService;
        _dbContext = dbContext;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        string? search,
        int? roleId = null,
        string? semester = null,
        string? level = null)
    {
        var query = _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Students)
                .ThenInclude(s => s.Semester)
            .Include(u => u.Students)
                .ThenInclude(s => s.Level)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u =>
                (u.FirstName + " " + u.LastName).Contains(term) ||
                u.Email.Contains(term));
        }

        if (roleId.HasValue)
        {
            query = query.Where(u => u.RoleId == roleId.Value);
        }

        if (!string.IsNullOrWhiteSpace(semester))
        {
            var semesterTerm = semester.Trim();
            query = query.Where(u =>
                u.Students.Any(s => s.Semester != null && s.Semester.Name == semesterTerm));
        }

        if (!string.IsNullOrWhiteSpace(level))
        {
            var levelTerm = level.Trim();
            query = query.Where(u =>
                u.Students.Any(s => s.Level != null && s.Level.LevelName == levelTerm));
        }

        var records = await query
            .OrderBy(u => u.UserId)
            .Select(u => new
            {
                User = u,
                Student = u.Students
                    .OrderBy(s => s.StudentId)
                    .Select(s => new
                    {
                        s.EnrollmentDate,
                        SemesterName = s.Semester != null ? s.Semester.Name : null,
                        LevelName = s.Level != null ? s.Level.LevelName : null
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();

        var result = records.Select(r => new
        {
            userId = r.User.UserId,
            firstName = r.User.FirstName,
            lastName = r.User.LastName,
            email = r.User.Email,
            phoneNumber = r.User.PhoneNumber,
            roleId = r.User.RoleId,
            status = r.User.Status,
            dob = r.User.Dob.ToString("yyyy-MM-dd"),
            enrollmentDate = r.Student != null
                ? r.Student.EnrollmentDate.ToString("yyyy-MM-dd")
                : null,
            address = r.User.Address,
            semesterName = r.Student?.SemesterName,
            levelName = r.Student?.LevelName
        });

        return Ok(result);
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _adminService.GetByIdAsync(id);
        if (item == null)
        {
            return NotFound();
        }

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
        if (id != request.UserId)
        {
            return BadRequest();
        }

        var ok = await _adminService.UpdateAsync(request);
        if (!ok)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _adminService.DeleteAsync(id);
        if (!ok)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("users/import")]
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("File is empty.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
        {
            return BadRequest("Only Excel files (.xlsx/.xls) are supported.");
        }

        using var stream = file.OpenReadStream();
        var result = await _adminService.ImportExcelAsync(stream);
        return Ok(new { code = 200, result });
    }
}
