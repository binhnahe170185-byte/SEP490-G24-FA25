using System.Security.Claims;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
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
    private readonly IAttendanceService _attendanceService;
    private readonly FjapDbContext _db;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(
        IAttendanceService attendanceService,
        FjapDbContext db,
        ILogger<AttendanceController> logger)
    {
        _attendanceService = attendanceService;
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
            var classes = await _attendanceService.GetClassesAsync(lecturerId);

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
            var lessons = await _attendanceService.GetLessonsByClassAsync(classId, lecturerId);

            return Ok(new
            {
                code = 200,
                data = lessons.Select(l => new
                {
                    lessonId = l.LessonId,
                    classId = l.ClassId,
                    date = l.Date,
                    roomName = l.RoomName,
                    timeSlot = l.TimeSlot,
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
            var response = await _attendanceService.GetStudentsByLessonAsync(lessonId, lecturerId);

            if (response == null)
            {
                return NotFound(new { code = 404, message = "Lesson not found or not owned by lecturer" });
            }

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
            var attendance = await _attendanceService.UpdateAttendanceAsync(
                request.LessonId,
                request.StudentId,
                request.Status,
                lecturerId);

            if (attendance == null)
            {
                return NotFound(new { code = 404, message = "Lesson not found or student not in class" });
            }

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
    /// Lấy attendance report cho một class (số buổi present/absent của mỗi student)
    /// GET: api/attendance/classes/{classId}/report
    /// </summary>
    [HttpGet("classes/{classId}/report")]
    public async Task<IActionResult> GetAttendanceReport(int classId)
    {
        try
        {
            var lecturerId = await GetCurrentLecturerIdAsync();
            var reportData = await _attendanceService.GetAttendanceReportAsync(classId, lecturerId);

            if (reportData == null || !reportData.Any())
            {
                return NotFound(new { code = 404, message = "Class not found or not taught by lecturer" });
            }

            return Ok(new
            {
                code = 200,
                data = reportData.Select(r => new
                {
                    student = new
                    {
                        studentId = r.Student.StudentId,
                        studentCode = r.Student.StudentCode,
                        user = new
                        {
                            firstName = r.Student.User.FirstName,
                            lastName = r.Student.User.LastName
                        }
                    },
                    presentCount = r.PresentCount,
                    absentCount = r.AbsentCount
                })
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { code = 403, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load attendance report for class {ClassId}", classId);
            return StatusCode(500, new { code = 500, message = "Failed to load attendance report" });
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
            var attendancesDto = request.Attendances.Select(a => new AttendanceUpdateItemDto
            {
                StudentId = a.StudentId,
                Status = a.Status
            }).ToList();

            var results = await _attendanceService.UpdateBulkAttendanceAsync(
                request.LessonId,
                attendancesDto,
                lecturerId);

            return Ok(new
            {
                code = 200,
                message = $"Updated {results.Count} attendance records",
                data = results
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
