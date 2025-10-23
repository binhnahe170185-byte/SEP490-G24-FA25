using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StaffOfAdminController : ControllerBase
{
    private readonly IStaffOfAdminService _adminService;
    private readonly FjapDbContext _db;

    public StaffOfAdminController(IStaffOfAdminService adminService, FjapDbContext dbContext)
    {
        _adminService = adminService;
        _db = dbContext;
    }

    // ===================== Users (list) =====================
    // /api/Admin/users?search=&role=&status=&semesterId=&page=1&pageSize=20
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] int? role,
        [FromQuery] string? roles,
        [FromQuery] string? status,
        [FromQuery] int? semesterId,
        [FromQuery] int? departmentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        // LEFT JOIN student/level/semester/department theo schema mới
        var baseQuery =
            from u in _db.Users.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
            join d in _db.Departments.AsNoTracking() on u.DepartmentId equals d.DepartmentId into dgrp
            from d in dgrp.DefaultIfEmpty()
            join s in _db.Students.AsNoTracking() on u.UserId equals s.UserId into sgrp
            from s in sgrp.DefaultIfEmpty()
            join l in _db.Levels.AsNoTracking() on s.LevelId equals l.LevelId into lgrp
            from l in lgrp.DefaultIfEmpty()
            join sem in _db.Semesters.AsNoTracking() on s.SemesterId equals sem.SemesterId into semgrp
            from sem in semgrp.DefaultIfEmpty()
            select new
            {
                u.UserId,
                u.FirstName,
                u.LastName,
                u.Email,
                u.PhoneNumber,
                u.Gender,
                u.Dob,
                u.Address,
                u.Avatar,
                u.Status,        // user.status
                RoleId = u.RoleId,
                RoleName = r.RoleName,
                DepartmentId = (int?)u.DepartmentId,
                DepartmentName = d != null ? d.DepartmentName : null,

                // Student-only:
                StudentId = (int?)s.StudentId,
                StudentCode = s != null ? s.StudentCode : null,
                StudentStatus = s != null ? s.Status : null,
                LevelId = (int?)s.LevelId,
                LevelName = l != null ? l.LevelName : null,
                SemesterId = (int?)s.SemesterId,
                SemesterName = sem != null ? sem.Name : null,
                EnrollmentDate = s != null ? (DateOnly?)s.EnrollmentDate : null
            };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            baseQuery = baseQuery.Where(x =>
                (x.FirstName + " " + x.LastName + " " + x.Email + " " + (x.PhoneNumber ?? "") + " " + (x.StudentCode ?? ""))
                .Contains(term));
        }
        // Handle role filtering - support both single role and multiple roles
        if (!string.IsNullOrWhiteSpace(roles))
        {
            var roleIds = roles.Split(',').Select(int.Parse).ToList();
            baseQuery = baseQuery.Where(x => roleIds.Contains(x.RoleId));
        }
        else if (role is int roleId)
        {
            baseQuery = baseQuery.Where(x => x.RoleId == roleId);
        }
        if (!string.IsNullOrWhiteSpace(status)) baseQuery = baseQuery.Where(x => x.Status == status);
        if (semesterId is int sid) baseQuery = baseQuery.Where(x => x.SemesterId == sid);
        if (departmentId is int did) baseQuery = baseQuery.Where(x => x.DepartmentId == did);

        var total = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(x => x.UserId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var shaped = items.Select(x => new
        {
            userId = x.UserId,
            firstName = x.FirstName,
            lastName = x.LastName,
            email = x.Email,
            phoneNumber = x.PhoneNumber,
            gender = x.Gender,
            dob = x.Dob.ToString("yyyy-MM-dd"),
            address = x.Address,
            avatar = x.Avatar,
            status = x.Status,             // user Active/Inactive
            roleId = x.RoleId,
            roleName = x.RoleName,
            departmentId = x.DepartmentId,
            departmentName = x.DepartmentName,
            // Student:
            studentId = x.StudentId,
            studentCode = x.StudentCode,
            studentStatus = x.StudentStatus,
            levelId = x.LevelId,
            levelName = x.LevelName,
            semesterId = x.SemesterId,
            semesterName = x.SemesterName,
            enrollmentDate = x.EnrollmentDate?.ToString("yyyy-MM-dd")
        });

        return Ok(new
        {
            total,
            items = shaped
        });
    }

    // ===================== Users (detail CRUD) =====================
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
        // đảm bảo status default
        if (string.IsNullOrWhiteSpace(request.Status))
            request.Status = "Active";

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

    // ===================== Import Excel =====================
    [HttpPost("users/import")]
    public async Task<IActionResult> ImportExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is empty.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
            return BadRequest("Only Excel files (.xlsx/.xls) are supported.");

        using var stream = file.OpenReadStream();
        var result = await _adminService.ImportExcelAsync(stream);
        return Ok(new { code = 200, result });
    }

    // ===================== Helper: lấy danh sách Enrollment Semesters (distinct) cho filter =====================
    [HttpGet("users/enrollment-semesters")]
    public async Task<IActionResult> GetEnrollmentSemesters()
    {
        var data = await (
            from s in _db.Students.AsNoTracking()
            join sem in _db.Semesters.AsNoTracking() on s.SemesterId equals sem.SemesterId
            where s.SemesterId != null
            select new { sem.SemesterId, sem.Name, sem.StartDate }
        )
        .Distinct()
        .OrderByDescending(x => x.StartDate)
        .ThenByDescending(x => x.Name)
        .ToListAsync();

        return Ok(data.Select(x => new { semesterId = x.SemesterId, name = x.Name }));
    }

    // ===================== Helper: lấy danh sách Departments cho filter =====================
    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments()
    {
        var data = await _db.Departments
            .AsNoTracking()
            .OrderBy(x => x.DepartmentName)
            .Select(x => new { departmentId = x.DepartmentId, name = x.DepartmentName })
            .ToListAsync();

        return Ok(data);
    }
}
