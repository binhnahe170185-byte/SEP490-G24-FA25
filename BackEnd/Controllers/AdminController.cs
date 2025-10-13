using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers
{
    // Infrastructure/Extensions/AdminController.cs
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly FjapDbContext _db; // <== Đổi đúng tên DbContext của bạn

        public AdminController(IAdminService adminService, FjapDbContext db)
        {
            _adminService = adminService;
            _db = db;
        }

        // GIỮ 1 endpoint duy nhất cho list users (filter + paging)
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(string? search, int? roleId = null, string? semester = null, string? level = null)
        {
            var q = _db.Users
                .AsNoTracking()
                .Include(u => u.Semester)
                .Include(u => u.Level) // 👈 thêm dòng này
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(u =>
                    ((u.FirstName ?? "") + " " + (u.LastName ?? "")).Contains(search) ||
                    (u.Email ?? "").Contains(search));

            if (roleId.HasValue)
                q = q.Where(u => u.RoleId == roleId);

            if (!string.IsNullOrWhiteSpace(semester))
                q = q.Where(u => u.Semester != null && u.Semester.Name == semester);

            if (!string.IsNullOrWhiteSpace(level))
                q = q.Where(u => u.Level != null && u.Level.LevelName == level); // 👈 filter level

            var items = await q.OrderBy(u => u.UserId)
                .Select(u => new
                {
                    userId = u.UserId,
                    firstName = u.FirstName,
                    lastName = u.LastName,
                    email = u.Email,
                    phoneNumber = u.PhoneNumber,
                    roleId = u.RoleId,
                    dob = u.Dob.ToString("yyyy-MM-dd"),
                    enrollmentDate = u.EnrollmentDate.ToString("yyyy-MM-dd"),
                    address = u.Address,
                    semesterName = u.Semester != null ? u.Semester.Name : null,
                    levelName = u.Level != null ? u.Level.LevelName : null // 👈 thêm thuộc tính
                })
                .ToListAsync();

            return Ok(items);
        }


        // Giữ các endpoint CRUD khác như bạn đang có (không trùng route "users")
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

        [HttpPost("users/import")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("File rỗng.");
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls") return BadRequest("Chỉ hỗ trợ Excel (.xlsx/.xls).");

            using var stream = file.OpenReadStream();
            var result = await _adminService.ImportExcelAsync(stream);
            return Ok(new { code = 200, result });
        }
    }
}
