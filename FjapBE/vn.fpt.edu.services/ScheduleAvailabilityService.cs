using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class ScheduleAvailabilityService : IScheduleAvailabilityService
{
    private readonly FjapDbContext _context;

    public ScheduleAvailabilityService(FjapDbContext context)
    {
        _context = context;
    }

    public async Task<StudentScheduleCache> BuildStudentScheduleCacheAsync(int classId, DateOnly semesterStart, DateOnly semesterEnd)
    {
        var studentIds = await _context.Classes
            .Where(c => c.ClassId == classId)
            .SelectMany(c => c.Students.Select(s => s.StudentId))
            .Distinct()
            .ToListAsync();

        var cache = new StudentScheduleCache
        {
            StudentIds = studentIds,
            StudentTimeMap = studentIds.ToDictionary(id => id, _ => new HashSet<string>())
        };

        if (!studentIds.Any())
        {
            return cache;
        }

        // Query directly from Lesson and Enrollment (many-to-many relationship)
        var studentLessons = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.Date >= semesterStart && l.Date <= semesterEnd)
            .Where(l => l.Class.Students.Any(s => studentIds.Contains(s.StudentId)))
            .Select(l => new
            {
                StudentIds = l.Class.Students
                    .Where(s => studentIds.Contains(s.StudentId))
                    .Select(s => s.StudentId)
                    .ToList(),
                Date = l.Date,
                TimeId = l.TimeId
            })
            .ToListAsync();

        foreach (var lesson in studentLessons)
        {
            var key = $"{lesson.Date:yyyy-MM-dd}|{lesson.TimeId}";
            foreach (var studentId in lesson.StudentIds)
            {
                if (cache.StudentTimeMap.TryGetValue(studentId, out var slots))
                {
                    slots.Add(key);
                }
            }
        }

        return cache;
    }

    public async Task<AvailabilityCheckResponse> CheckAvailabilityAsync(AvailabilityCheckRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (request.TimeId <= 0)
        {
            throw new ArgumentException("timeId must be greater than 0", nameof(request));
        }

        if (request.Date == default)
        {
            throw new ArgumentException("date must be provided", nameof(request));
        }

        // Query directly from Lesson table
        var conflictingLessons = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.Date == request.Date && l.TimeId == request.TimeId)
            .Select(l => new
            {
                ClassId = l.ClassId,
                RoomId = l.RoomId,
                LectureId = l.LectureId,
                StudentIds = l.Class.Students.Select(s => s.StudentId).ToList()
            })
            .ToListAsync();

        var response = new AvailabilityCheckResponse();

        if (request.ClassId.HasValue)
        {
            response.IsClassBusy = conflictingLessons.Any(l => l.ClassId == request.ClassId.Value);
            if (response.IsClassBusy && !response.ConflictedClassIds.Contains(request.ClassId.Value))
            {
                response.ConflictedClassIds.Add(request.ClassId.Value);
            }
        }

        if (request.RoomId.HasValue)
        {
            var conflictedClasses = conflictingLessons
                .Where(l => l.RoomId == request.RoomId.Value)
                .Select(l => l.ClassId)
                .Distinct()
                .ToList();
            response.IsRoomBusy = conflictedClasses.Any();
            foreach (var classId in conflictedClasses)
            {
                if (!response.ConflictedClassIds.Contains(classId))
                {
                    response.ConflictedClassIds.Add(classId);
                }
            }
        }

        if (request.LecturerId.HasValue)
        {
            response.IsLecturerBusy = conflictingLessons.Any(l => l.LectureId == request.LecturerId.Value);
        }

        if (request.StudentIds != null && request.StudentIds.Any())
        {
            var studentIdSet = request.StudentIds.Distinct().ToHashSet();
            response.ConflictedStudentIds = conflictingLessons
                .SelectMany(l => l.StudentIds)
                .Where(id => studentIdSet.Contains(id))
                .Distinct()
                .ToList();
        }

        return response;
    }
}