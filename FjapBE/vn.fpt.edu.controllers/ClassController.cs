using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/staffAcademic/classes")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;
    private readonly IStudentService _studentService;
    private readonly FjapDbContext _db;
    private readonly IScheduleAvailabilityService _availabilityService;
    private readonly ILessonService _lessonService;
    public ClassController(
       IClassService classService,
       IStudentService studentService,
       FjapDbContext db,
       IScheduleAvailabilityService availabilityService,
       ILessonService lessonService)
    {
        _classService = classService;
        _studentService = studentService;
        _db = db;
        _availabilityService = availabilityService;
        _lessonService = lessonService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _classService.GetAllAsync();

        var result = items.Select(cls =>
        {
            var semesterStart = cls.Semester?.StartDate.ToDateTime(TimeOnly.MinValue);
            var semesterEnd = cls.Semester?.EndDate.ToDateTime(TimeOnly.MinValue);
            var semesterName = cls.Semester?.Name;
            var levelName = cls.Level?.LevelName;
            var subject = cls.Subject;
            var subjectDetail = subject == null
                ? null
                : new
                {
                    id = subject.SubjectId,
                    code = subject.SubjectCode,
                    name = subject.SubjectName,
                    status = subject.Status,
                    levelId = subject.LevelId,
                    levelName = subject.Level?.LevelName ?? cls.Level?.LevelName
                };

            var semesterDetail = cls.Semester == null
                ? null
                : new
                {
                    id = cls.Semester.SemesterId,
                    name = cls.Semester.Name,
                    startDate = semesterStart,
                    endDate = semesterEnd
                };

            var levelDetail = cls.Level == null
                ? null
                : new
                {
                    id = cls.Level.LevelId,
                    name = cls.Level.LevelName
                };

            return new
            {
                classId = cls.ClassId,
                className = cls.ClassName,
                status = cls.Status,
                updatedAt = cls.UpdatedAt,
                semesterName = semesterName,
                semesterId = cls.SemesterId,
                semesterStartDate = semesterStart,
                semesterEndDate = semesterEnd,
                semesterDetail = semesterDetail,
                subjectId = subject?.SubjectId,
                subjectCode = subject?.SubjectCode,
                subjectName = subject?.SubjectName,
                subjectLevel = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subjectDetail = subjectDetail,
                levelName = levelName,
                levelId = cls.LevelId,
                levelDetail = levelDetail,
                minStudents = cls.MinStudents,
                maxStudents = cls.MaxStudents
            };
        }).ToList();

        return Ok(new { code = 200, data = result });
    }

    [HttpGet("options")]
    public async Task<IActionResult> GetFormOptions()
    {
        var options = await _classService.GetFormOptionsAsync();
        var levelOptions = options.Levels
            .Select(level => new
            {
                id = level.LevelId,
                name = level.LevelName
            })
            .ToList();

        var semesterOptions = options.Semesters
            .Select(semester => new
            {
                id = semester.SemesterId,
                name = semester.Name,
                startDate = semester.StartDate,
                endDate = semester.EndDate
            })
            .ToList();

        var subjectOptions = options.Subjects
            .Select(subject => new
            {
                id = subject.SubjectId,
                name = subject.SubjectName,
                code = subject.SubjectCode,
                levelId = subject.LevelId,
                levelName = subject.Level?.LevelName
            })
            .ToList();

        return Ok(new
        {
            code = 200,
            data = new
            {
                levels = levelOptions,
                semesters = semesterOptions,
                subjects = subjectOptions
            }
        });
    }

    [HttpGet("{id:int}")]
    [HttpGet("~/api/Classes/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var cls = await _db.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .Include(c => c.Subject)
            .Include(c => c.Students)
                .ThenInclude(s => s.User)
            .FirstOrDefaultAsync(c => c.ClassId == id);
        
        if (cls == null) return NotFound();

        var semesterStart = cls.Semester?.StartDate.ToDateTime(TimeOnly.MinValue);
        var semesterEnd = cls.Semester?.EndDate.ToDateTime(TimeOnly.MinValue);
        var semesterName = cls.Semester?.Name;
        var levelName = cls.Level?.LevelName;
        var subject = cls.Subject;

        var semesterDetail = cls.Semester == null
            ? null
            : new
            {
                startDate = semesterStart,
                endDate = semesterEnd
            };


        var subjectDetail = subject == null
            ? null
            : new
            {
                id = subject.SubjectId,
                code = subject.SubjectCode,
                name = subject.SubjectName,
                status = subject.Status,
                levelId = subject.LevelId,
                levelName = subject.Level?.LevelName
            };

        var subjectIds = subject != null
            ? new[] { subject.SubjectId }
            : Array.Empty<int>();

        return Ok(new
        {
            code = 200,
            data = new
            {
                classId = cls.ClassId,
                className = cls.ClassName,
                status = cls.Status,
                updatedAt = cls.UpdatedAt,
                semesterName = semesterName,
                semesterId = cls.SemesterId,
                semesterStartDate = semesterStart,
                semesterEndDate = semesterEnd,
                semesterDetail = semesterDetail,
                levelName = levelName,
                levelId = cls.LevelId,
                subjectId = subject?.SubjectId,
                subjectIds = subjectIds,
                subjectCode = subject?.SubjectCode,
                subjectName = subject?.SubjectName,
                subjectLevel = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subjectDetail = subjectDetail,
                minStudents = cls.MinStudents,
                maxStudents = cls.MaxStudents,
                totalStudents = cls.Students?.Count ?? 0,
                students = cls.Students?.Select(s => new { s.StudentId, code = s.StudentCode, fullName = $"{s.User?.FirstName} {s.User?.LastName}".Trim() }) ?? (object)Enumerable.Empty<object>()
            }
        });
    }

    [HttpGet("{id:int}/getInformationOfClass")]
    public async Task<IActionResult> GetWithStudents(int id)
    {
        var item = await _classService.GetWithStudentsAsync(id);
        if (item == null) return NotFound();

        var subject = item.Subject;
        var level = item.Level;
        var semester = item.Semester;

        var response = new
        {
            classId = item.ClassId,
            className = item.ClassName,
            subjectCode = subject?.SubjectCode,
            subjectName = subject?.SubjectName,
            subject = subject == null
                ? null
                : new
                {
                    id = subject.SubjectId,
                    name = subject.SubjectName,
                    code = subject.SubjectCode,
                    levelId = subject.LevelId,
                    levelName = subject.Level?.LevelName,
                    status = subject.Status,
                    totalLesson = subject.TotalLesson,
                },
            level = level == null
                ? null
                : new
                {
                    id = level.LevelId,
                    name = level.LevelName
                },
            semester = semester == null
                ? null
                : new
                {
                    id = semester.SemesterId,
                    name = semester.Name,
                    startDate = semester.StartDate,
                    endDate = semester.EndDate
                },
            students = item.Students?
                .Select(student =>
                {
                    var user = student.User;
                    var firstName = user?.FirstName?.Trim();
                    var lastName = user?.LastName?.Trim();
                    var fullName = string.Join(" ", new[]
                    {
                        firstName,
                        lastName
                    }.Where(part => !string.IsNullOrWhiteSpace(part)));

                    return new
                    {
                        studentId = student.StudentId,
                        studentCode = student.StudentCode,
                        semesterId = student.SemesterId,
                        levelId = student.LevelId,
                        firstName = firstName,
                        lastName = lastName,
                        fullName = string.IsNullOrWhiteSpace(fullName) ? null : fullName,
                        email = user?.Email,
                        avatar = user?.Avatar
                    };
                })
                .ToList(),
            maxStudents = item.MaxStudents,
            minStudents = item.MinStudents,
            totalStudents = item.Students?.Count ?? 0
        };

        return Ok(new { code = 200, data = response });
    }

    [HttpGet("{classId:int}/eligible-students")]
    public async Task<IActionResult> GetEligibleStudents(int classId)
    {
        var cls = await _classService.GetByIdAsync(classId);
        if (cls == null) return NotFound(new { code = 404, message = "Class not found" });

        var students = await _studentService.GetEligibleForClassAsync(classId);

        var data = students.Select(student =>
        {
            var user = student.User;
            var firstName = user?.FirstName?.Trim() ?? string.Empty;
            var lastName = user?.LastName?.Trim() ?? string.Empty;
            var fullName = string.Join(" ", new[] { firstName, lastName }.Where(part => !string.IsNullOrWhiteSpace(part)));

            return new
            {
                studentId = student.StudentId,
                studentCode = student.StudentCode,
                levelId = student.LevelId,
                firstName = firstName,
                lastName = lastName,
                fullName = string.IsNullOrWhiteSpace(fullName) ? null : fullName,
                email = user?.Email,
                avatar = user?.Avatar
            };
        }).ToList();

        return Ok(new { code = 200, data });
    }

    [HttpPost("{classId:int}/students")]
    public async Task<IActionResult> AddStudents(int classId, [FromBody] AddStudentsRequest request)
    {
        if (request?.StudentIds == null || request.StudentIds.Count == 0)
        {
            return BadRequest(new { code = 400, message = "No students provided" });
        }

        var cls = await _classService.GetByIdAsync(classId);
        if (cls == null)
        {
            return NotFound(new { code = 404, message = "Class not found" });
        }

        // Enforce MaxStudents if set - get current count from DB
        if (cls.MaxStudents.HasValue)
        {
            var clsWithStudents = await _db.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);
            
            var existingCount = clsWithStudents?.Students?.Count ?? 0;
            var requestedToAdd = request.StudentIds.Count;
            if (existingCount + requestedToAdd > cls.MaxStudents.Value)
            {
                return BadRequest(new { code = 400, message = $"Adding {requestedToAdd} students would exceed class max capacity of {cls.MaxStudents.Value}" });
            }
        }

        try
        {
            Console.WriteLine($"AddStudents: Adding {request.StudentIds.Count} students to class {classId}");
            await _studentService.AddStudentsToClassAsync(classId, request.StudentIds);
            
            // Auto-activate class if minStudents is satisfied
            if (cls.MinStudents.HasValue && cls.MinStudents.Value > 0)
            {
                Console.WriteLine($"AddStudents: Checking auto-activate for class {classId}, minStudents={cls.MinStudents.Value}");
                
                // Reload class from DB with students to get fresh count
                var clsWithStudents = await _db.Classes
                    .AsNoTracking()
                    .Include(c => c.Students)
                    .FirstOrDefaultAsync(c => c.ClassId == classId);
                
                if (clsWithStudents != null)
                {
                    var currentCount = clsWithStudents.Students?.Count ?? 0;
                    var isActive = clsWithStudents.Status?.Equals("Active", StringComparison.OrdinalIgnoreCase) ?? false;
                    
                    Console.WriteLine($"AddStudents: Class {classId} has {currentCount} students, isActive={isActive}");
                    
                    if (currentCount >= cls.MinStudents.Value && !isActive)
                    {
                        Console.WriteLine($"AddStudents: Auto-activating class {classId}");
                        // Auto-activate the class by updating via service
                        await _classService.UpdateStatusAsync(classId.ToString(), true);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AddStudents error: {ex.Message}");
            Console.WriteLine($"AddStudents error stack: {ex.StackTrace}");
            if (ex is KeyNotFoundException)
            {
                return NotFound(new { code = 404, message = "Class not found" });
            }
            throw;
        }

        return Ok(new { code = 200, message = "Students added to class" });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Class request)
    {
        if (request == null) {
            Console.WriteLine("ClassController.Create called with null payload");
            return BadRequest(new { code = 400, message = "Invalid payload" });
        }

        if (!ModelState.IsValid)
        {
            Console.WriteLine("ClassController.Create - ModelState invalid: " + System.Text.Json.JsonSerializer.Serialize(ModelState));
            return BadRequest(new { code = 400, message = "Invalid payload - model state invalid", errors = ModelState });
        }

        if (request.SubjectId <= 0 || string.IsNullOrWhiteSpace(request.ClassName))
        {
            return BadRequest(new { code = 400, message = "Class name and subject are required" });
        }

        // Validate min/max if provided
        if (request.MinStudents.HasValue && request.MinStudents < 0)
            return BadRequest(new { code = 400, message = "MinStudents must be >= 0" });
        if (request.MaxStudents.HasValue && request.MaxStudents < 0)
            return BadRequest(new { code = 400, message = "MaxStudents must be >= 0" });
        if (request.MinStudents.HasValue && request.MaxStudents.HasValue && request.MinStudents > request.MaxStudents)
            return BadRequest(new { code = 400, message = "MinStudents cannot be greater than MaxStudents" });

        var duplicate = await _classService.HasDuplicateNameForSubjectAsync(request.ClassName, request.SubjectId);
        if (duplicate)
        {
            return Conflict(new
            {
                code = 409,
                message = $"Class '{request.ClassName}' is already assigned to this subject."
            });
        }

        // If request tries to create as Active, ensure MinStudents satisfied (current students would be 0)
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var min = request.MinStudents ?? 0;
            if (0 < min)
            {
                return BadRequest(new { code = 400, message = $"Cannot create class as Active: requires at least {min} students" });
            }
        }

        var created = await _classService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ClassId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Class request)
    {
        if (id != request.ClassId) return BadRequest();

        if (request.SubjectId <= 0 || string.IsNullOrWhiteSpace(request.ClassName))
        {
            return BadRequest(new { code = 400, message = "Class name and subject are required" });
        }

        // If request sets status to Active, ensure current students >= MinStudents
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var cls = await _classService.GetByIdAsync(id);
            var currentCount = cls?.Students?.Count ?? 0;
            var min = request.MinStudents ?? cls?.MinStudents ?? 0;
            if (currentCount < min)
            {
                return BadRequest(new { code = 400, message = $"Cannot activate class: current students {currentCount} less than MinStudents {min}" });
            }
        }

        // Validate min/max if provided
        if (request.MinStudents.HasValue && request.MinStudents < 0)
            return BadRequest(new { code = 400, message = "MinStudents must be >= 0" });
        if (request.MaxStudents.HasValue && request.MaxStudents < 0)
            return BadRequest(new { code = 400, message = "MaxStudents must be >= 0" });
        if (request.MinStudents.HasValue && request.MaxStudents.HasValue && request.MinStudents > request.MaxStudents)
            return BadRequest(new { code = 400, message = "MinStudents cannot be greater than MaxStudents" });

        var duplicate = await _classService.HasDuplicateNameForSubjectAsync(request.ClassName, request.SubjectId, request.ClassId);
        if (duplicate)
        {
            return Conflict(new
            {
                code = 409,
                message = $"Class '{request.ClassName}' is already assigned to this subject."
            });
        }

        var ok = await _classService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _classService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Lấy lịch học của một lớp theo semester_id và class_id (tuần đầu tiên)
    /// GET: api/staffAcademic/classes/schedule?semesterId={semesterId}&classId={classId}
    /// </summary>
    [HttpGet("schedule")]
    [ProducesResponseType(typeof(IEnumerable<ClassScheduleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClassSchedule([FromQuery] int semesterId, [FromQuery] int classId)
    {
        if (semesterId <= 0 || classId <= 0)
        {
            return BadRequest(new { code = 400, message = "semesterId and classId must be greater than 0" });
        }

        var lessons = await _classService.GetClassScheduleBySemesterAsync(semesterId, classId);

        return Ok(new { code = 200, data = lessons });
    }

    /// <summary>
    /// Tạo schedule từ patterns cho một lớp
    /// POST: api/staffAcademic/classes/schedule
    /// </summary>
    [HttpPost("schedule")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest request)
    {
        try
        {
            Console.WriteLine("=== ClassController.CreateSchedule called ===");
            Console.WriteLine($"Request: SemesterId={request.SemesterId}, ClassId={request.ClassId}, LecturerId={request.LecturerId}");
            Console.WriteLine($"Patterns count: {request.Patterns?.Count ?? 0}");

            if (!ModelState.IsValid)
            {
                return BadRequest(new { code = 400, message = "Invalid request", errors = ModelState });
            }

            if (request.Patterns == null || request.Patterns.Count == 0)
            {
                return BadRequest(new { code = 400, message = "At least one pattern is required" });
            }

            var lessonCount = await _classService.CreateScheduleFromPatternsAsync(request);

            return Ok(new
            {
                code = 200,
                message = "Schedule created successfully",
                data = new
                {
                    semesterId = request.SemesterId,
                    classId = request.ClassId,
                    lecturerId = request.LecturerId,
                    lessonsCreated = lessonCount
                }
            });
        }
        catch (ArgumentException ex)
        {
            Console.WriteLine($"ArgumentException in CreateSchedule: {ex.Message}");
            // Treat validation conflicts as 409 Conflict
            return StatusCode(409, new { code = 409, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in CreateSchedule: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    /// <summary>
    /// Lấy student schedule cache cho một class trong semester
    /// GET: api/staffAcademic/classes/{classId}/student-schedule-cache?semesterId={semesterId}
    /// </summary>
    [HttpGet("{classId:int}/student-schedule-cache")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetStudentScheduleCache(int classId, [FromQuery] int semesterId)
    {
        if (semesterId <= 0)
        {
            return BadRequest(new { code = 400, message = "semesterId must be greater than 0" });
        }

        if (classId <= 0)
        {
            return BadRequest(new { code = 400, message = "classId must be greater than 0" });
        }

        try
        {
            var semester = await _db.Semesters
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SemesterId == semesterId);

            if (semester == null)
            {
                return NotFound(new { code = 404, message = "Semester not found" });
            }

            var classEntity = await _db.Classes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity == null)
            {
                return NotFound(new { code = 404, message = "Class not found" });
            }

            var cache = await _availabilityService.BuildStudentScheduleCacheAsync(classId, semester.StartDate, semester.EndDate);

            return Ok(new { code = 200, data = cache });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetStudentScheduleCache: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    /// <summary>
    /// Lấy tất cả lessons của một semester để build conflict map
    /// GET: api/staffAcademic/classes/semester/{semesterId}/lessons
    /// </summary>
    [HttpGet("semester/{semesterId:int}/lessons")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAllLessonsBySemester(int semesterId)
    {
        if (semesterId <= 0)
        {
            return BadRequest(new { code = 400, message = "semesterId must be greater than 0" });
        }

        try
        {
            var semester = await _db.Semesters
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SemesterId == semesterId);

            if (semester == null)
            {
                return NotFound(new { code = 404, message = "Semester not found" });
            }

            // Lấy tất cả lessons trong semester
            var lessons = await _db.Lessons
                .AsNoTracking()
                .Include(l => l.Class)
                .Include(l => l.Room)
                .Include(l => l.Lecture)
                .Include(l => l.Time)
                .Where(l => l.Class.SemesterId == semesterId)
                .Select(l => new
                {
                    lessonId = l.LessonId,
                    classId = l.ClassId,
                    className = l.Class.ClassName,
                    date = l.Date.ToString("yyyy-MM-dd"),
                    roomId = l.RoomId,
                    roomName = l.Room.RoomName,
                    timeId = l.TimeId,
                    lecturerId = l.LectureId,
                    lecturerCode = l.Lecture.LecturerCode ?? "",
                    startTime = l.Time.StartTime,
                    endTime = l.Time.EndTime
                })
                .ToListAsync();

            return Ok(new { code = 200, data = lessons });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAllLessonsBySemester: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    [HttpPost("schedule/availability")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckAvailability([FromBody] AvailabilityCheckRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { code = 400, message = "Request payload is required" });
        }

        try
        {
            var result = await _availabilityService.CheckAvailabilityAsync(request);
            return Ok(new { code = 200, data = result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in CheckAvailability: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    /// <summary>
    /// Update a lesson
    /// PUT: api/staffAcademic/classes/lessons/{lessonId}
    /// </summary>
    [HttpPut("lessons/{lessonId:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateLesson(int lessonId, [FromBody] UpdateLessonRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { code = 400, message = "Request payload is required" });
        }

        try
        {
            var result = await _lessonService.UpdateAsync(lessonId, request);
            if (!result)
            {
                return NotFound(new { code = 404, message = "Lesson not found" });
            }

            return Ok(new { code = 200, message = "Lesson updated successfully", data = new { lessonId } });
        }
        catch (ArgumentException ex)
        {
            // Handle conflict errors
            if (ex.Message.Contains("conflict", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { code = 409, message = ex.Message });
            }
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in UpdateLesson: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    /// <summary>
    /// Delete a lesson
    /// DELETE: api/staffAcademic/classes/lessons/{lessonId}
    /// </summary>
    [HttpDelete("lessons/{lessonId:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLesson(int lessonId)
    {
        try
        {
            var result = await _lessonService.DeleteAsync(lessonId);
            if (!result)
            {
                return NotFound(new { code = 404, message = "Lesson not found" });
            }

            return Ok(new { code = 200, message = "Lesson deleted successfully" });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { code = 404, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in DeleteLesson: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Internal server error", error = ex.Message });
        }
    }

    [HttpGet("{classId}/subjects")]
    public async Task<IActionResult> GetSubjects(string classId)
    {
        var cls = await _classService.GetSubjectsAsync(classId);
        if (cls == null || cls.Subject == null)
        {
            return Ok(new { code = 200, message = "Success", data = Array.Empty<object>() });
        }

        var subject = cls.Subject;
        var studentCount = cls.Students?.Count ?? 0;

        var lecturerDetails = cls.Lessons?
            .Where(l => l.Lecture?.User != null)
            .GroupBy(l => l.LectureId)
            .Select(group =>
            {
                var lecture = group.First().Lecture;
                var user = lecture?.User;
                var parts = new List<string>();
                if (!string.IsNullOrWhiteSpace(user?.FirstName))
                {
                    parts.Add(user.FirstName.Trim());
                }
                if (!string.IsNullOrWhiteSpace(user?.LastName))
                {
                    parts.Add(user.LastName.Trim());
                }

                var fullName = parts.Count > 0 ? string.Join(" ", parts).Trim() : null;
                var displayName = string.IsNullOrWhiteSpace(fullName)
                    ? user?.Email ?? $"Lecture #{group.Key}"
                    : fullName;

                return (Name: displayName, Email: user?.Email);
            })
            .ToList() ?? new List<(string Name, string? Email)>();

        var lectureNames = lecturerDetails
            .Select(l => l.Name)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct()
            .ToList();

        var lectureEmails = lecturerDetails
            .Select(l => l.Email)
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Distinct()
            .ToList();

        var lectureNameString = lectureNames.Count > 0 ? string.Join(", ", lectureNames) : null;
        var lectureEmailString = lectureEmails.Count > 0 ? string.Join(", ", lectureEmails) : null;
        var enrollmentCounts = await _classService.GetSubjectEnrollmentCountsAsync(cls.ClassId);
        var totalStudentsInClass = cls.Students?.Select(s => s.StudentId).Distinct().Count() ?? 0;

        var subjectPayload = new
        {
            classId = cls.ClassId,
            className = cls.ClassName,
            subjectId = subject.SubjectId,
            subjectCode = subject.SubjectCode,
            subjectName = subject.SubjectName,
            subjectLevel = subject.Level?.LevelName ?? subject.LevelId.ToString(),
            levelName = subject.Level?.LevelName,
            lectureName = lectureNameString,
            lectureEmail = lectureEmailString,
            totalStudents = enrollmentCounts.TryGetValue(subject.SubjectId, out var count) && count > 0
                ? count
                : totalStudentsInClass > 0 ? totalStudentsInClass : studentCount,
            maxStudents = cls.MaxStudents,
            minStudents = cls.MinStudents
        };

        return Ok(new { code = 200, message = "Success", data = new[] { subjectPayload } });
    }

    [HttpPatch("{classId}/status")]
    public async Task<IActionResult> UpdateStatus(string classId, [FromBody] UpdateClassStatusRequest request)
    {
        try
        {
            // If activating, ensure MinStudents satisfied
            if (!int.TryParse(classId, out var classIdInt))
            {
                return BadRequest(new { code = 400, message = "Invalid class ID" });
            }
            
            var cls = await _classService.GetByIdAsync(classIdInt);
            if (request.Status && cls != null && cls.MinStudents.HasValue)
            {
                // Get class with students loaded to count accurately
                var clsWithStudents = await _db.Classes
                    .Include(c => c.Students)
                    .FirstOrDefaultAsync(c => c.ClassId == classIdInt);
                
                var currentCount = clsWithStudents?.Students?.Count ?? 0;
                if (currentCount < cls.MinStudents.Value)
                {
                    return BadRequest(new { code = 400, message = $"Cannot activate class: current students {currentCount} less than MinStudents {cls.MinStudents.Value}" });
                }
            }

            var updated = await _classService.UpdateStatusAsync(classId, request.Status);

            var semesterStart = updated.Semester?.StartDate.ToDateTime(TimeOnly.MinValue);
            var semesterEnd = updated.Semester?.EndDate.ToDateTime(TimeOnly.MinValue);
            var semesterName = updated.Semester?.Name;
            var levelName = updated.Level?.LevelName;

            var semesterDetail = updated.Semester == null
                ? null
                : new
                {
                    id = updated.Semester.SemesterId,
                    name = updated.Semester.Name,
                    startDate = semesterStart,
                    endDate = semesterEnd
                };

            var levelDetail = updated.Level == null
                ? null
                : new
                {
                    id = updated.Level.LevelId,
                    name = updated.Level.LevelName
                };

            return Ok(new
            {
                code = 200,
                message = "Class status updated",
                data = new
                {
                    classId = updated.ClassId,
                    className = updated.ClassName,
                    status = updated.Status,
                    updatedAt = updated.UpdatedAt,
                    semesterName = semesterName,
                    semesterId = updated.SemesterId,
                    semesterStartDate = semesterStart,
                    semesterEndDate = semesterEnd,
                    semesterDetail = semesterDetail,
                    levelName = levelName,
                    levelId = updated.LevelId,
                    levelDetail = levelDetail
                }
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { code = 404, message = "Class not found" });
        }
    }
    // Add these endpoints to ClassController.cs

    /// <summary>
    /// Lấy danh sách lớp kèm thông tin điểm để quản lý
    /// GET: api/manager/classes/with-grades
    /// </summary>
    [HttpGet("with-grades")]
    public async Task<IActionResult> GetClassesWithGrades([FromQuery] ClassGradeFilterRequest? filter)
    {
        try
        {
            var classes = await _classService.GetClassesWithGradesAsync(filter);

            return Ok(new
            {
                code = 200,
                message = "Success",
                data = classes
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                code = 500,
                message = $"Internal server error: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Lấy chi tiết lớp với danh sách sinh viên và điểm
    /// GET: api/manager/classes/{classId}/grade-details
    /// </summary>
    [HttpGet("{classId:int}/grade-details")]
    public async Task<IActionResult> GetClassGradeDetails(int classId)
    {
        try
        {
            var details = await _classService.GetClassGradeDetailsAsync(classId);

            if (details == null)
            {
                return NotFound(new
                {
                    code = 404,
                    message = $"Class with ID {classId} not found or has no subject assigned"
                });
            }

            return Ok(new
            {
                code = 200,
                message = "Success",
                data = details
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                code = 500,
                message = $"Internal server error: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Lấy danh sách toàn bộ subjects để hiển thị
    /// GET: api/staffAcademic/classes/subjects/getAllSubject
    /// </summary>
    [HttpGet("subjects/getAllSubject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllSubject()
    {
        try
        {
            var subjects = await _db.Subjects
                .AsNoTracking()
                .Where(s => s.Status == "Active")
                .OrderBy(s => s.SubjectCode)
                .Select(s => new
                {
                    subjectId = s.SubjectId,
                    subjectCode = s.SubjectCode,
                    subjectName = s.SubjectName
                })
                .ToListAsync();

            return Ok(new
            {
                code = 200,
                data = subjects
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAllSubject: {ex.Message}");
            return StatusCode(500, new
            {
                code = 500,
                message = $"Error retrieving subjects: {ex.Message}"
            });
        }
    }
    /// <summary>
    /// Lấy danh sách class có status = "Active", chỉ trả về class_id và class_name
    /// GET: api/staffAcademic/classes/active
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveClasses()
    {
        try
        {
            var activeClasses = await _db.Classes
                .AsNoTracking()
                .Where(c => c.Status != null && c.Status.ToLower() == "active")
                .OrderBy(c => c.ClassName)
                .Select(c => new
                {
                    classId = c.ClassId,
                    className = c.ClassName
                })
                .ToListAsync();

            return Ok(new
            {
                code = 200,
                data = activeClasses
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                code = 500,
                message = $"Error retrieving active classes: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Lấy danh sách class (classId, className) có status = \"Active\" theo semesterId
    /// GET: api/staffAcademic/classes/active-by-semester?semesterId={semesterId}
    /// </summary>
    [HttpGet("semesterId")]
    public async Task<IActionResult> GetActiveClassesBySemester([FromQuery] int semesterId)
    {
        if (semesterId <= 0)
        {
            return BadRequest(new { code = 400, message = "semesterId must be greater than 0" });
        }

        try
        {
            var classes = await _db.Classes
                .AsNoTracking()
                .Where(c =>
                    c.SemesterId == semesterId &&
                    c.Status != null &&
                    c.Status.ToLower() == "active")
                .OrderBy(c => c.ClassName)
                .Select(c => new
                {
                    classId = c.ClassId,
                    className = c.ClassName
                })
                .ToListAsync();

            return Ok(new { code = 200, data = classes });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = $"Error retrieving classes: {ex.Message}" });
        }
    }

    /// <summary>
    /// Lấy tất cả semesters và classes được nhóm theo semester để dùng cho schedule picker
    /// GET: api/staffAcademic/classes/schedule-options
    /// </summary>
    [HttpGet("schedule-options")]
    public async Task<IActionResult> GetScheduleOptions()
    {
        try
        {
            // Lấy tất cả semesters
            var semesters = await _db.Semesters
                .AsNoTracking()
                .OrderByDescending(s => s.StartDate)
                .Select(s => new
                {
                    semesterId = s.SemesterId,
                    name = s.Name,
                    startDate = s.StartDate.ToString("yyyy-MM-dd"),
                    endDate = s.EndDate.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            // Lấy tất cả classes active, nhóm theo semesterId
            var classesBySemester = await _db.Classes
                .AsNoTracking()
                .Include(c => c.Semester)
                .Include(c => c.Subject)
                .Where(c => c.Status != null && c.Status.ToLower() == "active")
                .OrderBy(c => c.ClassName)
                .Select(c => new
                {
                    classId = c.ClassId,
                    className = c.ClassName,
                    semesterId = c.SemesterId,
                    subjectId = c.SubjectId,
                    subjectCode = c.Subject != null ? c.Subject.SubjectCode : null,
                    subjectName = c.Subject != null ? c.Subject.SubjectName : null
                })
                .ToListAsync();

            // Nhóm classes theo semesterId
            var groupedClasses = classesBySemester
                .GroupBy(c => c.semesterId)
                .ToDictionary(g => g.Key, g => g.Select(c => new
                {
                    classId = c.classId,
                    className = c.className,
                    subjectId = c.subjectId,
                    subjectCode = c.subjectCode,
                    subjectName = c.subjectName
                }).ToList());

            return Ok(new
            {
                code = 200,
                data = new
                {
                    semesters = semesters,
                    classesBySemester = groupedClasses
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                code = 500,
                message = $"Error retrieving schedule options: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Get all lessons (slots) of a class (accessible via both staffAcademic and general routes)
    /// GET: api/staffAcademic/classes/{classId}/lessons
    /// GET: api/Classes/{classId}/lessons
    /// </summary>
    [HttpGet("{classId:int}/lessons")]
    [HttpGet("~/api/Classes/{classId:int}/lessons")]
    public async Task<IActionResult> GetLessonsByClass(int classId)
    {
        if (classId <= 0)
        {
            return BadRequest(new { code = 400, message = "classId must be greater than 0" });
        }

        try
        {
            var lessons = await _db.Lessons
                .AsNoTracking()
                .Include(l => l.Time)
                .Include(l => l.Room)
                .Include(l => l.Class)
                    .ThenInclude(c => c.Subject)
                .Where(l => l.ClassId == classId)
                .OrderBy(l => l.Date)
                .ThenBy(l => l.Time.StartTime)
                .Select(l => new
                {
                    lessonId = l.LessonId,
                    classId = l.ClassId,
                    className = l.Class.ClassName,
                    subjectCode = l.Class.Subject.SubjectCode,
                    date = l.Date.ToString("yyyy-MM-dd"),
                    startTime = l.Time != null ? l.Time.StartTime.ToString("HH:mm") : null,
                    endTime = l.Time != null ? l.Time.EndTime.ToString("HH:mm") : null,
                    roomName = l.Room != null ? l.Room.RoomName : null,
                    roomId = l.RoomId,
                    slotId = l.TimeId
                })
                .ToListAsync();

            return Ok(new { code = 200, data = lessons });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { code = 500, message = $"Failed to load lessons: {ex.Message}" });
        }
    }
}

public class UpdateClassStatusRequest
{
    public bool Status { get; set; }
}

public class AddStudentsRequest
{
    public List<int> StudentIds { get; set; } = new();
}




