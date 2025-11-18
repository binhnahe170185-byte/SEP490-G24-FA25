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
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
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

    // GET: api/profile
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var userId = GetCurrentUserId();
            var profile = await _profileService.GetProfileAsync(userId);
            
            if (profile == null)
                return NotFound(new { code = 404, message = "Profile not found" });

            return Ok(new { code = 200, message = "Success", data = profile });
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

    // PUT: api/profile
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var success = await _profileService.UpdateProfileAsync(userId, request);
            
            if (!success)
                return NotFound(new { code = 404, message = "Profile not found" });

            // Get updated profile to return
            var updatedProfile = await _profileService.GetProfileAsync(userId);
            
            return Ok(new { code = 200, message = "Profile updated successfully", data = updatedProfile });
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

    // POST: api/profile/avatar
    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile avatar)
    {
        try
        {
            if (avatar == null || avatar.Length == 0)
            {
                return BadRequest(new { code = 400, message = "No file uploaded" });
            }

            var avatarBase64 = await ProcessAvatarToBase64Async(avatar);
            
            return Ok(new { 
                code = 200, 
                message = "Avatar uploaded successfully",
                data = new { avatarUrl = avatarBase64 }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error uploading avatar: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "Error uploading avatar", 
                error = ex.Message 
            });
        }
    }

    // Helper method to resize image and convert to base64
    private async Task<string?> ProcessAvatarToBase64Async(IFormFile? avatarFile)
    {
        if (avatarFile == null || avatarFile.Length == 0)
            return null;

        // Validate file type
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(avatarFile.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File type not supported. Only accepts: {string.Join(", ", allowedExtensions)}");
        }

        // Validate file size (max 5MB)
        const long maxFileSize = 5 * 1024 * 1024; // 5MB
        if (avatarFile.Length > maxFileSize)
        {
            throw new ArgumentException("File size must not exceed 5MB");
        }

        try
        {
            // Read image from stream
            using var imageStream = new MemoryStream();
            await avatarFile.CopyToAsync(imageStream);
            imageStream.Position = 0;

            // Load and resize image
            using var image = await Image.LoadAsync(imageStream);
            
            // Resize to 200x200 (maintain aspect ratio, crop if needed)
            const int maxSize = 200;
            var resizeOptions = new ResizeOptions
            {
                Size = new Size(maxSize, maxSize),
                Mode = ResizeMode.Crop, // Crop to ensure square shape
                Sampler = KnownResamplers.Lanczos3
            };
            
            image.Mutate(x => x.Resize(resizeOptions));

            // Convert to base64
            using var outputStream = new MemoryStream();
            
            // Determine format and encoder
            if (extension == ".png")
            {
                await image.SaveAsync(outputStream, new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression });
            }
            else
            {
                // JPEG for other formats (jpg, jpeg, gif, webp)
                await image.SaveAsync(outputStream, new JpegEncoder { Quality = 85 });
            }

            var imageBytes = outputStream.ToArray();
            var base64String = Convert.ToBase64String(imageBytes);
            
            // Return data URL format: data:image/jpeg;base64,{base64}
            var mimeType = extension == ".png" ? "image/png" : "image/jpeg";
            return $"data:{mimeType};base64,{base64String}";
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Error processing image: {ex.Message}");
        }
    }
}

