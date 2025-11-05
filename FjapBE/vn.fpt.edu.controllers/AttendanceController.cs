using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System;

namespace FJAP.Controllers;

[ApiController]
[Route("api/attendance")]
public class AttendanceController : ControllerBase
{
    // Mock data storage (in-memory)
    private static readonly ConcurrentDictionary<int, MockAttendance> _mockAttendances = new();
    private static int _nextAttendanceId = 1;
    private static int _nextLessonId = 100;

    // Mock classes
    private static readonly List<MockClass> _mockClasses = new()
    {
        new MockClass { ClassId = 1, ClassName = "SE1701", SubjectName = "Software Engineering", SubjectCode = "SE101" },
        new MockClass { ClassId = 2, ClassName = "SE1702", SubjectName = "Web Development", SubjectCode = "WEB101" },
        new MockClass { ClassId = 3, ClassName = "SE1703", SubjectName = "Database Systems", SubjectCode = "DB101" }
    };

    // Mock lessons for each class
    private static readonly ConcurrentDictionary<int, List<MockLesson>> _mockLessons = new()
    {
        [1] = new List<MockLesson>
        {
            new MockLesson { LessonId = 101, ClassId = 1, Date = DateOnly.Parse("2024-01-15"), RoomName = "Room A101", TimeSlot = "07:00-09:00", SubjectName = "Software Engineering" },
            new MockLesson { LessonId = 102, ClassId = 1, Date = DateOnly.Parse("2024-01-17"), RoomName = "Room A101", TimeSlot = "07:00-09:00", SubjectName = "Software Engineering" },
            new MockLesson { LessonId = 103, ClassId = 1, Date = DateOnly.Parse("2024-01-19"), RoomName = "Room A101", TimeSlot = "07:00-09:00", SubjectName = "Software Engineering" }
        },
        [2] = new List<MockLesson>
        {
            new MockLesson { LessonId = 201, ClassId = 2, Date = DateOnly.Parse("2024-01-16"), RoomName = "Room B202", TimeSlot = "09:00-11:00", SubjectName = "Web Development" },
            new MockLesson { LessonId = 202, ClassId = 2, Date = DateOnly.Parse("2024-01-18"), RoomName = "Room B202", TimeSlot = "09:00-11:00", SubjectName = "Web Development" }
        },
        [3] = new List<MockLesson>
        {
            new MockLesson { LessonId = 301, ClassId = 3, Date = DateOnly.Parse("2024-01-20"), RoomName = "Room C303", TimeSlot = "13:00-15:00", SubjectName = "Database Systems" }
        }
    };

    // Mock students for each class
    private static readonly ConcurrentDictionary<int, List<MockStudent>> _mockStudents = new()
    {
        [1] = new List<MockStudent>
        {
            new MockStudent { StudentId = 1, StudentCode = "SE170001", FirstName = "Nguyen", LastName = "Van A", FullName = "Nguyen Van A" },
            new MockStudent { StudentId = 2, StudentCode = "SE170002", FirstName = "Tran", LastName = "Thi B", FullName = "Tran Thi B" },
            new MockStudent { StudentId = 3, StudentCode = "SE170003", FirstName = "Le", LastName = "Van C", FullName = "Le Van C" },
            new MockStudent { StudentId = 4, StudentCode = "SE170004", FirstName = "Pham", LastName = "Thi D", FullName = "Pham Thi D" },
            new MockStudent { StudentId = 5, StudentCode = "SE170005", FirstName = "Hoang", LastName = "Van E", FullName = "Hoang Van E" }
        },
        [2] = new List<MockStudent>
        {
            new MockStudent { StudentId = 6, StudentCode = "SE170006", FirstName = "Vu", LastName = "Thi F", FullName = "Vu Thi F" },
            new MockStudent { StudentId = 7, StudentCode = "SE170007", FirstName = "Do", LastName = "Van G", FullName = "Do Van G" },
            new MockStudent { StudentId = 8, StudentCode = "SE170008", FirstName = "Bui", LastName = "Thi H", FullName = "Bui Thi H" }
        },
        [3] = new List<MockStudent>
        {
            new MockStudent { StudentId = 9, StudentCode = "SE170009", FirstName = "Dang", LastName = "Van I", FullName = "Dang Van I" },
            new MockStudent { StudentId = 10, StudentCode = "SE170010", FirstName = "Ngo", LastName = "Thi K", FullName = "Ngo Thi K" }
        }
    };

