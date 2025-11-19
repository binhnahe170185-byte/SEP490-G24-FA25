using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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

        var studentsClause = string.Join(",", studentIds);
        var sqlBuilder = new StringBuilder();
        sqlBuilder.AppendLine("SELECT e.student_id AS student_id,");
        sqlBuilder.AppendLine("       l.date AS date,");
        sqlBuilder.AppendLine("       l.time_id AS time_id");
        sqlBuilder.AppendLine("FROM enrollment e");
        sqlBuilder.AppendLine("INNER JOIN lesson l ON l.class_id = e.class_id");
        sqlBuilder.AppendLine($"WHERE l.date >= '{semesterStart:yyyy-MM-dd}'");
        sqlBuilder.AppendLine($"  AND l.date <= '{semesterEnd:yyyy-MM-dd}'");
        sqlBuilder.AppendLine($"  AND e.student_id IN ({studentsClause})");

        var snapshots = await _context.StudentScheduleSnapshots
            .FromSqlRaw(sqlBuilder.ToString())
            .AsNoTracking()
            .ToListAsync();

        foreach (var snapshot in snapshots)
        {
            var key = $"{snapshot.Date:yyyy-MM-dd}|{snapshot.TimeId}";
            if (!cache.StudentTimeMap.TryGetValue(snapshot.StudentId, out var slots))
            {
                slots = new HashSet<string>();
                cache.StudentTimeMap[snapshot.StudentId] = slots;
            }
            slots.Add(key);
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

        var slotSql = new StringBuilder();
        slotSql.AppendLine("SELECT l.class_id AS class_id,");
        slotSql.AppendLine("       l.room_id AS room_id,");
        slotSql.AppendLine("       l.lecture_id AS lecture_id,");
        slotSql.AppendLine("       l.date AS date,");
        slotSql.AppendLine("       l.time_id AS time_id");
        slotSql.AppendLine("FROM lesson l");
        slotSql.AppendLine($"WHERE l.date = '{request.Date:yyyy-MM-dd}'");
        slotSql.AppendLine($"  AND l.time_id = {request.TimeId}");

        var slotSnapshots = await _context.ScheduleSlotSnapshots
            .FromSqlRaw(slotSql.ToString())
            .AsNoTracking()
            .ToListAsync();

        var response = new AvailabilityCheckResponse();

        if (request.ClassId.HasValue)
        {
            response.IsClassBusy = slotSnapshots.Any(s => s.ClassId == request.ClassId.Value);
            if (response.IsClassBusy && !response.ConflictedClassIds.Contains(request.ClassId.Value))
            {
                response.ConflictedClassIds.Add(request.ClassId.Value);
            }
        }

        if (request.RoomId.HasValue)
        {
            var conflictedClasses = slotSnapshots
                .Where(s => s.RoomId == request.RoomId.Value)
                .Select(s => s.ClassId)
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
            response.IsLecturerBusy = slotSnapshots.Any(s => s.LecturerId == request.LecturerId.Value);
        }

        if (request.StudentIds != null && request.StudentIds.Any())
        {
            var studentsClause = string.Join(",", request.StudentIds.Distinct());
            var studentSql = new StringBuilder();
            studentSql.AppendLine("SELECT e.student_id AS student_id,");
            studentSql.AppendLine("       l.date AS date,");
            studentSql.AppendLine("       l.time_id AS time_id");
            studentSql.AppendLine("FROM enrollment e");
            studentSql.AppendLine("INNER JOIN lesson l ON l.class_id = e.class_id");
            studentSql.AppendLine($"WHERE l.date = '{request.Date:yyyy-MM-dd}'");
            studentSql.AppendLine($"  AND l.time_id = {request.TimeId}");
            studentSql.AppendLine($"  AND e.student_id IN ({studentsClause})");

            var studentSnapshots = await _context.StudentScheduleSnapshots
                .FromSqlRaw(studentSql.ToString())
                .AsNoTracking()
                .ToListAsync();

            response.ConflictedStudentIds = studentSnapshots
                .Select(s => s.StudentId)
                .Distinct()
                .ToList();
        }

        return response;
    }
}