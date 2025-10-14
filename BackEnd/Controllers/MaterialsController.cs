using System.Security.Claims;
using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // bắt buộc đã đăng nhập
public class MaterialsController : ControllerBase
{
    private readonly IMaterialService _materialService;
    private readonly FjapDbContext _db;

    public MaterialsController(IMaterialService materialService, FjapDbContext db)
    {
        _materialService = materialService;
        _db = db;
    }

    // =============== Helpers ===============
    private int GetCurrentUserId()
    {
        // Lấy user_id (int) từ JWT claims
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("uid")
                ?? User.FindFirstValue("user_id");

        if (!int.TryParse(s, out var id))
            throw new InvalidOperationException($"Cannot resolve current user id from token. value='{s}'");
        return id;
    }

    private static string? HandleFromEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var at = email.IndexOf('@');
        return at > 0 ? email[..at] : email;
    }

    // =============== Queries ===============
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Query trực tiếp để lấy luôn email creator/updater (EF sẽ dịch thành LEFT JOIN/subquery)
        var rows = await _db.Materials
            .AsNoTracking()
            .OrderByDescending(m => m.CreateAt)
            .Select(m => new
            {
                // Core
                m.MaterialId,
                m.Title,
                m.FilePath,
                m.MaterialDescription,
                m.CreateAt,
                m.UpdateAt,
                m.Status,
                m.CreateBy,      // int user_id
                m.UpdateBy,      // int user_id
                m.UserId,
                m.SubjectId,

                // Subject
                subjectCode = m.Subject.SubjectCode,

                // Emails (để tí nữa map ra handle)
                creatorEmail = _db.Users.Where(u => u.UserId == m.CreateBy)
                                        .Select(u => u.Email)
                                        .FirstOrDefault(),
                updaterEmail = _db.Users.Where(u => u.UserId == m.UpdateBy)
                                        .Select(u => u.Email)
                                        .FirstOrDefault()
            })
            .ToListAsync();

        // Map email -> handle (phần trước @)
        var data = rows.Select(x => new
        {
            x.MaterialId,
            x.Title,
            x.FilePath,
            x.MaterialDescription,
            x.CreateAt,
            x.UpdateAt,
            x.Status,
            x.CreateBy,
            x.UpdateBy,
            x.UserId,
            x.SubjectId,
            x.subjectCode,

            // Thêm 2 field hiển thị cho FE
            createByName = HandleFromEmail(x.creatorEmail),
            updateByName = HandleFromEmail(x.updaterEmail)
        });

        return Ok(new { code = 200, data });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _materialService.GetByIdAsync(id);
        if (item == null) return NotFound(new { code = 404, message = "Material not found" });
        return Ok(new { code = 200, data = item });
    }

    // GET: api/materials/{id}/detail
    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        // Project detail + email
        var row = await _db.Materials
            .AsNoTracking()
            .Where(m => m.MaterialId == id)
            .Select(m => new
            {
                // Core
                m.MaterialId,
                m.Title,
                m.FilePath,
                m.MaterialDescription,
                m.Status,
                m.CreateAt,
                m.UpdateAt,
                m.CreateBy,
                m.UpdateBy,
                m.UserId,
                m.SubjectId,

                // Subject
                subject = new
                {
                    id = m.Subject.SubjectId,
                    name = m.Subject.SubjectName,
                    code = m.Subject.SubjectCode
                },

                // Emails
                creatorEmail = _db.Users.Where(u => u.UserId == m.CreateBy).Select(u => u.Email).FirstOrDefault(),
                updaterEmail = _db.Users.Where(u => u.UserId == m.UpdateBy).Select(u => u.Email).FirstOrDefault(),

                // (tuỳ chọn) chủ sở hữu/uploader nếu cần
                owner = new
                {
                    id = m.User.UserId,
                    name = m.User.LastName, // đổi đúng property nếu bạn có FullName
                    email = m.User.Email
                }
            })
            .FirstOrDefaultAsync();

        if (row == null) return NotFound(new { code = 404, message = "Material not found" });

        var data = new
        {
            row.MaterialId,
            row.Title,
            row.FilePath,
            row.MaterialDescription,
            row.Status,
            row.CreateAt,
            row.UpdateAt,
            row.CreateBy,
            row.UpdateBy,
            row.UserId,
            row.SubjectId,
            row.subject,
            row.owner,

            // tên hiển thị: phần trước @ trong email
            createByName = HandleFromEmail(row.creatorEmail),
            updateByName = HandleFromEmail(row.updaterEmail)
        };

        return Ok(new { code = 200, data });
    }

    // =============== Commands ===============
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Material request)
    {
        var uid = GetCurrentUserId();

        // Gán người tạo/chỉnh sửa hiện tại
        request.CreateBy = uid;
        request.UpdateBy = uid;
        request.CreateAt = DateTime.UtcNow;
        request.UpdateAt = DateTime.UtcNow;
        request.Status ??= "Active";

        var created = await _materialService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById),
            new { id = created.MaterialId },
            new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Material request)
    {
        if (id != request.MaterialId) return BadRequest(new { code = 400, message = "Id mismatch" });

        var uid = GetCurrentUserId();
        request.UpdateBy = uid;
        request.UpdateAt = DateTime.UtcNow;

        var ok = await _materialService.UpdateAsync(request);
        if (!ok) return NotFound(new { code = 404, message = "Material not found" });
        return Ok(new { code = 200, message = "Updated" });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        // Soft-delete tại controller để không phải đổi service
        var m = await _materialService.GetByIdAsync(id);
        if (m == null) return NotFound(new { code = 404, message = "Material not found" });

        m.Status = "Inactive";
        m.UpdateBy = GetCurrentUserId();
        m.UpdateAt = DateTime.UtcNow;

        var ok = await _materialService.UpdateAsync(m);
        if (!ok) return NotFound(new { code = 404, message = "Material not found" });

        return Ok(new { code = 200, message = "Set inactive" });
    }
}
