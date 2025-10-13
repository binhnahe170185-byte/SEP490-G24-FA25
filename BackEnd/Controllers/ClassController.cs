using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.Models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/manager/classes")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;

    public ClassController(IClassService classService)
    {
        _classService = classService;
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

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _classService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpGet("{id:int}/students")]
    public async Task<IActionResult> GetWithStudents(int id)
    {
        var item = await _classService.GetWithStudentsAsync(id);
        if (item == null) return NotFound();
        return Ok(new { code = 200, data = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Class request)
    {
        var created = await _classService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ClassId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Class request)
    {
        if (id != request.ClassId) return BadRequest();
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

    [HttpGet("{classId}/subjects")]
    public async Task<IActionResult> GetSubjects(string classId)
    {
        var cls = await _classService.GetSubjectsAsync(classId);
        if (cls == null || cls.Subjects == null || cls.Subjects.Count == 0)
        {
            return Ok(new { code = 200, message = "Success", data = Array.Empty<object>() });
        }

        var subjects = cls.Subjects.OrderBy(s => s.SubjectName).ToList();
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
            .ToList() ?? new List<(string Name, string Email)>();

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

        var result = subjects
            .Select(s => new
            {
                class_id = s.ClassId.ToString(),
                classId = s.ClassId,
                class_name = cls.ClassName,
                subject_id = s.SubjectId,
                subject_code = s.SubjectCode,
                subject_name = s.SubjectName,
                subject_level = s.Level?.LevelName ?? s.LevelId.ToString(),
                level_name = s.Level?.LevelName,
                lecture_name = lectureNameString,
                lecture_email = lectureEmailString,
                total_students = enrollmentCounts.TryGetValue(s.SubjectId, out var count) && count > 0
                    ? count
                    : totalStudentsInClass
            })
            .ToList();

        return Ok(new { code = 200, message = "Success", data = result });
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
}

public class UpdateClassStatusRequest
{
    public bool Status { get; set; }
}




