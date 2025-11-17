using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

            // Lấy lại profile sau khi update để trả về
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
}

