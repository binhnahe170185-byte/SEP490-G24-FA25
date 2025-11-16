using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;
using FJAP.DTOs;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaterialsController : ControllerBase
{
    private readonly IMaterialService _materialService;
    private readonly FjapDbContext _db;

    public MaterialsController(IMaterialService materialService, FjapDbContext db)
    {
        _materialService = materialService;
        _db = db;
    }


    // Helper method to get current user ID from JWT token
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        if (int.TryParse(userIdClaim, out var userIdNumeric))
            return userIdNumeric;

        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email")
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.Identity?.Name;

        if (!string.IsNullOrWhiteSpace(email))
        {
            try
            {
                // Sử dụng raw SQL để tìm trực tiếp trong bảng user
                var userId = _db.Database.SqlQueryRaw<int?>(
                    "SELECT user_id FROM user WHERE email = {0} LIMIT 1", 
                    email).FirstOrDefault();
                
                if (userId.HasValue) 
                {
                    Console.WriteLine($"Found user by email: {email} -> UserId: {userId.Value}");
                    return userId.Value;
                }
                else
                {
                    Console.WriteLine($"No user found with email: {email}");
                    // Debug: in ra tất cả email trong DB để kiểm tra
                    var allEmails = _db.Database.SqlQueryRaw<string>("SELECT email FROM user").ToList();
                    Console.WriteLine($"All emails in DB: {string.Join(", ", allEmails)}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error querying user by email {email}: {ex.Message}");
            }
        }

        throw new InvalidOperationException($"Cannot resolve current user id from token. value='{userIdClaim ?? email}'");
    }

    // GET: api/materials
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search = null, [FromQuery] string? subject = null, [FromQuery] string? status = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
    {
        try
        {
            var materialsQuery = _db.Materials
                .AsNoTracking()
                .Include(m => m.Subject)
                .Where(m =>
                    (string.IsNullOrWhiteSpace(search) || m.Title.Contains(search) || (m.Description != null && m.Description.Contains(search))) &&
                    (string.IsNullOrWhiteSpace(subject) || (m.Subject != null && (m.Subject.SubjectCode.Contains(subject) || m.Subject.SubjectName.Contains(subject)))) &&
                    (string.IsNullOrWhiteSpace(status) || m.Status == status)
                );

            // If paging requested, return paged envelope. Otherwise keep legacy array-shaped response.
            if (page.HasValue && page.Value > 0)
            {
                var p = page.Value;
                var ps = (pageSize.HasValue && pageSize.Value > 0) ? Math.Min(pageSize.Value, 500) : 20;
                var total = await materialsQuery.CountAsync();

                var items = await materialsQuery
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((p - 1) * ps)
                    .Take(ps)
                    .Select(m => new
                    {
                        m.MaterialId,
                        m.Title,
                        m.FileUrl,
                        m.Description,
                        CreatedAt = m.CreatedAt,
                        UpdatedAt = m.UpdatedAt,
                        m.Status,
                        m.CreatedBy,
                        m.UpdatedBy,
                        m.SubjectId,
                        SubjectCode = m.Subject.SubjectCode,
                        SubjectName = m.Subject.SubjectName
                    })
                    .ToListAsync();

                // load creators for the page
                var creatorIds = items.Where(x => x.CreatedBy != null).Select(x => x.CreatedBy!.Value).Distinct().ToList();
                var users = await _db.Users
                    .Where(u => creatorIds.Contains(u.UserId))
                    .Select(u => new { u.UserId, u.LastName, u.Email })
                    .ToListAsync();

                var shaped = items.Select(m => new
                {
                    m.MaterialId,
                    m.Title,
                    FileUrl = m.FileUrl,
                    Description = m.Description,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    m.Status,
                    CreatedBy = m.CreatedBy,
                    UpdatedBy = m.UpdatedBy,
                    m.SubjectId,
                    m.SubjectCode,
                    m.SubjectName,
                    CreatorName = m.CreatedBy != null ? users.FirstOrDefault(u => u.UserId == m.CreatedBy!.Value)?.LastName : null,
                    CreatorEmail = m.CreatedBy != null ? users.FirstOrDefault(u => u.UserId == m.CreatedBy!.Value)?.Email : null
                });

                return Ok(new { code = 200, total, page = p, pageSize = ps, items = shaped });
            }

            // Legacy: return full array (no paging)
            var materials = await materialsQuery
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.MaterialId,
                    m.Title,
                    FileUrl = m.FileUrl,
                    Description = m.Description,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    m.Status,
                    CreatedBy = m.CreatedBy,
                    UpdatedBy = m.UpdatedBy,
                    m.SubjectId,
                    SubjectCode = m.Subject.SubjectCode,
                    SubjectName = m.Subject.SubjectName
                })
                .ToListAsync();

            var allCreatorIds = materials.Where(x => x.CreatedBy != null).Select(x => x.CreatedBy!.Value).Distinct().ToList();
            var allUsers = await _db.Users
                .Where(u => allCreatorIds.Contains(u.UserId))
                .Select(u => new { u.UserId, u.LastName, u.Email })
                .ToListAsync();

            var result = materials.Select(m => new
            {
                m.MaterialId,
                m.Title,
                FileUrl = m.FileUrl,
                Description = m.Description,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                m.Status,
                CreatedBy = m.CreatedBy,
                UpdatedBy = m.UpdatedBy,
                m.SubjectId,
                m.SubjectCode,
                m.SubjectName,
                CreatorName = m.CreatedBy != null ? allUsers.FirstOrDefault(u => u.UserId == m.CreatedBy!.Value)?.LastName : null,
                CreatorEmail = m.CreatedBy != null ? allUsers.FirstOrDefault(u => u.UserId == m.CreatedBy!.Value)?.Email : null
            }).ToList();

            return Ok(new { code = 200, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // GET: api/materials/counts
    [AllowAnonymous]
    [HttpGet("counts")]
    public async Task<IActionResult> GetMaterialsCounts([FromQuery] string? subjectCodes = null, [FromQuery] string? status = "active")
    {
        try
        {
            var counts = new Dictionary<string, int>();
            
            if (!string.IsNullOrWhiteSpace(subjectCodes))
            {
                var codes = subjectCodes.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(c => c.Trim())
                    .ToList();
                
                foreach (var code in codes)
                {
                    var count = await _db.Materials
                        .AsNoTracking()
                        .Include(m => m.Subject)
                        .CountAsync(m => 
                            (string.IsNullOrWhiteSpace(status) || m.Status == status) && 
                            m.Subject != null && 
                            (m.Subject.SubjectCode == code || m.Subject.SubjectName == code));
                    
                    counts[code] = count;
                }
            }
            
            return Ok(new { code = 200, data = counts });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // GET: api/materials/{id}
    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var material = await _db.Materials
                .AsNoTracking()
                .Include(m => m.Subject)
                .Where(m => m.MaterialId == id)
                .Select(m => new
                {
                    m.MaterialId,
                    m.Title,
                    FileUrl = m.FileUrl,
                    Description = m.Description,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    m.Status,
                    CreatedBy = m.CreatedBy,
                    UpdatedBy = m.UpdatedBy,
                    m.SubjectId,
                    Subject = new
                    {
                        m.Subject.SubjectId,
                        m.Subject.SubjectName,
                        m.Subject.SubjectCode
                    }
                })
                .FirstOrDefaultAsync();

            if (material == null)
                return NotFound(new { code = 404, message = "Material not found" });

            // Load creator information from CreateBy
            var creator = material.CreatedBy != null ? await _db.Users
                .Where(u => u.UserId == material.CreatedBy.Value)
                .Select(u => new { u.UserId, u.LastName, u.Email })
                .FirstOrDefaultAsync() : null;

            var result = new MaterialResponseDto
            {
                MaterialId = material.MaterialId,
                Title = material.Title,
                FileUrl = material.FileUrl,
                Description = material.Description,
                CreatedAt = (material.CreatedAt as DateTime?),
                UpdatedAt = (material.UpdatedAt as DateTime?),
                Status = material.Status,
                CreatedBy = material.CreatedBy,
                UpdatedBy = material.UpdatedBy,
                SubjectId = material.SubjectId,
                Subject = material.Subject,
                Creator = creator
            };

            return Ok(new { code = 200, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // GET: api/materials/{id}/detail
    [AllowAnonymous]
    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        try
        {
            var material = await _db.Materials
                .AsNoTracking()
                .Include(m => m.Subject)
                .Where(m => m.MaterialId == id)
                .Select(m => new
                {
                    m.MaterialId,
                    m.Title,
                    FileUrl = m.FileUrl,
                    Description = m.Description,
                    m.Status,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    CreatedBy = m.CreatedBy,
                    UpdatedBy = m.UpdatedBy,
                    m.SubjectId,
                    Subject = new
                    {
                        m.Subject.SubjectId,
                        m.Subject.SubjectName,
                        m.Subject.SubjectCode
                    }
                })
                .FirstOrDefaultAsync();

            if (material == null)
                return NotFound(new { code = 404, message = "Material not found" });

            // Load creator information from CreateBy
            User? creator = null;
            if (material.CreatedBy != null)
            {
                creator = await _db.Users
                    .Where(u => u.UserId == material.CreatedBy.Value)
                    .Select(u => new User { UserId = u.UserId, LastName = u.LastName, Email = u.Email })
                    .FirstOrDefaultAsync();
            }

            var result = new MaterialResponseDto
            {
                MaterialId = material.MaterialId,
                Title = material.Title,
                FileUrl = material.FileUrl,
                Description = material.Description,
                Status = material.Status,
                CreatedAt = (material.CreatedAt as DateTime?),
                UpdatedAt = (material.UpdatedAt as DateTime?),
                CreatedBy = material.CreatedBy,
                UpdatedBy = material.UpdatedBy,
                SubjectId = material.SubjectId,
                Subject = material.Subject,
                Creator = creator != null ? new
                {
                    creator.UserId,
                    creator.LastName,
                    creator.Email
                } : null
            };

            return Ok(new { code = 200, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // POST: api/materials
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMaterialRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            var material = new Material
            {
                Title = request.Title,
                Description = request.Description,
                FileUrl = request.FileUrl,
                SubjectId = request.SubjectId,
                Status = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status!,
                CreatedBy = currentUserId,
                UpdatedBy = currentUserId
            };

            var created = await _materialService.CreateAsync(material);
            
            // Load Subject and Creator for response
            var createdMaterial = await _db.Materials
                .AsNoTracking()
                .Include(m => m.Subject)
                .Where(m => m.MaterialId == created.MaterialId)
                .Select(m => new
                {
                    m.MaterialId,
                    m.Title,
                    m.FileUrl,
                    m.Description,
                    m.Status,
                    m.CreatedAt,
                    m.UpdatedAt,
                    m.CreatedBy,
                    m.UpdatedBy,
                    m.SubjectId,
                    SubjectCode = m.Subject.SubjectCode,
                    SubjectName = m.Subject.SubjectName
                })
                .FirstOrDefaultAsync();
            
            if (createdMaterial == null)
                return BadRequest(new { code = 400, message = "Failed to retrieve created material" });

            var creator = createdMaterial.CreatedBy != null ? await _db.Users
                .Where(u => u.UserId == createdMaterial.CreatedBy.Value)
                .Select(u => new { u.UserId, u.LastName, u.Email })
                .FirstOrDefaultAsync() : null;

            var responseDto = new
            {
                createdMaterial.MaterialId,
                createdMaterial.Title,
                FileUrl = createdMaterial.FileUrl,
                Description = createdMaterial.Description,
                CreatedAt = createdMaterial.CreatedAt,
                UpdatedAt = createdMaterial.UpdatedAt,
                createdMaterial.Status,
                CreatedBy = createdMaterial.CreatedBy,
                UpdatedBy = createdMaterial.UpdatedBy,
                createdMaterial.SubjectId,
                SubjectCode = createdMaterial.SubjectCode,
                SubjectName = createdMaterial.SubjectName,
                CreatorName = creator?.LastName,
                CreatorEmail = creator?.Email
            };

            return CreatedAtAction(nameof(GetById), new { id = created.MaterialId }, 
                new { code = 201, data = responseDto });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // PUT: api/materials/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMaterialRequest request)
    {
        try
        {
            if (id != request.MaterialId)
                return BadRequest(new { code = 400, message = "Id mismatch" });

            var currentUserId = GetCurrentUserId();
            var existing = await _materialService.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { code = 404, message = "Material not found" });

            existing.Title = request.Title;
            existing.Description = request.Description;
            existing.FileUrl = request.FileUrl;
            existing.SubjectId = request.SubjectId;
            existing.Status = string.IsNullOrWhiteSpace(request.Status) ? existing.Status : request.Status!;
            existing.UpdatedBy = currentUserId;

            var success = await _materialService.UpdateAsync(existing);
            if (!success)
                return NotFound(new { code = 404, message = "Material not found" });

            return Ok(new { code = 200, message = "Updated successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }

    // DELETE: api/materials/{id} (Soft delete)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var material = await _materialService.GetByIdAsync(id);
            if (material == null)
                return NotFound(new { code = 404, message = "Material not found" });

            // Soft delete: set status to inActive (match DB enum)
            material.Status = "inActive";
            material.UpdatedBy = GetCurrentUserId();

            var success = await _materialService.UpdateAsync(material);
            if (!success)
                return NotFound(new { code = 404, message = "Material not found" });

            return Ok(new { code = 200, message = "Material deactivated successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
    }
}