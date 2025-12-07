using FJAP.DTOs;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface IAttendanceService
{
    Task<int?> GetLecturerIdByUserIdAsync(int userId);
    Task<List<AttendanceClassDto>> GetClassesAsync(int lecturerId);
    Task<List<AttendanceLessonDto>> GetLessonsByClassAsync(int classId, int lecturerId);
    Task<AttendanceLessonStudentsResponseDto?> GetStudentsByLessonAsync(int lessonId, int lecturerId);
    Task<Attendance?> UpdateAttendanceAsync(int lessonId, int studentId, string status, int lecturerId);
    Task<List<AttendanceReportItemDto>> GetAttendanceReportAsync(int classId, int lecturerId);
    Task<List<AttendanceReportDetailItemDto>> GetAttendanceReportDetailByClassAsync(int classId, int lecturerId);
    Task<List<object>> UpdateBulkAttendanceAsync(int lessonId, List<AttendanceUpdateItemDto> attendances, int lecturerId);
}

