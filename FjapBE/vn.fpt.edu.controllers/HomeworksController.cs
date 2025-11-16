using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using FJAP.vn.fpt.edu.models;
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

    public HomeworksController(
        FjapDbContext db,
        ILogger<HomeworksController> logger,
        IWebHostEnvironment env)
    {
        _db = db;
        _logger = logger;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetHomeworks([FromQuery] int? lessonId = null, [FromQuery] int? classId = null)
    {
        var query = BuildHomeworkQuery();

        if (lessonId.HasValue)
        {
            query = query.Where(h => h.LessonId == lessonId);
        }

        if (classId.HasValue)
        {
            query = query.Where(h => h.Lesson.ClassId == classId);
        }

        var data = await ProjectHomeworkList(query);
        return Ok(new { code = 200, data });
    }

    [HttpPost]
    public async Task<IActionResult> CreateHomework([FromForm] HomeworkCreateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid payload", errors = ModelState });
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
            Title = request.Title.Trim(),
            Content = request.Content?.Trim(),
            Deadline = request.Deadline?.ToUniversalTime(),
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

        homework.Title = request.Title?.Trim() ?? homework.Title;
        homework.Content = request.Content?.Trim();
        homework.Deadline = request.Deadline?.ToUniversalTime();

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
    public async Task<IActionResult> GetHomeworksByClass(int classId)
    {
        var classExists = await _db.Classes.AnyAsync(c => c.ClassId == classId);
        if (!classExists)
        {
            return NotFound(new { code = 404, message = "Class not found" });
        }

        var query = BuildHomeworkQuery().Where(h => h.Lesson.ClassId == classId);
        var data = await ProjectHomeworkList(query);
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
            .FirstOrDefaultAsync(s => s.HomeworkSubmissionId == submissionId && s.HomeworkId == homeworkId);

        if (submission == null)
        {
            return NotFound(new { code = 404, message = "Submission not found" });
        }

        if (request.Status != null)
        {
            submission.Status = request.Status.Trim();
        }

        if (request.Comment != null)
        {
            submission.Comment = request.Comment.Trim();
        }

        await _db.SaveChangesAsync();

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

    private async Task<IEnumerable<object>> ProjectHomeworkList(IQueryable<Homework> query)
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
                StudentCount = h.Lesson.Class.Students.Count
            })
            .ToListAsync();

        return rows.Select(FormatProjection);
    }

    private async Task<object?> ProjectHomework(int homeworkId)
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
                StudentCount = h.Lesson.Class.Students.Count
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
            totalStudents = row.StudentCount
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

    public DateTime? Deadline { get; set; }

    public int? CreatedBy { get; set; }

    public IFormFile? File { get; set; }
}

public class HomeworkUpdateRequest
{
    [Required]
    [StringLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    public string? FilePath { get; set; }

    public DateTime? Deadline { get; set; }

    public IFormFile? File { get; set; }

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