    // Initialize some mock attendance data
    static AttendanceController()
    {
        // Add some initial attendance records for lesson 101
        var lesson101Students = _mockStudents[1];
        foreach (var student in lesson101Students)
        {
            _mockAttendances[_nextAttendanceId++] = new MockAttendance
            {
                AttendanceId = _nextAttendanceId - 1,
                LessonId = 101,
                StudentId = student.StudentId,
                Status = "Present",
                TimeAttendance = DateTime.Now
            };
        }
    }

    /// <summary>
    /// Lấy danh sách tất cả lớp học (active)
    /// GET: api/attendance/classes
    /// </summary>
    [HttpGet("classes")]
    public IActionResult GetClasses()
    {
        try
        {
            var classes = _mockClasses.Select(c => new
            {
                classId = c.ClassId,
                className = c.ClassName,
                subjectName = c.SubjectName,
                subjectCode = c.SubjectCode
            }).ToList();

            Console.WriteLine($"[AttendanceController] GetClasses called, returning {classes.Count} classes");
            return Ok(new { code = 200, data = classes });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AttendanceController] GetClasses error: {ex.Message}");
            return StatusCode(500, new { code = 500, message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy danh sách lessons của một lớp
    /// GET: api/attendance/classes/{classId}/lessons
    /// </summary>
    [HttpGet("classes/{classId}/lessons")]
    public IActionResult GetLessonsByClass(int classId)
    {
        if (!_mockLessons.TryGetValue(classId, out var lessons))
        {
            return NotFound(new { code = 404, message = "Class not found or has no lessons" });
        }

        var result = lessons.Select(l => new
        {
            lessonId = l.LessonId,
            classId = l.ClassId,
            date = l.Date.ToString("yyyy-MM-dd"),
            roomName = l.RoomName,
            timeSlot = l.TimeSlot,
            subjectName = l.SubjectName
        }).ToList();

        return Ok(new { code = 200, data = result });
    }

    /// <summary>
    /// Lấy danh sách sinh viên và attendance của một lesson
    /// GET: api/attendance/lessons/{lessonId}/students
    /// </summary>
    [HttpGet("lessons/{lessonId}/students")]
    public IActionResult GetStudentsByLesson(int lessonId)
    {
        // Find the lesson to get classId
        MockLesson? lesson = null;
        int classId = 0;
        foreach (var classLessons in _mockLessons.Values)
        {
            lesson = classLessons.FirstOrDefault(l => l.LessonId == lessonId);
            if (lesson != null)
            {
                classId = lesson.ClassId;
                break;
            }
        }

        if (lesson == null)
        {
            return NotFound(new { code = 404, message = "Lesson not found" });
        }

        if (!_mockStudents.TryGetValue(classId, out var students))
        {
            return NotFound(new { code = 404, message = "Students not found for this class" });
        }

        var result = students.Select(student =>
        {
            // Find attendance for this student and lesson
            var attendance = _mockAttendances.Values
                .FirstOrDefault(a => a.LessonId == lessonId && a.StudentId == student.StudentId);

            return new
            {
                studentId = student.StudentId,
                studentCode = student.StudentCode,
                firstName = student.FirstName,
                lastName = student.LastName,
                fullName = student.FullName,
                attendanceId = attendance?.AttendanceId,
                status = attendance?.Status ?? "Present",
                timeAttendance = attendance?.TimeAttendance
            };
        }).ToList();

        return Ok(new
        {
            code = 200,
            data = new
            {
                lessonId = lesson.LessonId,
                classId = lesson.ClassId,
                date = lesson.Date.ToString("yyyy-MM-dd"),
                roomName = lesson.RoomName,
                timeSlot = lesson.TimeSlot,
                subjectName = lesson.SubjectName,
                students = result
            }
        });
    }

    /// <summary>
    /// Cập nhật hoặc tạo mới attendance
    /// POST: api/attendance
    /// </summary>
    [HttpPost]
    public IActionResult UpdateAttendance([FromBody] UpdateAttendanceRequest request)
    {
        if (request == null || request.LessonId <= 0 || request.StudentId <= 0)
        {
            return BadRequest(new { code = 400, message = "Invalid request" });
        }

        if (!new[] { "Present", "Absent", "Late", "Excused" }.Contains(request.Status))
        {
            return BadRequest(new { code = 400, message = "Invalid status. Must be: Present, Absent, Late, or Excused" });
        }

        // Find existing attendance
        var existingAttendance = _mockAttendances.Values
            .FirstOrDefault(a => a.LessonId == request.LessonId && a.StudentId == request.StudentId);

        if (existingAttendance != null)
        {
            // Update existing
            existingAttendance.Status = request.Status;
            existingAttendance.TimeAttendance = DateTime.Now;

            return Ok(new
            {
                code = 200,
                message = "Attendance updated successfully",
                data = new
                {
                    attendanceId = existingAttendance.AttendanceId,
                    lessonId = existingAttendance.LessonId,
                    studentId = existingAttendance.StudentId,
                    status = existingAttendance.Status,
                    timeAttendance = existingAttendance.TimeAttendance
                }
            });
        }
        else
        {
            // Create new
            var newAttendance = new MockAttendance
            {
                AttendanceId = _nextAttendanceId++,
                LessonId = request.LessonId,
                StudentId = request.StudentId,
                Status = request.Status,
                TimeAttendance = DateTime.Now
            };

            _mockAttendances[newAttendance.AttendanceId] = newAttendance;

            return Ok(new
            {
                code = 200,
                message = "Attendance created successfully",
                data = new
                {
                    attendanceId = newAttendance.AttendanceId,
                    lessonId = newAttendance.LessonId,
                    studentId = newAttendance.StudentId,
                    status = newAttendance.Status,
                    timeAttendance = newAttendance.TimeAttendance
                }
            });
        }
    }

    /// <summary>
    /// Cập nhật nhiều attendance cùng lúc
    /// POST: api/attendance/bulk
    /// </summary>
    [HttpPost("bulk")]
    public IActionResult UpdateBulkAttendance([FromBody] BulkUpdateAttendanceRequest request)
    {
        if (request == null || request.LessonId <= 0 || request.Attendances == null || request.Attendances.Count == 0)
        {
            return BadRequest(new { code = 400, message = "Invalid request" });
        }

        var results = new List<object>();
        var errors = new List<string>();

        foreach (var att in request.Attendances)
        {
            if (att.StudentId <= 0)
            {
                errors.Add($"Invalid studentId: {att.StudentId}");
                continue;
            }

            if (!new[] { "Present", "Absent", "Late", "Excused" }.Contains(att.Status))
            {
                errors.Add($"Invalid status for student {att.StudentId}: {att.Status}");
                continue;
            }

            var existingAttendance = _mockAttendances.Values
                .FirstOrDefault(a => a.LessonId == request.LessonId && a.StudentId == att.StudentId);

            if (existingAttendance != null)
            {
                existingAttendance.Status = att.Status;
                existingAttendance.TimeAttendance = DateTime.Now;
                results.Add(new
                {
                    attendanceId = existingAttendance.AttendanceId,
                    studentId = att.StudentId,
                    status = att.Status,
                    updated = true
                });
            }
            else
            {
                var newAttendance = new MockAttendance
                {
                    AttendanceId = _nextAttendanceId++,
                    LessonId = request.LessonId,
                    StudentId = att.StudentId,
                    Status = att.Status,
                    TimeAttendance = DateTime.Now
                };

                _mockAttendances[newAttendance.AttendanceId] = newAttendance;
                results.Add(new
                {
                    attendanceId = newAttendance.AttendanceId,
                    studentId = att.StudentId,
                    status = att.Status,
                    created = true
                });
            }
        }

        return Ok(new
        {
            code = 200,
            message = $"Updated {results.Count} attendance records",
            data = results,
            errors = errors.Count > 0 ? errors : null
        });
    }
}

// Mock data models
public class MockClass
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
}

public class MockLesson
{
    public int LessonId { get; set; }
    public int ClassId { get; set; }
    public DateOnly Date { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
}

public class MockStudent
{
    public int StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
}

public class MockAttendance
{
    public int AttendanceId { get; set; }
    public int LessonId { get; set; }
    public int StudentId { get; set; }
    public string Status { get; set; } = "Present";
    public DateTime? TimeAttendance { get; set; }
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

