using System;
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
