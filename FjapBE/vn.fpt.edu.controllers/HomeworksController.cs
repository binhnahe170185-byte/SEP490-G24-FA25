using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HomeworksController : ControllerBase
{
    private readonly FjapDbContext _db;
    private readonly ILogger<HomeworksController> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly INotificationService _notificationService;

    // File upload validation constants
    private const long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static readonly string[] ALLOWED_EXTENSIONS = { 
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".txt", ".zip", ".rar", ".7z",
        ".jpg", ".jpeg", ".png", ".gif", ".bmp",
        ".mp4", ".avi", ".mov", ".wmv"
    };

    // Input validation constants
    private const int MAX_TITLE_LENGTH = 255;
    private const int MAX_CONTENT_LENGTH = 10000;

    public HomeworksController(
        FjapDbContext db,
        ILogger<HomeworksController> logger,
        IWebHostEnvironment env,
        INotificationService notificationService)
    {
        _db = db;
        _logger = logger;
        _env = env;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetHomeworks(
        [FromQuery] int? lessonId = null,
        [FromQuery] int? classId = null,
        [FromQuery] int? studentId = null)
    {
        var query = BuildHomeworkQuery();
        
        _logger.LogInformation("GetHomeworks called with: lessonId={LessonId}, classId={ClassId}, studentId={StudentId}", 
            lessonId, classId, studentId);

        bool hasFilter = false;

        if (lessonId.HasValue)
        {
            query = query.Where(h => h.LessonId == lessonId);
            hasFilter = true;
        }

        if (classId.HasValue)
        {
            query = query.Where(h => h.Lesson.ClassId == classId);
            hasFilter = true;
        }
        
        // Always filter by student if provided
        if (studentId.HasValue)
        {
            // Chỉ lấy homework của các lớp mà student tham gia.
            query = query.Where(h => h.Lesson.Class.Students.Any(s => s.StudentId == studentId));
            hasFilter = true;
        }

        if (!hasFilter)
        {
            // Safety: Do not return all homeworks if no filter is provided
            return Ok(new { code = 200, data = new List<object>() });
        }

        var data = await ProjectHomeworkList(query, studentId);
        return Ok(new { code = 200, data });
    }

    [HttpPost]
    public async Task<IActionResult> CreateHomework([FromForm] HomeworkCreateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid payload", errors = ModelState });
        }

        // Validate and sanitize title
        var titleValidation = ValidateInputLength(request.Title, MAX_TITLE_LENGTH, "Title");
        if (!titleValidation.isValid)
        {
            return BadRequest(new { code = 400, message = titleValidation.errorMessage });
        }

        var sanitizedTitle = SanitizeInput(request.Title);
        if (string.IsNullOrWhiteSpace(sanitizedTitle))
        {
            return BadRequest(new { code = 400, message = "Title cannot be empty or contain only invalid characters." });
        }

        // Validate and sanitize content
        var contentValidation = ValidateInputLength(request.Content, MAX_CONTENT_LENGTH, "Content");
        if (!contentValidation.isValid)
        {
            return BadRequest(new { code = 400, message = contentValidation.errorMessage });
        }

        var sanitizedContent = SanitizeInput(request.Content);

        // Validate file if provided
        var fileValidation = ValidateFile(request.File);
        if (!fileValidation.isValid)
        {
            return BadRequest(new { code = 400, message = fileValidation.errorMessage });
        }

        // Validate deadline is not in the past
        if (request.Deadline.HasValue)
        {
            // Use UtcDateTime for absolute time comparison regardless of timezone
            if (request.Deadline.Value.UtcDateTime < DateTime.UtcNow)
            {
                return BadRequest(new { code = 400, message = "Deadline cannot be in the past." });
            }
        }

        var lesson = await _db.Lessons
            .Include(l => l.Class)
                .ThenInclude(c => c.Students)
            .FirstOrDefaultAsync(l => l.LessonId == request.LessonId);

        if (lesson == null)
        {
            return NotFound(new { code = 404, message = $"Lesson {request.LessonId} not found" });
        }

        var homework = new Homework
        {
            LessonId = request.LessonId,
            Title = sanitizedTitle,
            Content = sanitizedContent,
            // Store the "Clock Time" (nominal time) that the user selected.
            // .DateTime property of DateTimeOffset returns the local date time part without converting.
            // E.g. 10:00+07:00 -> 10:00
            Deadline = request.Deadline?.DateTime,
            CreatedBy = request.CreatedBy ?? 0,
            CreatedAt = DateTime.UtcNow,
        };

        if (request.File != null)
        {
            homework.FilePath = await SaveAttachmentAsync(request.File);
        }
        else if (!string.IsNullOrWhiteSpace(request.FilePath))
        {
            homework.FilePath = request.FilePath.Trim();
        }

        _db.Homeworks.Add(homework);
        await _db.SaveChangesAsync();

        // Gửi notification cho tất cả students trong class
        await SendHomeworkCreatedNotificationsAsync(homework, lesson);

        var dto = await ProjectHomework(homework.HomeworkId);
        return Ok(new { code = 200, message = "Homework created", data = dto });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateHomework(int id, [FromForm] HomeworkUpdateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid payload", errors = ModelState });
        }

        var homework = await _db.Homeworks.FirstOrDefaultAsync(h => h.HomeworkId == id);
        if (homework == null)
        {
            return NotFound(new { code = 404, message = "Homework not found" });
        }

        // Validate and sanitize title if provided
        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            var titleValidation = ValidateInputLength(request.Title, MAX_TITLE_LENGTH, "Title");
            if (!titleValidation.isValid)
            {
                return BadRequest(new { code = 400, message = titleValidation.errorMessage });
            }

            var sanitizedTitle = SanitizeInput(request.Title);
            if (string.IsNullOrWhiteSpace(sanitizedTitle))
            {
                return BadRequest(new { code = 400, message = "Title cannot be empty or contain only invalid characters." });
            }
            homework.Title = sanitizedTitle;
        }

        // Validate and sanitize content if provided
        if (request.Content != null)
        {
            var contentValidation = ValidateInputLength(request.Content, MAX_CONTENT_LENGTH, "Content");
            if (!contentValidation.isValid)
            {
                return BadRequest(new { code = 400, message = contentValidation.errorMessage });
            }
            homework.Content = SanitizeInput(request.Content);
        }

        // Validate deadline is not in the past
        if (request.Deadline.HasValue)
        {
            if (request.Deadline.Value.UtcDateTime < DateTime.UtcNow)
            {
                return BadRequest(new { code = 400, message = "Deadline cannot be in the past." });
            }
        }
        // Store the "Clock Time" (nominal time)
        homework.Deadline = request.Deadline?.DateTime;

        // Validate file if provided
        var fileValidation = ValidateFile(request.File);
        if (!fileValidation.isValid)
        {
            return BadRequest(new { code = 400, message = fileValidation.errorMessage });
        }

        if (request.RemoveFile && !string.IsNullOrEmpty(homework.FilePath))
        {
            DeleteAttachment(homework.FilePath);
            homework.FilePath = null;
        }

        if (request.File != null)
        {
            if (!string.IsNullOrEmpty(homework.FilePath))
            {
                DeleteAttachment(homework.FilePath);
            }
            homework.FilePath = await SaveAttachmentAsync(request.File);
        }
        else if (!request.RemoveFile && !string.IsNullOrWhiteSpace(request.FilePath))
        {
            homework.FilePath = request.FilePath.Trim();
        }

        await _db.SaveChangesAsync();

        var dto = await ProjectHomework(homework.HomeworkId);
        return Ok(new { code = 200, message = "Homework updated", data = dto });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteHomework(int id)
    {
        var homework = await _db.Homeworks.FirstOrDefaultAsync(h => h.HomeworkId == id);
        if (homework == null)
        {
            return NotFound(new { code = 404, message = "Homework not found" });
        }

        _db.Homeworks.Remove(homework);
        await _db.SaveChangesAsync();

        return Ok(new { code = 200, message = "Homework deleted" });
    }

    /// <summary>
    /// Get all submissions for a homework
    /// GET: api/Homeworks/{homeworkId}/submissions
    /// </summary>
    [HttpGet("{homeworkId:int}/submissions")]
    public async Task<IActionResult> GetSubmissions(int homeworkId, [FromQuery] int? studentId = null)
    {
        var homeworkExists = await _db.Homeworks.AnyAsync(h => h.HomeworkId == homeworkId);
        if (!homeworkExists)
        {
            return NotFound(new { code = 404, message = "Homework not found" });
        }

        var submissionsQuery = _db.HomeworkSubmissions
            .AsNoTracking()
            .Include(s => s.Student)
                .ThenInclude(st => st.User)
            .Where(s => s.HomeworkId == homeworkId);

        if (studentId.HasValue)
        {
            submissionsQuery = submissionsQuery.Where(s => s.StudentId == studentId.Value);
        }

        var submissions = await submissionsQuery
            .OrderByDescending(s => s.CreatedAt ?? DateTime.MinValue)
            .Select(s => new
            {
                submissionId = s.HomeworkSubmissionId,
                homeworkId = s.HomeworkId,
                studentId = s.StudentId,
                studentCode = s.Student.StudentCode,
                studentName = s.Student.User != null
                    ? $"{s.Student.User.FirstName} {s.Student.User.LastName}".Trim()
                    : null,
                submittedAt = s.CreatedAt,
                status = s.Status,
                comment = s.Comment,
                filePath = s.FilePath
            })
            .ToListAsync();

        var result = submissions.Select(sub => new
        {
            sub.submissionId,
            sub.homeworkId,
            sub.studentId,
            sub.studentCode,
            sub.studentName,
            sub.submittedAt,
            sub.status,
            sub.comment,
            filePath = BuildFileUrl(sub.filePath)
        });

        return Ok(new { code = 200, data = result });
    }

    /// <summary>
    /// Create or update a homework submission for the current student
    /// POST: api/Homeworks/{homeworkId}/submissions
    /// </summary>
    [HttpPost("{homeworkId:int}/submissions")]
    public async Task<IActionResult> SubmitHomework(int homeworkId, [FromForm] SubmissionCreateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid payload", errors = ModelState });
        }

        var homework = await _db.Homeworks
            .Include(h => h.Lesson)
                .ThenInclude(l => l.Class)
            .Include(h => h.Lesson)
                .ThenInclude(l => l.Lecture)
                    .ThenInclude(lec => lec.User)
            .FirstOrDefaultAsync(h => h.HomeworkId == homeworkId);

        if (homework == null)
        {
            return NotFound(new { code = 404, message = "Homework not found" });
        }

        var student = await _db.Students
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.StudentId == request.StudentId);

        if (student == null)
        {
            return NotFound(new { code = 404, message = "Student not found" });
        }

        var method = request.Method?.Trim().ToLowerInvariant() ?? "local";
        string? storedPath = null;

        var uploadFiles = new List<IFormFile>();
        if (request.File != null)
        {
            uploadFiles.Add(request.File);
        }
        if (request.Files?.Count > 0)
        {
            uploadFiles.AddRange(request.Files.Where(f => f != null));
        }

        if (uploadFiles.Count > 0)
        {
            storedPath = await SaveAttachmentAsync(uploadFiles.First());
        }
        else if (!string.IsNullOrWhiteSpace(request.FilePath))
        {
            storedPath = request.FilePath.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(request.DriveLink))
        {
            storedPath = request.DriveLink.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(request.DocLink))
        {
            storedPath = request.DocLink.Trim();
        }

        if (storedPath == null && string.IsNullOrWhiteSpace(request.Comment))
        {
            return BadRequest(new { code = 400, message = "Please attach a file, link, or comment" });
        }

        var now = DateTime.UtcNow;
        var submission = await _db.HomeworkSubmissions
            .Include(s => s.Student)
                .ThenInclude(st => st.User)
            .FirstOrDefaultAsync(s =>
                s.HomeworkId == homeworkId && s.StudentId == request.StudentId);

        if (submission == null)
        {
            submission = new HomeworkSubmission
            {
                HomeworkId = homeworkId,
                StudentId = request.StudentId,
                CreatedAt = now,
                Comment = request.Comment?.Trim(),
                Status = "Submitted",
                FilePath = storedPath,
            };
            _db.HomeworkSubmissions.Add(submission);
        }
        else
        {
            submission.Comment = request.Comment?.Trim();
            if (storedPath != null)
            {
                submission.FilePath = storedPath;
            }
            submission.Status = "Submitted";
            submission.CreatedAt = now;
        }

        await _db.SaveChangesAsync();

        // Gửi notification cho giảng viên khi sinh viên submit bài tập
        if (homework.Lesson?.Lecture?.User != null)
        {
            await SendHomeworkSubmissionNotificationAsync(submission, homework, student);
        }

        return Ok(new
        {
            code = 200,
            message = "Submission saved",
            data = new
            {
                submissionId = submission.HomeworkSubmissionId,
                homeworkId = submission.HomeworkId,
                studentId = submission.StudentId,
                studentCode = submission.Student?.StudentCode,
                studentName = submission.Student?.User != null
                    ? $"{submission.Student.User.FirstName} {submission.Student.User.LastName}".Trim()
                    : null,
                submittedAt = submission.CreatedAt,
                status = submission.Status,
                comment = submission.Comment,
                filePath = BuildFileUrl(submission.FilePath)
            }
        });
    }

    /// <summary>
    /// Get all homeworks of a class
    /// GET: api/Classes/{classId}/homeworks
    /// </summary>
    [HttpGet("~/api/Classes/{classId:int}/homeworks")]
    public async Task<IActionResult> GetHomeworksByClass(int classId, [FromQuery] int? studentId = null)
    {
        var classExists = await _db.Classes.AnyAsync(c => c.ClassId == classId);
        if (!classExists)
        {
            return NotFound(new { code = 404, message = "Class not found" });
        }

        var query = BuildHomeworkQuery().Where(h => h.Lesson.ClassId == classId);
        var data = await ProjectHomeworkList(query, studentId);
        return Ok(new { code = 200, data });
    }

    /// <summary>
    /// Update comment/feedback/status for a submission
    /// PUT: api/Homeworks/{homeworkId}/submissions/{submissionId}
    /// </summary>
    [HttpPut("{homeworkId:int}/submissions/{submissionId:int}")]
    public async Task<IActionResult> UpdateSubmission(
        int homeworkId,
        int submissionId,
        [FromBody] UpdateSubmissionRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid payload", errors = ModelState });
        }

        var submission = await _db.HomeworkSubmissions
            .Include(s => s.Student)
                .ThenInclude(st => st.User)
            .Include(s => s.Homework)
            .FirstOrDefaultAsync(s => s.HomeworkSubmissionId == submissionId && s.HomeworkId == homeworkId);

        if (submission == null)
        {
            return NotFound(new { code = 404, message = "Submission not found" });
        }

        var hadCommentBefore = !string.IsNullOrWhiteSpace(submission.Comment);
        var commentChanged = false;

        if (request.Status != null)
        {
            submission.Status = request.Status.Trim();
        }

        if (request.Comment != null)
        {
            var newComment = request.Comment.Trim();
            commentChanged = newComment != submission.Comment;
            submission.Comment = newComment;
        }

        await _db.SaveChangesAsync();

        // Gửi notification cho student khi giảng viên nhận xét (chỉ khi comment mới được thêm hoặc thay đổi)
        if (commentChanged && !string.IsNullOrWhiteSpace(submission.Comment) && submission.Student?.User != null && submission.Homework != null)
        {
            await SendHomeworkCommentNotificationAsync(submission, submission.Homework);
        }

        return Ok(new
        {
            code = 200,
            message = "Submission updated",
            data = new
            {
                submissionId = submission.HomeworkSubmissionId,
                homeworkId = submission.HomeworkId,
                studentId = submission.StudentId,
                studentCode = submission.Student?.StudentCode,
                studentName = submission.Student?.User != null
                    ? $"{submission.Student.User.FirstName} {submission.Student.User.LastName}".Trim()
                    : null,
                submittedAt = submission.CreatedAt,
                status = submission.Status,
                comment = submission.Comment,
                filePath = BuildFileUrl(submission.FilePath)
            }
        });
    }

    private IQueryable<Homework> BuildHomeworkQuery()
    {
        return _db.Homeworks
            .AsNoTracking()
            .Include(h => h.HomeworkSubmissions)
            .Include(h => h.Lesson)
                .ThenInclude(l => l.Class)
                    .ThenInclude(c => c.Students);
    }

    private async Task<IEnumerable<object>> ProjectHomeworkList(IQueryable<Homework> query, int? studentId = null)
    {
        var rows = await query
            .OrderByDescending(h => h.CreatedAt ?? h.Deadline ?? DateTime.MinValue)
            .Select(h => new HomeworkProjection
            {
                HomeworkId = h.HomeworkId,
                LessonId = h.LessonId,
                Title = h.Title,
                Content = h.Content,
                Deadline = h.Deadline,
                FilePath = h.FilePath,
                CreatedBy = h.CreatedBy,
                CreatedAt = h.CreatedAt,
                ClassId = h.Lesson.ClassId,
                ClassName = h.Lesson.Class.ClassName,
                SubmissionCount = h.HomeworkSubmissions.Count,
                StudentCount = h.Lesson.Class.Students.Count,
                StudentSubmission = studentId.HasValue
                    ? h.HomeworkSubmissions
                        .Where(s => s.StudentId == studentId.Value)
                        .OrderByDescending(s => s.CreatedAt ?? DateTime.MinValue)
                        .Select(s => new StudentSubmissionProjection
                        {
                            SubmissionId = s.HomeworkSubmissionId,
                            StudentId = s.StudentId,
                            Status = s.Status,
                            Comment = s.Comment,
                            CreatedAt = s.CreatedAt,
                            FilePath = s.FilePath
                        })
                        .FirstOrDefault()
                    : null
            })
            .ToListAsync();

        return rows.Select(FormatProjection);
    }

    private async Task<object?> ProjectHomework(int homeworkId, int? studentId = null)
    {
        var dto = await BuildHomeworkQuery()
            .Where(h => h.HomeworkId == homeworkId)
            .Select(h => new HomeworkProjection
            {
                HomeworkId = h.HomeworkId,
                LessonId = h.LessonId,
                Title = h.Title,
                Content = h.Content,
                Deadline = h.Deadline,
                FilePath = h.FilePath,
                CreatedBy = h.CreatedBy,
                CreatedAt = h.CreatedAt,
                ClassId = h.Lesson.ClassId,
                ClassName = h.Lesson.Class.ClassName,
                SubmissionCount = h.HomeworkSubmissions.Count,
                StudentCount = h.Lesson.Class.Students.Count,
                StudentSubmission = studentId.HasValue
                    ? h.HomeworkSubmissions
                        .Where(s => s.StudentId == studentId.Value)
                        .OrderByDescending(s => s.CreatedAt ?? DateTime.MinValue)
                        .Select(s => new StudentSubmissionProjection
                        {
                            SubmissionId = s.HomeworkSubmissionId,
                            StudentId = s.StudentId,
                            Status = s.Status,
                            Comment = s.Comment,
                            CreatedAt = s.CreatedAt,
                            FilePath = s.FilePath
                        })
                        .FirstOrDefault()
                    : null
            })
            .FirstOrDefaultAsync();

        return dto == null ? null : FormatProjection(dto);
    }

    private object FormatProjection(HomeworkProjection row)
    {
        return new
        {
            homeworkId = row.HomeworkId,
            lessonId = row.LessonId,
            title = row.Title,
            content = row.Content,
            deadline = row.Deadline,
            filePath = BuildFileUrl(row.FilePath),
            createdBy = row.CreatedBy,
            createdAt = row.CreatedAt,
            classId = row.ClassId,
            className = row.ClassName,
            submissions = row.SubmissionCount,
            totalStudents = row.StudentCount,
            studentSubmission = row.StudentSubmission == null
                ? null
                : new
                {
                    homeworkId = row.HomeworkId,
                    submissionId = row.StudentSubmission.SubmissionId,
                    studentId = row.StudentSubmission.StudentId,
                    submittedAt = row.StudentSubmission.CreatedAt,
                    status = row.StudentSubmission.Status,
                    comment = row.StudentSubmission.Comment,
                    filePath = BuildFileUrl(row.StudentSubmission.FilePath)
                }
        };
    }

    private async Task<string> SaveAttachmentAsync(IFormFile file)
    {
        var uploadsRoot = GetHomeworkUploadPath();

        var fileName = $"{Guid.NewGuid():N}_{SanitizeFileName(file.FileName)}";
        var destination = Path.Combine(uploadsRoot, fileName);

        await using (var stream = new FileStream(destination, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relative = Path.Combine("uploads", "homeworks", fileName)
            .Replace("\\", "/");
        return "/" + relative.TrimStart('/');
    }

    private void DeleteAttachment(string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath)) return;

        try
        {
            var path = storedPath;
            if (path.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                var uri = new Uri(path);
                path = uri.AbsolutePath;
            }

            var webRoot = GetWebRoot();
            path = path.Replace("/", Path.DirectorySeparatorChar.ToString())
                       .TrimStart(Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(webRoot, path);
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete homework attachment at {Path}", storedPath);
        }
    }

    private string? BuildFileUrl(string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath)) return null;
        if (storedPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return storedPath;
        }

        var request = HttpContext?.Request;
        if (request == null)
        {
            return storedPath;
        }

        var prefix = $"{request.Scheme}://{request.Host}";
        var normalized = storedPath.StartsWith("/") ? storedPath : "/" + storedPath;
        return $"{prefix}{normalized}";
    }

    private string GetHomeworkUploadPath()
    {
        var webRoot = GetWebRoot();
        var uploadsPath = Path.Combine(webRoot, "uploads", "homeworks");
        Directory.CreateDirectory(uploadsPath);
        return uploadsPath;
    }

    private string GetWebRoot()
    {
        if (!string.IsNullOrEmpty(_env.WebRootPath))
        {
            Directory.CreateDirectory(_env.WebRootPath);
            return _env.WebRootPath;
        }

        var path = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        Directory.CreateDirectory(path);
        return path;
    }

    private static string SanitizeFileName(string fileName)
    {
        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            fileName = fileName.Replace(invalid, '_');
        }
        return fileName;
    }

    /// <summary>
    /// Validate file upload (size and extension)
    /// </summary>
    private (bool isValid, string? errorMessage) ValidateFile(IFormFile file)
    {
        if (file == null)
        {
            return (true, null); // File is optional
        }

        // Check file size
        if (file.Length > MAX_FILE_SIZE)
        {
            var sizeMB = MAX_FILE_SIZE / (1024.0 * 1024.0);
            return (false, $"File size exceeds the maximum allowed size of {sizeMB:F1}MB. Your file is {file.Length / (1024.0 * 1024.0):F2}MB.");
        }

        if (file.Length == 0)
        {
            return (false, "File is empty. Please upload a valid file.");
        }

        // Check file extension
        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(extension))
        {
            return (false, "File must have a valid extension.");
        }

        if (!ALLOWED_EXTENSIONS.Contains(extension))
        {
            var allowedList = string.Join(", ", ALLOWED_EXTENSIONS);
            return (false, $"File type '{extension}' is not allowed. Allowed types: {allowedList}");
        }

        // Check for potentially dangerous file names
        var fileName = Path.GetFileNameWithoutExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return (false, "File name is invalid.");
        }

        return (true, null);
    }

    /// <summary>
    /// Sanitize input to prevent XSS and SQL injection
    /// </summary>
    private string SanitizeInput(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var sanitized = input.Trim();

        // Remove potentially dangerous HTML/script tags
        sanitized = System.Text.RegularExpressions.Regex.Replace(
            sanitized,
            @"<script[^>]*>.*?</script>",
            string.Empty,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline
        );

        // Remove other potentially dangerous tags
        var dangerousTags = new[] { "iframe", "object", "embed", "applet", "meta", "link", "style" };
        foreach (var tag in dangerousTags)
        {
            sanitized = System.Text.RegularExpressions.Regex.Replace(
                sanitized,
                $@"<{tag}[^>]*>.*?</{tag}>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline
            );
            sanitized = System.Text.RegularExpressions.Regex.Replace(
                sanitized,
                $@"<{tag}[^>]*/>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
        }

        // Remove event handlers (onclick, onerror, etc.)
        sanitized = System.Text.RegularExpressions.Regex.Replace(
            sanitized,
            @"\s*on\w+\s*=\s*[""'][^""']*[""']",
            string.Empty,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );

        // Remove javascript: protocol
        sanitized = System.Text.RegularExpressions.Regex.Replace(
            sanitized,
            @"javascript\s*:",
            string.Empty,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );

        return sanitized;
    }

    /// <summary>
    /// Validate input length
    /// </summary>
    private (bool isValid, string? errorMessage) ValidateInputLength(string? input, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return (true, null); // Empty is OK for optional fields
        }

        if (input.Length > maxLength)
        {
            return (false, $"{fieldName} exceeds maximum length of {maxLength} characters. Current length: {input.Length} characters.");
        }

        return (true, null);
    }

    private async Task SendHomeworkCreatedNotificationsAsync(Homework homework, Lesson lesson)
    {
        try
        {
            // Lấy tất cả students trong class (sử dụng lesson.Class đã được load)
            var studentUserIds = lesson.Class?.Students?
                .Select(s => s.UserId)
                .Distinct()
                .ToList() ?? new List<int>();

            // Nếu không có students trong memory, query từ database
            if (studentUserIds.Count == 0 && lesson.ClassId > 0)
            {
                studentUserIds = await _db.Students
                    .Where(s => s.Classes.Any(c => c.ClassId == lesson.ClassId))
                    .Select(s => s.UserId)
                    .Distinct()
                    .ToListAsync();
            }

            if (studentUserIds.Count == 0) return;

            var deadlineText = homework.Deadline?.ToLocalTime().ToString("dd/MM/yyyy HH:mm") ?? "Not set";
            var className = lesson.Class?.ClassName ?? "";

            var notifications = studentUserIds.Select(userId => new CreateNotificationRequest(
                userId,
                $"New Homework: {homework.Title}",
                $"You have a new homework in class {className}. Deadline: {deadlineText}",
                "Homework",
                homework.CreatedBy,
                homework.HomeworkId
            )).ToList();

            // Tạo notifications và broadcast
            var createdNotifications = new List<NotificationDto>();
            foreach (var notificationRequest in notifications)
            {
                var notification = await _notificationService.CreateAsync(notificationRequest, broadcast: false);
                createdNotifications.Add(notification);
            }

            // Broadcast tất cả notifications cùng lúc
            await _notificationService.BroadcastAsync(createdNotifications);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send homework created notifications for homework {HomeworkId}", homework.HomeworkId);
        }
    }

    private async Task SendHomeworkCommentNotificationAsync(HomeworkSubmission submission, Homework homework)
    {
        try
        {
            if (submission.Student?.User == null) return;

            var notificationRequest = new CreateNotificationRequest(
                submission.Student.UserId,
                $"Homework Comment: {homework.Title}",
                submission.Comment?.Length > 200 ? submission.Comment.Substring(0, 200) + "..." : submission.Comment,
                "Homework",
                null, // CreatedBy will be set automatically from controller if needed
                homework.HomeworkId
            );

            await _notificationService.CreateAsync(notificationRequest, broadcast: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send homework comment notification for submission {SubmissionId}", submission.HomeworkSubmissionId);
        }
    }

    private async Task SendHomeworkSubmissionNotificationAsync(HomeworkSubmission submission, Homework homework, Student student)
    {
        try
        {
            if (homework.Lesson?.Lecture?.User == null) return;

            var lecturerUserId = homework.Lesson.Lecture.User.UserId;
            var studentName = student?.User != null 
                ? $"{student.User.FirstName} {student.User.LastName}".Trim() 
                : student?.StudentCode ?? "Student";

            var notificationRequest = new CreateNotificationRequest(
                lecturerUserId,
                $"New Homework Submission: {homework.Title}",
                $"{studentName} has submitted homework: {homework.Title}",
                "Homework",
                student?.UserId,
                homework.HomeworkId
            );

            await _notificationService.CreateAsync(notificationRequest, broadcast: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send homework submission notification for submission {SubmissionId}", submission.HomeworkSubmissionId);
        }
    }

    private class HomeworkProjection
    {
        public int HomeworkId { get; set; }
        public int LessonId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Content { get; set; }
        public DateTime? Deadline { get; set; }
        public string? FilePath { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int SubmissionCount { get; set; }
        public int StudentCount { get; set; }
        public StudentSubmissionProjection? StudentSubmission { get; set; }
    }

    private class StudentSubmissionProjection
    {
        public int SubmissionId { get; set; }
        public int StudentId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? Status { get; set; }
        public string? Comment { get; set; }
        public string? FilePath { get; set; }
    }
}

public class HomeworkCreateRequest
{
    [Required]
    public int LessonId { get; set; }

    [Required]
    [StringLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    public string? FilePath { get; set; }

    public DateTimeOffset? Deadline { get; set; }

    public int? CreatedBy { get; set; }

    public IFormFile? File { get; set; }
}

public class HomeworkUpdateRequest
{
    [Required]
    public int HomeworkId { get; set; }

    [StringLength(255)]
    public string? Title { get; set; }

    public string? Content { get; set; }

    public DateTimeOffset? Deadline { get; set; }

    public IFormFile? File { get; set; }

    public string? FilePath { get; set; }

    public bool RemoveFile { get; set; }
}

public class SubmissionCreateRequest
{
    [Required]
    public int StudentId { get; set; }

    [StringLength(50)]
    public string? Method { get; set; }

    public string? Comment { get; set; }

    public string? FilePath { get; set; }

    public string? DriveLink { get; set; }

    public string? DocLink { get; set; }

    public IFormFile? File { get; set; }

    public List<IFormFile> Files { get; set; } = new();
}

public class UpdateSubmissionRequest
{
    [StringLength(50)]
    public string? Status { get; set; }

    public string? Comment { get; set; }

    public string? Feedback { get; set; }
}
