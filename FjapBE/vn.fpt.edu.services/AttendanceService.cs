using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services;

public class AttendanceService : IAttendanceService
{
    private readonly IAttendanceRepository _attendanceRepository;

    public AttendanceService(IAttendanceRepository attendanceRepository)
    {
        _attendanceRepository = attendanceRepository;
    }

    public async Task<int?> GetLecturerIdByUserIdAsync(int userId)
    {
        return await _attendanceRepository.GetLecturerIdByUserIdAsync(userId);
    }

    public async Task<List<AttendanceClassDto>> GetClassesAsync(int lecturerId)
    {
        return await _attendanceRepository.GetClassesByLecturerAsync(lecturerId);
    }

    public async Task<List<AttendanceLessonDto>> GetLessonsByClassAsync(int classId, int lecturerId)
    {
        return await _attendanceRepository.GetLessonsByClassAsync(classId, lecturerId);
    }

    public async Task<AttendanceLessonStudentsResponseDto?> GetStudentsByLessonAsync(int lessonId, int lecturerId)
    {
        var lesson = await _attendanceRepository.GetLessonWithDetailsAsync(lessonId, lecturerId);
        if (lesson == null)
        {
            return null;
        }

        var students = await _attendanceRepository.GetStudentsByLessonAsync(lessonId, lesson.ClassId);

        return new AttendanceLessonStudentsResponseDto
        {
            LessonId = lesson.LessonId,
            ClassId = lesson.ClassId,
            Date = lesson.Date.ToString("yyyy-MM-dd"),
            RoomName = lesson.Room?.RoomName,
            TimeSlot = $"{lesson.Time.StartTime:HH\\:mm}-{lesson.Time.EndTime:HH\\:mm}",
            SubjectName = lesson.Class.Subject.SubjectName,
            Students = students
        };
    }

    public async Task<Attendance?> UpdateAttendanceAsync(int lessonId, int studentId, string status, int lecturerId)
    {
        var lesson = await _attendanceRepository.GetLessonWithDetailsAsync(lessonId, lecturerId);
        if (lesson == null)
        {
            return null;
        }

        // Business rule: Lecturer can only take attendance on the lesson date itself
        var lessonDate = lesson.Date; // Already DateOnly type
        var currentDate = DateOnly.FromDateTime(DateTime.UtcNow); // Get current date as DateOnly
        var daysDifference = currentDate.DayNumber - lessonDate.DayNumber;

        // Only allow attendance on the lesson date (same day)
        if (daysDifference != 0)
        {
            throw new InvalidOperationException(
                $"Attendance can only be taken on the lesson date. Lesson date: {lessonDate:yyyy-MM-dd}. Attendance cannot be taken after 23:59 of {lessonDate:yyyy-MM-dd}.");
        }

        var isStudentInClass = await _attendanceRepository.IsStudentInClassAsync(lesson.ClassId, studentId);
        if (!isStudentInClass)
        {
            return null;
        }

        var attendance = await _attendanceRepository.GetAttendanceByLessonAndStudentAsync(lessonId, studentId);

        if (attendance == null)
        {
            attendance = new Attendance
            {
                LessonId = lessonId,
                StudentId = studentId,
                Status = status,
                TimeAttendance = DateTime.UtcNow
            };
            await _attendanceRepository.AddAsync(attendance);
        }
        else
        {
            attendance.Status = status;
            attendance.TimeAttendance = DateTime.UtcNow;
            _attendanceRepository.Update(attendance);
        }

        await _attendanceRepository.SaveChangesAsync();
        return attendance;
    }

    public async Task<List<AttendanceReportItemDto>> GetAttendanceReportAsync(int classId, int lecturerId)
    {
        // Verify that the lecturer teaches this class
        var lessonIds = await _attendanceRepository.GetLessonIdsByClassAsync(classId, lecturerId);
        if (!lessonIds.Any())
        {
            return new List<AttendanceReportItemDto>();
        }

        var students = await _attendanceRepository.GetStudentsByClassAsync(classId);
        var attendances = await _attendanceRepository.GetAttendancesByLessonIdsAsync(lessonIds);

        var reportData = students.Select(student =>
        {
            var studentAttendances = attendances
                .Where(a => a.StudentId == student.StudentId)
                .ToList();

            var presentCount = studentAttendances.Count(a => a.Status == "Present");
            var absentCount = studentAttendances.Count(a => a.Status == "Absent" || a.Status == null);

            return new AttendanceReportItemDto
            {
                Student = student,
                PresentCount = presentCount,
                AbsentCount = absentCount
            };
        }).ToList();

        return reportData;
    }

    public async Task<List<AttendanceReportDetailItemDto>> GetAttendanceReportDetailByClassAsync(int classId, int lecturerId)
    {
        return await _attendanceRepository.GetAttendanceReportDetailByClassAsync(classId, lecturerId);
    }

    public async Task<List<object>> UpdateBulkAttendanceAsync(int lessonId, List<AttendanceUpdateItemDto> attendances, int lecturerId)
    {
        var lesson = await _attendanceRepository.GetLessonWithDetailsAsync(lessonId, lecturerId);
        if (lesson == null)
        {
            throw new InvalidOperationException("Lesson not found or not owned by lecturer");
        }

        // Business rule: Lecturer can only take attendance on the lesson date itself
        var lessonDate = lesson.Date; // Already DateOnly type
        var currentDate = DateOnly.FromDateTime(DateTime.UtcNow); // Get current date as DateOnly
        var daysDifference = currentDate.DayNumber - lessonDate.DayNumber;

        // Only allow attendance on the lesson date (same day)
        if (daysDifference != 0)
        {
            throw new InvalidOperationException(
                $"Attendance can only be taken on the lesson date. Lesson date: {lessonDate:yyyy-MM-dd}. Attendance cannot be taken after 23:59 of {lessonDate:yyyy-MM-dd}.");
        }

        var validStudentIds = (await _attendanceRepository.GetStudentsByClassAsync(lesson.ClassId))
            .Select(s => s.StudentId)
            .ToHashSet();

        var results = new List<object>();
        var now = DateTime.UtcNow;

        var existingAttendances = await _attendanceRepository.GetAttendanceRecordsByLessonAsync(lessonId);

        foreach (var att in attendances)
        {
            if (!validStudentIds.Contains(att.StudentId))
            {
                continue;
            }

            if (existingAttendances.TryGetValue(att.StudentId, out var attendance))
            {
                attendance.Status = att.Status;
                attendance.TimeAttendance = now;
                _attendanceRepository.Update(attendance);
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
                    LessonId = lessonId,
                    StudentId = att.StudentId,
                    Status = att.Status,
                    TimeAttendance = now
                };
                await _attendanceRepository.AddAsync(attendance);
                results.Add(new
                {
                    attendanceId = attendance.AttendanceId,
                    studentId = att.StudentId,
                    status = att.Status,
                    created = true
                });
            }
        }

        await _attendanceRepository.SaveChangesAsync();
        return results;
    }
}

