using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StaffOfAdminController : ControllerBase
{
    private readonly IStaffOfAdminService _adminService;
    private readonly FjapDbContext _db;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IConfiguration _configuration;
    private static readonly Regex NameRegex = new(@"^[\p{L}\p{M}][\p{L}\p{M}\s\.'-]*$", RegexOptions.Compiled);
    private static readonly Regex PhoneRegex = new(@"^(?:\+?84|0)(?:\d){8,9}$", RegexOptions.Compiled);
    private static readonly string[] AllowedStatuses = new[] { "Active", "Inactive" };

    public StaffOfAdminController(IStaffOfAdminService adminService, FjapDbContext dbContext, IServiceScopeFactory serviceScopeFactory, IConfiguration configuration)
    {
        _adminService = adminService;
        _db = dbContext;
        _serviceScopeFactory = serviceScopeFactory;
        _configuration = configuration;
    }

    // Helper method để resize ảnh và convert sang base64
    private async Task<string?> ProcessAvatarToBase64Async(IFormFile? avatarFile)
    {
        if (avatarFile == null || avatarFile.Length == 0)
            return null;

        // Validate file type
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(avatarFile.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File type không được hỗ trợ. Chỉ chấp nhận: {string.Join(", ", allowedExtensions)}");
        }

        // Validate file size (max 5MB)
        const long maxFileSize = 5 * 1024 * 1024; // 5MB
        if (avatarFile.Length > maxFileSize)
        {
            throw new ArgumentException("File size không được vượt quá 5MB");
        }

        try
        {
            // Đọc ảnh từ stream
            using var imageStream = new MemoryStream();
            await avatarFile.CopyToAsync(imageStream);
            imageStream.Position = 0;

            // Load và resize ảnh
            using var image = await Image.LoadAsync(imageStream);
            
            // Resize về 200x200 (giữ tỷ lệ, crop nếu cần)
            const int maxSize = 200;
            var resizeOptions = new ResizeOptions
            {
                Size = new Size(maxSize, maxSize),
                Mode = ResizeMode.Crop, // Crop để đảm bảo hình vuông
                Sampler = KnownResamplers.Lanczos3
            };
            
            image.Mutate(x => x.Resize(resizeOptions));

            // Convert sang base64
            using var outputStream = new MemoryStream();
            
            // Xác định format và encoder
            if (extension == ".png")
            {
                await image.SaveAsync(outputStream, new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression });
            }
            else
            {
                // JPEG cho các format khác (jpg, jpeg, gif, webp)
                await image.SaveAsync(outputStream, new JpegEncoder { Quality = 85 });
            }

            var imageBytes = outputStream.ToArray();
            var base64String = Convert.ToBase64String(imageBytes);
            
            // Trả về data URL format: data:image/jpeg;base64,{base64}
            var mimeType = extension == ".png" ? "image/png" : "image/jpeg";
            return $"data:{mimeType};base64,{base64String}";
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Lỗi khi xử lý ảnh: {ex.Message}");
        }
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
        [FromQuery] int? levelId,
        [FromQuery] int? departmentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var includeLecturers = false;
        if (!string.IsNullOrWhiteSpace(roles))
        {
            includeLecturers = roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(r => int.TryParse(r, out var parsed) ? parsed : (int?)null)
                .Any(id => id == 3);
        }
        else if (role.HasValue)
        {
            includeLecturers = role.Value == 3;
        }

        if (includeLecturers)
        {
            await _adminService.EnsureLecturerEntriesAsync();
        }

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
            join lec in _db.Lectures.AsNoTracking() on u.UserId equals lec.UserId into lecgrp
            from lec in lecgrp.DefaultIfEmpty()
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
                EnrollmentDate = s != null ? (DateOnly?)s.EnrollmentDate : null,
                LecturerId = lec != null ? (int?)lec.LectureId : null,
                LecturerCode = lec != null ? lec.LecturerCode : null
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
        if (levelId is int lid) baseQuery = baseQuery.Where(x => x.LevelId == lid);
        if (departmentId is int did) baseQuery = baseQuery.Where(x => x.DepartmentId == did);

        var total = await baseQuery.CountAsync();

        // Return full list (remove paging as requested)
        var items = await baseQuery
            .OrderByDescending(x => x.UserId)
            .ToListAsync();

        Dictionary<int, Lecture>? lecturerLookup = null;
        var lecturerUserIds = items
            .Where(x => x.RoleId == 3)
            .Select(x => x.UserId)
            .Distinct()
            .ToList();

        if (lecturerUserIds.Count > 0)
        {
            var lookupLecturers = await _db.Lectures
                .AsNoTracking()
                .Where(l => lecturerUserIds.Contains(l.UserId))
                .ToDictionaryAsync(l => l.UserId, l => l);

            lecturerLookup = lookupLecturers;
        }

        var shaped = items.Select(x =>
        {
            Lecture? fallbackLecturer = null;
            if (lecturerLookup != null)
            {
                lecturerLookup.TryGetValue(x.UserId, out fallbackLecturer);
            }

            var rawLecturerCode = fallbackLecturer?.LecturerCode ?? x.LecturerCode;
            var normalizedLecturerCode = string.IsNullOrWhiteSpace(rawLecturerCode)
                ? null
                : rawLecturerCode.Trim().ToUpperInvariant();

            return new
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
            enrollmentDate = x.EnrollmentDate?.ToString("yyyy-MM-dd"),
                lecturerId = fallbackLecturer?.LectureId ?? x.LecturerId,
                lecturerCode = normalizedLecturerCode
            };
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

    // ===================== Upload Avatar =====================
    [HttpPost("users/avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile avatar)
    {
        try
        {
            if (avatar == null || avatar.Length == 0)
            {
                return BadRequest(new { code = 400, message = "Không có file được upload" });
            }

            var avatarBase64 = await ProcessAvatarToBase64Async(avatar);
            
            return Ok(new { 
                code = 200, 
                message = "Upload avatar thành công",
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
                message = "Lỗi khi upload avatar", 
                error = ex.Message 
            });
        }
    }

    // ===================== Create User =====================
    [HttpPost("users")]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest? request)
    {
        try
        {
            // Debug logging
            Console.WriteLine($"=== Create User Request ===");
            Console.WriteLine($"Content-Type: {Request.ContentType}");
            Console.WriteLine($"HasFormContentType: {Request.HasFormContentType}");
            Console.WriteLine($"Request is null: {request == null}");
            
            if (request == null)
            {
                // Try to read raw body for debugging
                Request.EnableBuffering();
                using var reader = new StreamReader(Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
                Console.WriteLine($"Raw request body length: {body.Length}");
                Console.WriteLine($"Raw request body preview (first 500 chars): {body.Substring(0, Math.Min(500, body.Length))}");
                
                // Try to parse manually
                try
                {
                    var jsonOptions = new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                    };
                    jsonOptions.Converters.Add(new FJAP.Infrastructure.JsonConverters.DateOnlyJsonConverter());
                    request = System.Text.Json.JsonSerializer.Deserialize<CreateStaffRequest>(body, jsonOptions);
                    Console.WriteLine($"Manual parse successful: {request != null}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Manual parse failed: {ex.Message}");
                }
                
                if (request == null)
                {
                    return BadRequest(new { code = 400, message = "Request body không hợp lệ hoặc không đúng format" });
                }
            }
            
            Console.WriteLine($"Request data - FirstName: {request.FirstName}, Email: {request.Email}, RoleId: {request.RoleId}, Dob: {request.Dob}");

            // Avatar đã được frontend convert sang base64 và gửi trong request.Avatar
            // Không cần xử lý file upload ở đây, chỉ lưu base64 string vào DB
            string? avatarBase64 = string.IsNullOrWhiteSpace(request.Avatar) ? null : request.Avatar;

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

            var customErrors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            void AddError(string field, string message)
            {
                if (!customErrors.TryGetValue(field, out var fieldErrors))
                {
                    fieldErrors = new List<string>();
                    customErrors[field] = fieldErrors;
                }
                fieldErrors.Add(message);
            }

            var firstName = request.FirstName?.Trim();
            if (string.IsNullOrWhiteSpace(firstName))
            {
                AddError("firstName", "First name is required");
            }
            else
            {
                if (firstName.Length < 2 || firstName.Length > 50)
                    AddError("firstName", "First name must be between 2 and 50 characters");
                if (!NameRegex.IsMatch(firstName))
                    AddError("firstName", "First name contains invalid characters");
            }

            var lastName = request.LastName?.Trim();
            if (string.IsNullOrWhiteSpace(lastName))
            {
                AddError("lastName", "Last name is required");
            }
            else
            {
                if (lastName.Length < 2 || lastName.Length > 50)
                    AddError("lastName", "Last name must be between 2 and 50 characters");
                if (!NameRegex.IsMatch(lastName))
                    AddError("lastName", "Last name contains invalid characters");
            }

            var emailTrimmed = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(emailTrimmed))
            {
                AddError("email", "Email is required");
            }
            else if (emailTrimmed.Length > 150)
            {
                AddError("email", "Email must not exceed 150 characters");
            }

            string? normalizedPhone = null;
            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                AddError("phoneNumber", "Phone number is required");
            }
            else
            {
                var phoneCandidate = Regex.Replace(request.PhoneNumber, @"[\s\-]", "");
                if (!PhoneRegex.IsMatch(phoneCandidate))
                {
                    AddError("phoneNumber", "Phone number must start with 0 or +84 and contain 10-11 digits");
                }
                else
                {
                    normalizedPhone = phoneCandidate;
                }
            }

            var normalizedAddress = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
            if (normalizedAddress != null && normalizedAddress.Length > 200)
            {
                AddError("address", "Address must not exceed 200 characters");
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            if (request.Dob > today)
            {
                AddError("dob", "Date of birth cannot be in the future");
            }
            else
            {
                var age = today.Year - request.Dob.Year;
                if (request.Dob > today.AddYears(-age)) age--;
                if (age < 18 || age > 65)
                {
                    AddError("dob", "Staff age must be between 18 and 65");
                }
            }

            var statusCandidate = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim();
            var matchedStatus = AllowedStatuses.FirstOrDefault(s => s.Equals(statusCandidate, StringComparison.OrdinalIgnoreCase));
            if (matchedStatus == null)
            {
                AddError("status", "Status must be Active or Inactive");
            }
            else
            {
                statusCandidate = matchedStatus;
            }

            if (customErrors.Count > 0)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = "Validation failed",
                    errors = customErrors
                });
            }

            var normalizedFirstName = firstName!;
            var normalizedLastName = lastName!;
            var normalizedEmail = emailTrimmed!.ToLower();
            var normalizedStatus = statusCandidate;

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
            var emailNormalized = normalizedEmail;
            var existingEmail = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email.ToLower().Trim() == emailNormalized);
            
            if (existingEmail != null)
            {
                return BadRequest(new { code = 400, message = "Email already exists in the system" });
            }

            // Check phone uniqueness (if provided and not empty)
            if (!string.IsNullOrWhiteSpace(normalizedPhone))
            {
                var existingPhone = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.PhoneNumber != null && u.PhoneNumber.Trim() == normalizedPhone);
                
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
            request.Gender = string.IsNullOrWhiteSpace(request.Gender) ? "Other" : request.Gender.Trim();
            if (!validGenders.Contains(request.Gender))
                request.Gender = "Other";

            // Map DTO to User entity
            var user = new User
            {
                FirstName = normalizedFirstName,
                LastName = normalizedLastName,
                Email = normalizedEmail,
                PhoneNumber = normalizedPhone ?? "",
                Gender = request.Gender,
                Dob = request.Dob,
                Address = normalizedAddress ?? "",
                Avatar = avatarBase64,
                RoleId = request.RoleId,
                DepartmentId = request.DepartmentId,
                Status = normalizedStatus
            };

            var created = await _adminService.CreateAsync(user);

            object? lecturerData = created.Lectures
                .Select(l => new
                {
                    lecturerId = l.LectureId,
                    lecturerCode = l.LecturerCode
                })
                .FirstOrDefault();
            
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
                status = created.Status,
                lecturer = lecturerData
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

    // ===================== Upload Avatar for Student =====================
    [HttpPost("users/student/avatar")]
    public async Task<IActionResult> UploadStudentAvatar(IFormFile avatar)
    {
        try
        {
            if (avatar == null || avatar.Length == 0)
            {
                return BadRequest(new { code = 400, message = "Không có file được upload" });
            }

            var avatarBase64 = await ProcessAvatarToBase64Async(avatar);
            
            return Ok(new { 
                code = 200, 
                message = "Upload avatar thành công",
                data = new { avatarUrl = avatarBase64 }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error uploading student avatar: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "Lỗi khi upload avatar", 
                error = ex.Message 
            });
        }
    }

    /// <summary>
    /// Create a student: insert User(role=4) and Student with auto semester (based on current date)
    /// </summary>
    [HttpPost("users/student")]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Validation failed" });
        }

        // Basic normalize
        var email = request.Email.Trim().ToLower();
        var phone = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        var address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        var gender = new[] { "Male", "Female", "Other" }.Contains(request.Gender) ? request.Gender : "Other";

        // Uniqueness checks
        var emailExists = await _db.Users.AsNoTracking().AnyAsync(u => u.Email.ToLower() == email);
        if (emailExists) return BadRequest(new { code = 400, message = "Email already exists in the system" });
        if (!string.IsNullOrWhiteSpace(phone))
        {
            var phoneExists = await _db.Users.AsNoTracking().AnyAsync(u => u.PhoneNumber != null && u.PhoneNumber.Trim() == phone);
            if (phoneExists) return BadRequest(new { code = 400, message = "Phone number already exists in the system" });
        }

        // Validate level
        var level = await _db.Levels.AsNoTracking().FirstOrDefaultAsync(l => l.LevelId == request.LevelId);
        if (level == null) return BadRequest(new { code = 400, message = "Level does not exist" });

        // Create User (role 4 - Student)
        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PhoneNumber = phone ?? "",
            Gender = gender,
            Dob = request.Dob,
            Address = address ?? "",
            Avatar = request.Avatar,
            RoleId = 4,
            DepartmentId = null,
            Status = "Active"
        };

        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        // Determine semester based on current date (first semester with startDate >= today; otherwise latest)
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var semester = await _db.Semesters.AsNoTracking()
            .OrderBy(s => s.StartDate)
            .FirstOrDefaultAsync(s => s.StartDate >= today);
        if (semester == null)
        {
            semester = await _db.Semesters.AsNoTracking().OrderByDescending(s => s.StartDate).FirstOrDefaultAsync();
        }

        Console.WriteLine($"=== Student Creation Debug ===");
        Console.WriteLine($"Today: {today}");
        Console.WriteLine($"Semester found: {(semester != null ? $"Yes - ID: {semester.SemesterId}, Name: {semester.Name}, Code: {semester.SemesterCode}" : "No - No semester found in database")}");

        // Generate student code if missing: {SemesterCode}{LevelCode}{Sequence}
        string levelCode = ExtractLevelCode(level.LevelName);
        string semesterCode = semester?.SemesterCode ?? "";
        string studentCode = request.StudentCode?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(studentCode) && !string.IsNullOrWhiteSpace(semesterCode) && !string.IsNullOrWhiteSpace(levelCode))
        {
            var prefix = $"{semesterCode}{levelCode}".ToUpper();
            var existingCodes = await _db.Students.AsNoTracking()
                .Where(s => s.StudentCode != null && s.StudentCode.ToUpper().StartsWith(prefix))
                .Select(s => s.StudentCode)
                .ToListAsync();

            var maxSeq = 0;
            foreach (var code in existingCodes)
            {
                if (code != null && code.ToUpper().StartsWith(prefix))
                {
                    var numStr = code.ToUpper().Substring(prefix.Length);
                    if (int.TryParse(numStr, out int num) && num > maxSeq) maxSeq = num;
                }
            }
            studentCode = $"{prefix}{(maxSeq + 1).ToString().PadLeft(3, '0')}";
        }

        // Create Student
        var student = new Student
        {
            UserId = user.UserId,
            LevelId = request.LevelId,
            SemesterId = semester?.SemesterId,
            StudentCode = string.IsNullOrWhiteSpace(studentCode) ? null : studentCode,
            Status = "Active",
            EnrollmentDate = DateOnly.FromDateTime(DateTime.UtcNow.Date)
        };

        Console.WriteLine($"Creating student with: UserId={student.UserId}, LevelId={student.LevelId}, SemesterId={student.SemesterId}, StudentCode={student.StudentCode}");

        await _db.Students.AddAsync(student);
        await _db.SaveChangesAsync();

        Console.WriteLine($"Student created successfully with ID: {student.StudentId}, SemesterId: {student.SemesterId}");

        // Gửi email chào mừng sau khi tạo student thành công
        try
        {
            Console.WriteLine($"=== Setting up welcome email for student: {user.Email} ===");
            var frontendOrigins = _configuration.GetSection("Frontend:Origins").Get<string[]>();
            var loginUrl = frontendOrigins != null && frontendOrigins.Length > 0
                ? $"{frontendOrigins[0]}/login"
                : "http://localhost:3000/login";

            Console.WriteLine($"Login URL: {loginUrl}");

            // Gửi email bất đồng bộ, không chờ kết quả để không làm chậm response
            _ = Task.Run(async () =>
            {
                try
                {
                    Console.WriteLine($"Starting email send task for {user.Email}");
                    using var scope = _serviceScopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    await emailService.SendWelcomeEmailAsync(
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        loginUrl
                    );
                    Console.WriteLine($"Email send task completed for {user.Email}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error sending welcome email to {user.Email}: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error setting up welcome email for {user.Email}: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }

        return Created($"/api/Students/{student.StudentId}", new
        {
            code = 201,
            data = new
            {
                userId = user.UserId,
                studentId = student.StudentId,
                studentCode = student.StudentCode,
                semesterId = student.SemesterId,
                levelId = student.LevelId
            }
        });
    }

    private static string ExtractLevelCode(string levelName)
    {
        if (string.IsNullOrWhiteSpace(levelName)) return string.Empty;
        var match = System.Text.RegularExpressions.Regex.Match(levelName, @"N\d+", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (match.Success) return match.Value.ToUpper();
        var cleaned = System.Text.RegularExpressions.Regex.Replace(levelName, @"^level\s*", string.Empty, System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
        return cleaned.ToUpper();
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

    // ===================== Test Email Service =====================
    [HttpPost("test-email")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request)
    {
        try
        {
            Console.WriteLine($"=== Test Email Request ===");
            Console.WriteLine($"To: {request.Email}");
            
            var frontendOrigins = _configuration.GetSection("Frontend:Origins").Get<string[]>();
            var loginUrl = frontendOrigins != null && frontendOrigins.Length > 0
                ? $"{frontendOrigins[0]}/login"
                : "http://localhost:3000/login";

            using var scope = _serviceScopeFactory.CreateScope();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            
            await emailService.SendWelcomeEmailAsync(
                request.Email,
                request.FirstName ?? "Test",
                request.LastName ?? "User",
                loginUrl
            );

            return Ok(new { code = 200, message = "Test email sent successfully. Check your inbox and backend console for logs." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Test email error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { code = 500, message = "Error sending test email", error = ex.Message });
        }
    }

    public record TestEmailRequest(string Email, string? FirstName, string? LastName);

    // ===================== Rooms (list) =====================
    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 500) pageSize = 100;

        try
        {
            var baseQuery = _db.Rooms.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                baseQuery = baseQuery.Where(x => x.RoomName.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                baseQuery = baseQuery.Where(x => x.Status.ToLower() == status.ToLower());
            }

            var total = await baseQuery.CountAsync();

            var rooms = await baseQuery
                .OrderBy(x => x.RoomName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = rooms.Select(x => new
            {
                roomId = x.RoomId,
                roomName = x.RoomName,
                status = x.Status
            }).ToList();

            return Ok(new { total, items });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetRooms: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "An error occurred while fetching rooms", error = ex.Message });
        }
    }

    // ===================== Room (detail) =====================
    [HttpGet("rooms/{id:int}")]
    public async Task<IActionResult> GetRoomById(int id)
    {
        try
        {
            var room = await _db.Rooms
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RoomId == id);

            if (room == null)
            {
                return NotFound(new { code = 404, message = "Room not found" });
            }

            return Ok(new
            {
                code = 200,
                data = new
                {
                    roomId = room.RoomId,
                    roomName = room.RoomName,
                    status = room.Status
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetRoomById: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "An error occurred while fetching room", error = ex.Message });
        }
    }

    // ===================== Room (create) =====================
    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        try
        {
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

            // Validate room name is not empty
            if (string.IsNullOrWhiteSpace(request.RoomName))
            {
                return BadRequest(new { code = 400, message = "Room name is required" });
            }

            // Check if room name already exists
            var roomNameNormalized = request.RoomName.Trim();
            var existingRoom = await _db.Rooms
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RoomName.Trim() == roomNameNormalized);
            
            if (existingRoom != null)
            {
                return BadRequest(new { code = 400, message = "Room name already exists" });
            }

            // Validate status
            var validStatuses = new[] { "Active", "Inactive", "Maintenance" };
            var status = string.IsNullOrWhiteSpace(request.Status) 
                ? "Active" 
                : (validStatuses.Contains(request.Status) ? request.Status : "Active");

            var room = new Room
            {
                RoomName = roomNameNormalized,
                Status = status
            };

            await _db.Rooms.AddAsync(room);
            await _db.SaveChangesAsync();

            var responseData = new
            {
                roomId = room.RoomId,
                roomName = room.RoomName,
                status = room.Status
            };
            
            return CreatedAtAction(nameof(GetRoomById), new { id = room.RoomId }, new { code = 201, data = responseData });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating room: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "An error occurred while creating the room", 
                error = ex.Message
            });
        }
    }

    // ===================== Room (update) =====================
    [HttpPut("rooms/{id:int}")]
    public async Task<IActionResult> UpdateRoom(int id, [FromBody] UpdateRoomRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { code = 400, message = "Validation failed" });
            }

            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomId == id);
            if (room == null)
            {
                return NotFound(new { code = 404, message = "Room not found" });
            }

            // Validate room name is not empty
            if (string.IsNullOrWhiteSpace(request.RoomName))
            {
                return BadRequest(new { code = 400, message = "Room name is required" });
            }

            // Check if room name already exists (excluding current room)
            var roomNameNormalized = request.RoomName.Trim();
            var existingRoom = await _db.Rooms
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RoomId != id && r.RoomName.Trim() == roomNameNormalized);
            
            if (existingRoom != null)
            {
                return BadRequest(new { code = 400, message = "Room name already exists" });
            }

            // Update room
            room.RoomName = roomNameNormalized;
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var validStatuses = new[] { "Active", "Inactive", "Maintenance" };
                if (validStatuses.Contains(request.Status))
                {
                    room.Status = request.Status;
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                code = 200,
                data = new
                {
                    roomId = room.RoomId,
                    roomName = room.RoomName,
                    status = room.Status
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating room: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "An error occurred while updating the room", 
                error = ex.Message
            });
        }
    }

    // ===================== Room (update status) =====================
    [HttpPatch("rooms/{id:int}/status")]
    public async Task<IActionResult> UpdateRoomStatus(int id, [FromBody] UpdateRoomStatusRequest request)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomId == id);
            if (room == null)
            {
                return NotFound(new { code = 404, message = "Room not found" });
            }

            var validStatuses = new[] { "Active", "Inactive", "Maintenance" };
            if (string.IsNullOrWhiteSpace(request.Status) || !validStatuses.Contains(request.Status))
            {
                return BadRequest(new { code = 400, message = "Invalid status. Valid values: Active, Inactive, Maintenance" });
            }

            room.Status = request.Status;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                code = 200,
                data = new
                {
                    roomId = room.RoomId,
                    roomName = room.RoomName,
                    status = room.Status
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating room status: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "An error occurred while updating the room status", 
                error = ex.Message
            });
        }
    }

    // ===================== Room (delete) =====================
    [HttpDelete("rooms/{id:int}")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Lessons)
                .FirstOrDefaultAsync(r => r.RoomId == id);
            
            if (room == null)
            {
                return NotFound(new { code = 404, message = "Room not found" });
            }

            // Check if room has associated lessons
            if (room.Lessons != null && room.Lessons.Any())
            {
                return BadRequest(new { code = 400, message = "Cannot delete room that has associated lessons" });
            }

            _db.Rooms.Remove(room);
            await _db.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting room: {ex.Message}");
            return StatusCode(500, new { 
                code = 500, 
                message = "An error occurred while deleting the room", 
                error = ex.Message
            });
        }
    }

}
