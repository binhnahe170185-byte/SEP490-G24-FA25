using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class AttendanceRepository : GenericRepository<Attendance>, IAttendanceRepository
{
    public AttendanceRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Lesson?> GetLessonWithDetailsAsync(int lessonId, int lecturerId)
    {
        return await _context.Lessons
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Time)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId && l.LectureId == lecturerId);
    }

    public async Task<List<AttendanceClassDto>> GetClassesByLecturerAsync(int lecturerId)
    {
        var classes = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.LectureId == lecturerId)
            .GroupBy(l => new
            {
                l.ClassId,
                l.Class.ClassName,
                SubjectName = l.Class.Subject.SubjectName,
                SubjectCode = l.Class.Subject.SubjectCode
            })
            .Select(g => new AttendanceClassDto
            {
                ClassId = g.Key.ClassId,
                ClassName = g.Key.ClassName,
                SubjectName = g.Key.SubjectName,
                SubjectCode = g.Key.SubjectCode
            })
            .OrderBy(c => c.ClassName)
            .ToListAsync();

        return classes;
    }

    public async Task<List<AttendanceLessonDto>> GetLessonsByClassAsync(int classId, int lecturerId)
    {
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.ClassId == classId && l.LectureId == lecturerId)
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new AttendanceLessonDto
            {
                LessonId = l.LessonId,
                ClassId = l.ClassId,
                Date = l.Date.ToString("yyyy-MM-dd"),
                RoomName = l.Room.RoomName,
                TimeSlot = $"{l.Time.StartTime:HH\\:mm}-{l.Time.EndTime:HH\\:mm}",
                SubjectName = l.Class.Subject.SubjectName
            })
            .ToListAsync();

        return lessons;
    }

    public async Task<List<AttendanceStudentDto>> GetStudentsByLessonAsync(int lessonId, int classId)
    {
        var students = await _context.Classes
            .Where(c => c.ClassId == classId)
            .SelectMany(c => c.Students)
            .Select(s => new
            {
                s.StudentId,
                s.StudentCode,
                FirstName = s.User.FirstName,
                LastName = s.User.LastName,
                Avatar = s.User.Avatar
            })
            .OrderBy(s => s.StudentCode)
            .ToListAsync();

        var attendanceRecords = await _context.Attendances
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
                _context.Attendances.Add(attendance);
                attendanceRecords[student.StudentId] = attendance;
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            await _context.SaveChangesAsync();
        }

        return students.Select(student =>
        {
            var attendance = attendanceRecords[student.StudentId];
            return new AttendanceStudentDto
            {
                StudentId = student.StudentId,
                StudentCode = student.StudentCode,
                FirstName = student.FirstName ?? string.Empty,
                LastName = student.LastName ?? string.Empty,
                Avatar = student.Avatar,
                Status = attendance.Status ?? "Absent",
                AttendanceId = attendance.AttendanceId,
                TimeAttendance = attendance.TimeAttendance
            };
        }).ToList();
    }

    public async Task<Dictionary<int, Attendance>> GetAttendanceRecordsByLessonAsync(int lessonId)
    {
        return await _context.Attendances
            .Where(a => a.LessonId == lessonId)
            .ToDictionaryAsync(a => a.StudentId);
    }

    public async Task<Attendance?> GetAttendanceByLessonAndStudentAsync(int lessonId, int studentId)
    {
        return await _context.Attendances
            .FirstOrDefaultAsync(a => a.LessonId == lessonId && a.StudentId == studentId);
    }

    public async Task<bool> IsStudentInClassAsync(int classId, int studentId)
    {
        return await _context.Classes
            .Where(c => c.ClassId == classId)
            .SelectMany(c => c.Students)
            .AnyAsync(s => s.StudentId == studentId);
    }

    public async Task<List<int>> GetLessonIdsByClassAsync(int classId, int lecturerId)
    {
        return await _context.Lessons
            .AsNoTracking()
            .Where(l => l.ClassId == classId && l.LectureId == lecturerId)
            .Select(l => l.LessonId)
            .ToListAsync();
    }

    public async Task<List<Attendance>> GetAttendancesByLessonIdsAsync(List<int> lessonIds)
    {
        return await _context.Attendances
            .AsNoTracking()
            .Where(a => lessonIds.Contains(a.LessonId))
            .ToListAsync();
    }

    public async Task<List<AttendanceStudentInfoDto>> GetStudentsByClassAsync(int classId)
    {
        return await _context.Classes
            .Where(c => c.ClassId == classId)
            .SelectMany(c => c.Students)
            .Select(s => new AttendanceStudentInfoDto
            {
                StudentId = s.StudentId,
                StudentCode = s.StudentCode,
                User = new AttendanceUserInfoDto
                {
                    FirstName = s.User.FirstName,
                    LastName = s.User.LastName
                }
            })
            .OrderBy(s => s.StudentCode)
            .ToListAsync();
    }
}

