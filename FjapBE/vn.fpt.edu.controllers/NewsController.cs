using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;

namespace FJAP.Controllers;

[ApiController]
[Route("api/news")]
[Authorize]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
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

        throw new InvalidOperationException($"Cannot resolve current user id from token. value='{userIdClaim}'");
    }

    // Helper method to get current role ID from JWT token
    private int? GetCurrentRoleId()
    {
        var roleIdClaim = User.FindFirstValue("role_id");
        if (int.TryParse(roleIdClaim, out var roleId))
            return roleId;
        return null;
    }

    // POST: api/news
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNewsRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Chỉ Staff (RoleId 6) được tạo news
            if (roleId != 6)
                return StatusCode(403, new { code = 403, message = $"Only Staff can create news. Your roleId: {roleId ?? -1}" });

            var userId = GetCurrentUserId();
            var created = await _newsService.CreateAsync(request, userId);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, 
                new { code = 201, message = "News created successfully", data = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // PUT: api/news/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateNewsRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Cho phép Head (RoleId 2) và Staff (RoleId 6) được sửa news
            if (roleId != 2 && roleId != 6)
                return StatusCode(403, new { code = 403, message = $"Only Head or Staff can update news. Your roleId: {roleId ?? -1}" });

            var userId = GetCurrentUserId();
            var success = await _newsService.UpdateAsync(id, request, userId, roleId);
            if (!success)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "News updated successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating news: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner stack trace: {ex.InnerException.StackTrace}");
            }
            return StatusCode(500, new { 
                code = 500, 
                message = "Internal server error", 
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }

    // POST: api/news/{id}/submit
    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> SubmitForReview(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Chỉ Staff (RoleId 6) được gửi duyệt
            if (roleId != 6)
                return StatusCode(403, new { code = 403, message = "Only Staff can submit news for review" });

            var userId = GetCurrentUserId();
            var success = await _newsService.SubmitForReviewAsync(id, userId);
            if (!success)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "News submitted for review successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/news/{id}/approve
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Chỉ Head (RoleId 2) được duyệt
            if (roleId != 2)
                return StatusCode(403, new { code = 403, message = "Only Head can approve news" });

            var userId = GetCurrentUserId();
            var success = await _newsService.ApproveAsync(id, userId);
            if (!success)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "News approved and published successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/news/{id}/reject
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectNewsRequest request)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Chỉ Head (RoleId 2) được từ chối
            if (roleId != 2)
                return StatusCode(403, new { code = 403, message = "Only Head can reject news" });

            var userId = GetCurrentUserId();
            var success = await _newsService.RejectAsync(id, request.ReviewComment, userId);
            if (!success)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "News rejected successfully" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // DELETE: api/news/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Cho phép Head (RoleId 2) và Staff (RoleId 6) được xóa news
            if (roleId != 2 && roleId != 6)
                return StatusCode(403, new { code = 403, message = $"Only Head or Staff can delete news. Your roleId: {roleId ?? -1}" });

            var userId = GetCurrentUserId();
            var success = await _newsService.DeleteAsync(id, userId, roleId);
            if (!success)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "News deleted successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/news
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
    {
        try
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 100) pageSize = 20;

            var userId = GetCurrentUserId();
            var roleId = GetCurrentRoleId();

            var (items, total) = await _newsService.GetAllAsync(userId, roleId, status, page, pageSize);

            return Ok(new { code = 200, message = "Success", total, page, pageSize, data = items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // GET: api/news/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var roleId = GetCurrentRoleId();

            var news = await _newsService.GetByIdAsync(id, userId, roleId);
            if (news == null)
                return NotFound(new { code = 404, message = "News not found" });

            return Ok(new { code = 200, message = "Success", data = news });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    // POST: api/news/image
    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile image)
    {
        try
        {
            var roleId = GetCurrentRoleId();
            // Cho phép Head (RoleId 2) và Staff (RoleId 6) được upload ảnh
            if (roleId != 2 && roleId != 6)
                return StatusCode(403, new { code = 403, message = $"Only Head or Staff can upload news images. Your roleId: {roleId ?? -1}" });

            if (image == null || image.Length == 0)
            {
                return BadRequest(new { code = 400, message = "No file uploaded" });
            }

            var imageBase64 = await ProcessNewsImageToBase64Async(image);
            
            return Ok(new { 
                code = 200, 
                message = "Image uploaded successfully",
                data = new { imageUrl = imageBase64 }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error uploading news image: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "Error uploading image", 
                error = ex.Message 
            });
        }
    }

    // Helper method to process news image and convert to base64
    private async Task<string?> ProcessNewsImageToBase64Async(IFormFile? imageFile)
    {
        if (imageFile == null || imageFile.Length == 0)
            return null;

        // Validate file type
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(imageFile.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File type not supported. Only accepts: {string.Join(", ", allowedExtensions)}");
        }

        // Validate file size (max 5MB for news images)
        const long maxFileSize = 5 * 1024 * 1024; // 5MB
        if (imageFile.Length > maxFileSize)
        {
            throw new ArgumentException("File size must not exceed 5MB");
        }

        try
        {
            // Read image from stream
            using var imageStream = new MemoryStream();
            await imageFile.CopyToAsync(imageStream);
            imageStream.Position = 0;

            // Load image
            using var image = await Image.LoadAsync(imageStream);
            
            // Resize if too large (max width 800px, maintain aspect ratio)
            const int maxWidth = 800;
            if (image.Width > maxWidth)
            {
                var ratio = (double)maxWidth / image.Width;
                var newHeight = (int)(image.Height * ratio);
                
                var resizeOptions = new ResizeOptions
                {
                    Size = new Size(maxWidth, newHeight),
                    Mode = ResizeMode.Max, // Maintain aspect ratio
                    Sampler = KnownResamplers.Lanczos3
                };
                
                image.Mutate(x => x.Resize(resizeOptions));
            }

            // Convert to base64
            using var outputStream = new MemoryStream();
            
            // Determine format and encoder
            if (extension == ".png")
            {
                await image.SaveAsync(outputStream, new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression });
            }
            else if (extension == ".gif")
            {
                // Keep GIF as is (no conversion)
                imageStream.Position = 0;
                await imageStream.CopyToAsync(outputStream);
            }
            else
            {
                // JPEG for jpg, jpeg, webp
                await image.SaveAsync(outputStream, new JpegEncoder { Quality = 70 });
            }

            var imageBytes = outputStream.ToArray();
            var base64String = Convert.ToBase64String(imageBytes);
            
            // Return data URL format: data:image/{type};base64,{base64}
            string mimeType;
            if (extension == ".png")
                mimeType = "image/png";
            else if (extension == ".gif")
                mimeType = "image/gif";
            else
                mimeType = "image/jpeg";
            
            return $"data:{mimeType};base64,{base64String}";
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Error processing image: {ex.Message}");
        }
    }
}

