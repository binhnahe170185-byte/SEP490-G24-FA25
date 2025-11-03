using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
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
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest request)
    {
        try
        {
            // Model validation
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new { 
                        field = x.Key, 
                        messages = x.Value?.Errors.Select(e => e.ErrorMessage).ToArray() 
                    })
                    .ToArray();
                
                return BadRequest(new { 
                    code = 400, 
                    message = "Validation failed",
                    errors = errors
                });
            }

            // Validate role ID - only allow Staff (6, 7) and Lecturer (3)
            var validRoleIds = new[] { 3, 6, 7 };
            if (!validRoleIds.Contains(request.RoleId))
            {
                return BadRequest(new { code = 400, message = "Invalid role for staff creation. Allowed roles: Staff (6,7), Lecturer (3). Department heads are assigned separately by admin." });
            }

            // For Staff (6, 7), department is required
            if ((request.RoleId == 6 || request.RoleId == 7) && !request.DepartmentId.HasValue)
            {
                return BadRequest(new { code = 400, message = "Department is required for Staff roles" });
            }

            // Check email uniqueness - trim and lowercase for comparison
            var emailNormalized = request.Email.Trim().ToLower();
            var existingEmail = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email.ToLower().Trim() == emailNormalized);
            
            if (existingEmail != null)
            {
                return BadRequest(new { code = 400, message = "Email already exists in the system" });
            }

            // Check phone uniqueness (if provided and not empty)
            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                var phoneNormalized = request.PhoneNumber.Trim();
                var existingPhone = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.PhoneNumber != null && u.PhoneNumber.Trim() == phoneNormalized);
                
                if (existingPhone != null)
                {
                    return BadRequest(new { code = 400, message = "Phone number already exists in the system" });
                }
            }

            // Validate department exists (if provided)
            if (request.DepartmentId.HasValue)
            {
                var departmentExists = await _db.Departments
                    .AsNoTracking()
                    .AnyAsync(d => d.DepartmentId == request.DepartmentId.Value);
                
                if (!departmentExists)
                    return BadRequest(new { code = 400, message = "Department does not exist" });
            }

            // Validate gender
            var validGenders = new[] { "Male", "Female", "Other" };
            if (!validGenders.Contains(request.Gender))
                request.Gender = "Other";

            // Map DTO to User entity
            var user = new User
            {
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = request.Email.Trim().ToLower(),
                PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? "" : request.PhoneNumber.Trim(),
                Gender = request.Gender,
                Dob = request.Dob,
                Address = string.IsNullOrWhiteSpace(request.Address) ? "" : request.Address.Trim(),
                Avatar = request.Avatar,
                RoleId = request.RoleId,
                DepartmentId = request.DepartmentId,
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status
            };

            var created = await _adminService.CreateAsync(user);
            
            // Return response without navigation properties
            var responseData = new
            {
                userId = created.UserId,
                firstName = created.FirstName,
                lastName = created.LastName,
                email = created.Email,
                phoneNumber = created.PhoneNumber,
                gender = created.Gender,
                dob = created.Dob.ToString("yyyy-MM-dd"),
                address = created.Address,
                avatar = created.Avatar,
                roleId = created.RoleId,
                departmentId = created.DepartmentId,
                status = created.Status
            };
            
            return CreatedAtAction(nameof(GetById), new { id = created.UserId }, new { code = 201, data = responseData });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            Console.WriteLine($"DbUpdateException: {ex.Message}");
            Console.WriteLine($"InnerException: {ex.InnerException?.Message}");
            
            // Handle database constraint violations
            var innerMsg = ex.InnerException?.Message?.ToLower() ?? "";
            var outerMsg = ex.Message?.ToLower() ?? "";
            
            // Check for email unique constraint violation
            if (innerMsg.Contains("uk_user_email") || innerMsg.Contains("duplicate entry") && innerMsg.Contains("email") ||
                outerMsg.Contains("uk_user_email") || outerMsg.Contains("duplicate entry") && outerMsg.Contains("email"))
            {
                return BadRequest(new { code = 400, message = "Email already exists in the system" });
            }
            
            // Check for phone unique constraint violation
            if (innerMsg.Contains("uk_user_phone") || innerMsg.Contains("duplicate entry") && innerMsg.Contains("phone") ||
                outerMsg.Contains("uk_user_phone") || outerMsg.Contains("duplicate entry") && outerMsg.Contains("phone"))
            {
                return BadRequest(new { code = 400, message = "Phone number already exists in the system" });
            }
            
            return BadRequest(new { code = 400, message = $"Database error: {ex.Message}", details = ex.InnerException?.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== ERROR creating user ===");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine($"Type: {ex.GetType().Name}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"InnerException: {ex.InnerException.Message}");
                Console.WriteLine($"InnerException Type: {ex.InnerException.GetType().Name}");
            }
            
            return StatusCode(500, new { 
                code = 500, 
                message = "An error occurred while creating the user", 
                error = ex.Message,
                errorType = ex.GetType().Name,
                innerException = ex.InnerException?.Message
            });
        }
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> Update(int id, User request)
    {
        Console.WriteLine($"PUT /api/StaffOfAdmin/users/{id}");
        Console.WriteLine($"Request Status: '{request.Status}'");
        
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
