using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;

namespace FJAP.Repositories.Interfaces;

public interface IAttendanceRepository : IGenericRepository<Attendance>
{
    Task<Lesson?> GetLessonWithDetailsAsync(int lessonId, int lecturerId);
    Task<List<AttendanceClassDto>> GetClassesByLecturerAsync(int lecturerId);
    Task<List<AttendanceLessonDto>> GetLessonsByClassAsync(int classId, int lecturerId);
    Task<List<AttendanceStudentDto>> GetStudentsByLessonAsync(int lessonId, int classId);
    Task<Dictionary<int, Attendance>> GetAttendanceRecordsByLessonAsync(int lessonId);
    Task<Attendance?> GetAttendanceByLessonAndStudentAsync(int lessonId, int studentId);
    Task<bool> IsStudentInClassAsync(int classId, int studentId);
    Task<List<int>> GetLessonIdsByClassAsync(int classId, int lecturerId);
    Task<List<Attendance>> GetAttendancesByLessonIdsAsync(List<int> lessonIds);
    Task<List<AttendanceStudentInfoDto>> GetStudentsByClassAsync(int classId);
    Task<List<AttendanceReportDetailItemDto>> GetAttendanceReportDetailByClassAsync(int classId, int lecturerId);
}

