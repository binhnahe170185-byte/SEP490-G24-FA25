using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/staffAcademic/classes")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;
    private readonly IStudentService _studentService;

    public ClassController(IClassService classService, IStudentService studentService)
    {
        _classService = classService;
        _studentService = studentService;
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
                class_id = cls.ClassId.ToString(),
                classId = cls.ClassId,
                class_name = cls.ClassName,
                className = cls.ClassName,
                status = cls.Status,
                updated_at = cls.UpdatedAt,
                updatedAt = cls.UpdatedAt,
                semester = semesterName,
                semester_name = semesterName,
                semesterName = semesterName,
                semester_id = cls.SemesterId,
                semesterId = cls.SemesterId,
                semester_start_date = semesterStart,
                semesterStartDate = semesterStart,
                semester_end_date = semesterEnd,
                semesterEndDate = semesterEnd,
                semester_detail = semesterDetail,
                semesterDetail = semesterDetail,
                subject_id = subject?.SubjectId,
                subjectId = subject?.SubjectId,
                subject_code = subject?.SubjectCode,
                subjectCode = subject?.SubjectCode,
                subject_name = subject?.SubjectName,
                subjectName = subject?.SubjectName,
                subject_level = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subjectLevel = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subject_detail = subjectDetail,
                subjectDetail = subjectDetail,
                level = levelName,
                level_name = levelName,
                levelName = levelName,
                level_id = cls.Level?.LevelId ?? cls.LevelId,
                levelId = cls.LevelId,
                level_detail = levelDetail,
                levelDetail = levelDetail
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
    public async Task<IActionResult> GetById(int id)
    {
        var cls = await _classService.GetByIdAsync(id);
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
                class_id = cls.ClassId.ToString(),
                classId = cls.ClassId,
                class_name = cls.ClassName,
                className = cls.ClassName,
                status = cls.Status,
                updated_at = cls.UpdatedAt,
                updatedAt = cls.UpdatedAt,
                semester = semesterName,
                semester_name = semesterName,
                semesterName = semesterName,
                semester_id = cls.SemesterId,
                semesterId = cls.SemesterId,
                semester_start_date = semesterStart,
                semesterStartDate = semesterStart,
                semester_end_date = semesterEnd,
                semesterEndDate = semesterEnd,
                semester_detail = semesterDetail,
                semesterDetail = semesterDetail,
                level = levelName,
                level_name = levelName,
                levelName = levelName,
                level_id = cls.Level?.LevelId ?? cls.LevelId,
                levelId = cls.LevelId,
                level_detail = levelDetail,
                levelDetail = levelDetail,
                subject_id = subject?.SubjectId,
                subjectId = subject?.SubjectId,
                subject_ids = subjectIds,
                subjectIds = subjectIds,
                subject_code = subject?.SubjectCode,
                subjectCode = subject?.SubjectCode,
                subject_name = subject?.SubjectName,
                subjectName = subject?.SubjectName,
                subject_level = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subjectLevel = subject?.Level?.LevelName ?? subject?.LevelId.ToString(),
                subject_detail = subjectDetail,
                subjectDetail = subjectDetail
            }
        });
    }

    [HttpGet("{id:int}/students")]
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
                    subjectCode = subject.SubjectCode,
                    subjectName = subject.SubjectName,
                    levelId = subject.LevelId,
                    levelName = subject.Level?.LevelName,
                    status = subject.Status
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
                        student_code = student.StudentCode,
                        semesterId = student.SemesterId,
                        levelId = student.LevelId,
                        first_name = firstName,
                        last_name = lastName,
                        fullName = string.IsNullOrWhiteSpace(fullName) ? null : fullName,
                        email = user?.Email,
                        avatar = user?.Avatar
                    };
                })
                .ToList()
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
                student_id = student.StudentId,
                studentId = student.StudentId,
                student_code = student.StudentCode,
                studentCode = student.StudentCode,
                level_id = student.LevelId,
                levelId = student.LevelId,
                first_name = firstName,
                firstName,
                last_name = lastName,
                lastName,
                full_name = string.IsNullOrWhiteSpace(fullName) ? null : fullName,
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

        try
        {
            await _studentService.AddStudentsToClassAsync(classId, request.StudentIds);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { code = 404, message = "Class not found" });
        }

        return Ok(new { code = 200, message = "Students added to class" });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Class request)
    {
        if (request == null) return BadRequest(new { code = 400, message = "Invalid payload" });

        if (request.SubjectId <= 0 || string.IsNullOrWhiteSpace(request.ClassName))
        {
            return BadRequest(new { code = 400, message = "Class name and subject are required" });
        }

        var duplicate = await _classService.HasDuplicateNameForSubjectAsync(request.ClassName, request.SubjectId);
        if (duplicate)
        {
            return Conflict(new
            {
                code = 409,
                message = $"Class '{request.ClassName}' is already assigned to this subject."
            });
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
    /// GET: api/manager/classes/schedule?semesterId={semesterId}&classId={classId}
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
           class_id = cls.ClassId.ToString(),
           classId = cls.ClassId,
           class_name = cls.ClassName,
           subject_id = subject.SubjectId,
           subject_code = subject.SubjectCode,
           subject_name = subject.SubjectName,
           subject_level = subject.Level?.LevelName ?? subject.LevelId.ToString(),
           level_name = subject.Level?.LevelName,
           lecture_name = lectureNameString,
           lecture_email = lectureEmailString,
           total_students = enrollmentCounts.TryGetValue(subject.SubjectId, out var count) && count > 0
               ? count
               : totalStudentsInClass > 0 ? totalStudentsInClass : studentCount
       };

       return Ok(new { code = 200, message = "Success", data = new[] { subjectPayload } });
    }

    [HttpPatch("{classId}/status")]
    public async Task<IActionResult> UpdateStatus(string classId, [FromBody] UpdateClassStatusRequest request)
    {
        try
        {
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
                    class_id = updated.ClassId.ToString(),
                    classId = updated.ClassId,
                    class_name = updated.ClassName,
                    className = updated.ClassName,
                    status = updated.Status,
                    updated_at = updated.UpdatedAt,
                    updatedAt = updated.UpdatedAt,
                    semester = semesterName,
                    semester_name = semesterName,
                    semesterName = semesterName,
                    semester_id = updated.SemesterId,
                    semesterId = updated.SemesterId,
                    semester_start_date = semesterStart,
                    semesterStartDate = semesterStart,
                    semester_end_date = semesterEnd,
                    semesterEndDate = semesterEnd,
                    level = levelName,
                    level_name = levelName,
                    levelName = levelName,
                    level_id = updated.Level?.LevelId ?? updated.LevelId,
                    levelId = updated.LevelId,
                    semester_detail = semesterDetail,
                    semesterDetail = semesterDetail,
                    level_detail = levelDetail,
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
}

public class UpdateClassStatusRequest
{
    public bool Status { get; set; }
}

public class AddStudentsRequest
{
    public List<int> StudentIds { get; set; } = new();
}




