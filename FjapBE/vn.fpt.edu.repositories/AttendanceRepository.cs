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

    public async Task<List<AttendanceReportDetailItemDto>> GetAttendanceReportDetailBySubjectAndSemesterAsync(int subjectId, int semesterId, int lecturerId)
    {
        // Lấy tất cả classes có cùng subjectId và semesterId
        var classIds = await _context.Classes
            .AsNoTracking()
            .Where(c => c.SubjectId == subjectId && c.SemesterId == semesterId)
            .Select(c => c.ClassId)
            .ToListAsync();

        if (!classIds.Any())
        {
            return new List<AttendanceReportDetailItemDto>();
        }

        // Lấy tất cả lessons của các classes đó mà giảng viên dạy
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
            .Include(l => l.Room)
            .Include(l => l.Time)
            .Where(l => classIds.Contains(l.ClassId) && l.LectureId == lecturerId)
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new
            {
                l.LessonId,
                l.ClassId,
                ClassName = l.Class.ClassName,
                Date = l.Date.ToString("yyyy-MM-dd"),
                RoomName = l.Room.RoomName,
                TimeSlot = $"{l.Time.StartTime:HH\\:mm}-{l.Time.EndTime:HH\\:mm}"
            })
            .ToListAsync();

        if (!lessons.Any())
        {
            return new List<AttendanceReportDetailItemDto>();
        }

        var lessonIds = lessons.Select(l => l.LessonId).ToList();

        // Lấy tất cả students trong các classes đó (loại bỏ duplicate)
        // Load dữ liệu trước, sau đó group và distinct trong memory
        var studentsData = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Students)
                .ThenInclude(s => s.User)
            .Where(c => classIds.Contains(c.ClassId))
            .SelectMany(c => c.Students)
            .Select(s => new
            {
                s.StudentId,
                s.StudentCode,
                FirstName = s.User.FirstName,
                LastName = s.User.LastName
            })
            .ToListAsync();

        // Loại bỏ duplicate trong memory
        var students = studentsData
            .GroupBy(s => s.StudentId)
            .Select(g => g.First())
            .Select(s => new AttendanceStudentInfoDto
            {
                StudentId = s.StudentId,
                StudentCode = s.StudentCode,
                User = new AttendanceUserInfoDto
                {
                    FirstName = s.FirstName,
                    LastName = s.LastName
                }
            })
            .OrderBy(s => s.StudentCode)
            .ToList();

        // Lấy tất cả attendances của các lessons đó
        var attendances = await _context.Attendances
            .AsNoTracking()
            .Where(a => lessonIds.Contains(a.LessonId))
            .ToListAsync();

        // Nhóm attendances theo studentId và lessonId
        var attendanceDict = attendances
            .GroupBy(a => a.StudentId)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(a => a.LessonId, a => a)
            );

        // Tạo report data
        var reportData = students.Select(student =>
        {
            var studentAttendances = attendanceDict.TryGetValue(student.StudentId, out var attDict) 
                ? attDict 
                : new Dictionary<int, Attendance>();

            var lessonDetails = lessons.Select(lesson =>
            {
                var attendance = studentAttendances.TryGetValue(lesson.LessonId, out var att) 
                    ? att 
                    : null;

                return new AttendanceLessonDetailDto
                {
                    LessonId = lesson.LessonId,
                    ClassId = lesson.ClassId,
                    ClassName = lesson.ClassName,
                    Date = lesson.Date,
                    RoomName = lesson.RoomName,
                    TimeSlot = lesson.TimeSlot,
                    Status = attendance?.Status,
                    AttendanceId = attendance?.AttendanceId,
                    TimeAttendance = attendance?.TimeAttendance
                };
            }).ToList();

            return new AttendanceReportDetailItemDto
            {
                Student = student,
                Lessons = lessonDetails
            };
        }).ToList();

        return reportData;
    }
}

