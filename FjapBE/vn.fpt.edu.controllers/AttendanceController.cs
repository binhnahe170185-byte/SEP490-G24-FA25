using System.Security.Claims;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly FjapDbContext _db;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(FjapDbContext db, ILogger<AttendanceController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        throw new InvalidOperationException("Cannot resolve current user id from token.");
    }

    private async Task<int> GetCurrentLecturerIdAsync()
    {
        var userId = GetCurrentUserId();
        var lecturerId = await _db.Lectures
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => (int?)l.LectureId)
            .FirstOrDefaultAsync();

        if (lecturerId is null)
        {
            throw new InvalidOperationException("Current user is not mapped to a lecturer.");
        }

        return lecturerId.Value;
    }

    private static string FormatDate(DateOnly date) => date.ToString("yyyy-MM-dd");

    private static string FormatTimeRange(TimeOnly start, TimeOnly end)
    {
        return $"{start:HH\\:mm}-{end:HH\\:mm}";
    }

    /// <summary>
    /// Lấy danh sách lớp mà giảng viên hiện tại giảng dạy
    /// GET: api/attendance/classes
    /// </summary>
    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses()
    {
        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();

            var classes = await _db.Lessons
                .AsNoTracking()
                .Where(l => l.LectureId == lecturerId)
                .GroupBy(l => new
                {
                    l.ClassId,
                    l.Class.ClassName,
                    SubjectName = l.Class.Subject.SubjectName,
                    SubjectCode = l.Class.Subject.SubjectCode
                })
                .Select(g => new
                {
                    g.Key.ClassId,
                    g.Key.ClassName,
                    g.Key.SubjectName,
                    g.Key.SubjectCode
                })
                .OrderBy(c => c.ClassName)
                .ToListAsync();

            return Ok(new
            {
                code = 200,
                data = classes.Select(c => new
                {
                    classId = c.ClassId,
                    className = c.ClassName,
                    subjectName = c.SubjectName,
                    subjectCode = c.SubjectCode
                })
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load classes for attendance");
            return StatusCode(500, new { code = 500, message = "Failed to load classes" });
        }
    }

    /// <summary>
    /// Lấy danh sách lessons của một lớp mà giảng viên hiện tại giảng dạy
    /// GET: api/attendance/classes/{classId}/lessons
    /// </summary>
    [HttpGet("classes/{classId}/lessons")]
    public async Task<IActionResult> GetLessonsByClass(int classId)
    {
        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();

            var lessonsQuery = await _db.Lessons
                .AsNoTracking()
                .Where(l => l.ClassId == classId && l.LectureId == lecturerId)
                .OrderBy(l => l.Date)
                .ThenBy(l => l.Time.StartTime)
                .Select(l => new
                {
                    l.LessonId,
                    l.ClassId,
                    l.Date,
                    RoomName = l.Room.RoomName,
                    SubjectName = l.Class.Subject.SubjectName,
                    StartTime = l.Time.StartTime,
                    EndTime = l.Time.EndTime
                })
                .ToListAsync();

            return Ok(new
            {
                code = 200,
                data = lessonsQuery.Select(l => new
                {
                    lessonId = l.LessonId,
                    classId = l.ClassId,
                    date = FormatDate(l.Date),
                    roomName = l.RoomName,
                    timeSlot = FormatTimeRange(l.StartTime, l.EndTime),
                    subjectName = l.SubjectName
                })
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load lessons for class {ClassId}", classId);
            return StatusCode(500, new { code = 500, message = "Failed to load lessons" });
        }

    }

    /// <summary>
    /// Lấy danh sách sinh viên và attendance của một lesson (tự động tạo attendance nếu chưa có)
    /// GET: api/attendance/lessons/{lessonId}/students
    /// </summary>
    [HttpGet("lessons/{lessonId}/students")]
    public async Task<IActionResult> GetStudentsByLesson(int lessonId)
    {
        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();

            var lesson = await _db.Lessons
                .Include(l => l.Class)
                    .ThenInclude(c => c.Subject)
                .Include(l => l.Room)
                .Include(l => l.Time)
                .FirstOrDefaultAsync(l => l.LessonId == lessonId && l.LectureId == lecturerId);

            if (lesson == null)
            {
                return NotFound(new { code = 404, message = "Lesson not found or not owned by lecturer" });
            }

            var students = await _db.Classes
                .Where(c => c.ClassId == lesson.ClassId)
                .SelectMany(c => c.Students)
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    FirstName = s.User.FirstName,
                    LastName = s.User.LastName
                })
                .OrderBy(s => s.StudentCode)
                .ToListAsync();

            var attendanceRecords = await _db.Attendances
                .Where(a => a.LessonId == lessonId)
                .ToDictionaryAsync(a => a.StudentId);

            var now = DateTime.UtcNow;
            var hasChanges = false;

            foreach (var student in students)
            {
                if (!attendanceRecords.TryGetValue(student.StudentId, out var attendance))
                {
                    attendance = new Attendance
                    {
                        LessonId = lessonId,
                        StudentId = student.StudentId,
                        Status = "Absent",
                        TimeAttendance = now
                    };
                    _db.Attendances.Add(attendance);
                    attendanceRecords[student.StudentId] = attendance;
                    hasChanges = true;
                }
            }

            if (hasChanges)
            {
                await _db.SaveChangesAsync();
            }

            var response = new
            {
                lessonId = lesson.LessonId,
                classId = lesson.ClassId,
                date = FormatDate(lesson.Date),
                roomName = lesson.Room?.RoomName,
                timeSlot = FormatTimeRange(lesson.Time.StartTime, lesson.Time.EndTime),
                subjectName = lesson.Class.Subject.SubjectName,
                students = students.Select(student =>
                {
                    var attendance = attendanceRecords[student.StudentId];
                    return new
                    {
                        studentId = student.StudentId,
                        studentCode = student.StudentCode,
                        fullName = string.Join(" ", new[] { student.FirstName, student.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim(),
                        status = attendance.Status ?? "Absent",
                        attendanceId = attendance.AttendanceId,
                        timeAttendance = attendance.TimeAttendance
                    };
                }).ToList()
            };

            return Ok(new { code = 200, data = response });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load students for lesson {LessonId}", lessonId);
            return StatusCode(500, new { code = 500, message = "Failed to load students" });
        }
    }

    /// <summary>
    /// Cập nhật hoặc tạo mới attendance
    /// POST: api/attendance
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> UpdateAttendance([FromBody] UpdateAttendanceRequest request)
    {
        if (request == null || request.LessonId <= 0 || request.StudentId <= 0)
        {
            return BadRequest(new { code = 400, message = "Invalid request" });
        }

        if (!new[] { "Present", "Absent", "Late", "Excused" }.Contains(request.Status))
        {
            return BadRequest(new { code = 400, message = "Invalid status. Must be: Present, Absent, Late, or Excused" });
        }

        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();

            var lesson = await _db.Lessons
                .Include(l => l.Class)
                .FirstOrDefaultAsync(l => l.LessonId == request.LessonId && l.LectureId == lecturerId);

            if (lesson == null)
            {
                return NotFound(new { code = 404, message = "Lesson not found or not owned by lecturer" });
            }

            var isStudentInClass = await _db.Classes
                .Where(c => c.ClassId == lesson.ClassId)
                .SelectMany(c => c.Students)
                .AnyAsync(s => s.StudentId == request.StudentId);

            if (!isStudentInClass)
            {
                return NotFound(new { code = 404, message = "Student not found in this class" });
            }

            var attendance = await _db.Attendances
                .FirstOrDefaultAsync(a => a.LessonId == request.LessonId && a.StudentId == request.StudentId);

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    LessonId = request.LessonId,
                    StudentId = request.StudentId,
                    Status = request.Status,
                    TimeAttendance = DateTime.UtcNow
                };
                _db.Attendances.Add(attendance);
            }
            else
            {
                attendance.Status = request.Status;
                attendance.TimeAttendance = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                code = 200,
                message = "Attendance saved successfully",
                data = new
                {
                    attendanceId = attendance.AttendanceId,
                    lessonId = attendance.LessonId,
                    studentId = attendance.StudentId,
                    status = attendance.Status,
                    timeAttendance = attendance.TimeAttendance
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update attendance for lesson {LessonId}, student {StudentId}",
                request.LessonId, request.StudentId);
            return StatusCode(500, new { code = 500, message = "Failed to update attendance" });
        }
    }

    /// <summary>
    /// Cập nhật nhiều attendance cùng lúc
    /// POST: api/attendance/bulk
    /// </summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> UpdateBulkAttendance([FromBody] BulkUpdateAttendanceRequest request)
    {
        if (request == null || request.LessonId <= 0 || request.Attendances == null || request.Attendances.Count == 0)
        {
            return BadRequest(new { code = 400, message = "Invalid request" });
        }

        if (request.Attendances.Any(att => att.StudentId <= 0))
        {
            return BadRequest(new { code = 400, message = "Invalid studentId in payload" });
        }

        if (request.Attendances.Any(att => !new[] { "Present", "Absent", "Late", "Excused" }.Contains(att.Status)))
        {
            return BadRequest(new { code = 400, message = "Invalid status. Must be: Present, Absent, Late, or Excused" });
        }

        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();

            var lesson = await _db.Lessons
                .Include(l => l.Class)
                .FirstOrDefaultAsync(l => l.LessonId == request.LessonId && l.LectureId == lecturerId);

            if (lesson == null)
            {
                return NotFound(new { code = 404, message = "Lesson not found or not owned by lecturer" });
            }

            var validStudentIds = (await _db.Classes
                .Where(c => c.ClassId == lesson.ClassId)
                .SelectMany(c => c.Students.Select(s => s.StudentId))
                .ToListAsync())
                .ToHashSet();

            var results = new List<object>();
            var errors = new List<string>();
            var now = DateTime.UtcNow;

            var existingAttendances = await _db.Attendances
                .Where(a => a.LessonId == request.LessonId)
                .ToDictionaryAsync(a => a.StudentId);

            foreach (var att in request.Attendances)
            {
                if (!validStudentIds.Contains(att.StudentId))
                {
                    errors.Add($"Student {att.StudentId} is not enrolled in class {lesson.ClassId}");
                    continue;
                }

                if (existingAttendances.TryGetValue(att.StudentId, out var attendance))
                {
                    attendance.Status = att.Status;
                    attendance.TimeAttendance = now;
                    results.Add(new
                    {
                        attendanceId = attendance.AttendanceId,
                        studentId = att.StudentId,
                        status = att.Status,
                        updated = true
                    });
                }
                else
                {
                    attendance = new Attendance
                    {
                        LessonId = request.LessonId,
                        StudentId = att.StudentId,
                        Status = att.Status,
                        TimeAttendance = now
                    };
                    _db.Attendances.Add(attendance);
                    results.Add(new
                    {
                        attendanceId = attendance.AttendanceId,
                        studentId = att.StudentId,
                        status = att.Status,
                        created = true
                    });
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                code = 200,
                message = $"Updated {results.Count} attendance records",
                data = results,
                errors = errors.Count > 0 ? errors : null
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update bulk attendance for lesson {LessonId}", request.LessonId);
            return StatusCode(500, new { code = 500, message = "Failed to update attendance" });
        }
    }
}

public class UpdateAttendanceRequest
{
    public int LessonId { get; set; }

    public int StudentId { get; set; }

    public string Status { get; set; } = "Present";
}

public class BulkUpdateAttendanceRequest
{
    public int LessonId { get; set; }

    public List<AttendanceUpdateItem> Attendances { get; set; } = new();
}

public class AttendanceUpdateItem
{
    public int StudentId { get; set; }

    public string Status { get; set; } = "Present";
}
