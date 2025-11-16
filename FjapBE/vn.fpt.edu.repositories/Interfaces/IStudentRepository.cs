using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;

namespace FJAP.Repositories.Interfaces;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetWithClassesAsync(int id);
    Task<IEnumerable<Student>> GetAllAsync();
    Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int id);
    Task<List<Student>> GetEligibleForClassAsync(int classId);
    Task AddStudentsToClassAsync(int classId, IEnumerable<int> studentIds);
    Task<IEnumerable<StudentSemesterDto>> GetStudentSemestersAsync(int studentId);
    Task<IEnumerable<StudentCourseGradeDto>> GetStudentCoursesBySemesterAsync(int studentId, int semesterId);
    Task<StudentGradeDetailDto?> GetStudentGradeDetailsAsync(int studentId, int classId);
    Task<SemesterGPADto> GetStudentSemesterGPAAsync(int studentId, int semesterId);
    Task<(IEnumerable<CurriculumSubjectDto> Items, int TotalCount)> GetCurriculumSubjectsAsync(string? search, int page, int pageSize);
    Task<AcademicTranscriptDto> GetAcademicTranscriptAsync(int studentId);

    // Attendance (student)
    Task<IEnumerable<StudentAttendanceSubjectDto>> GetStudentAttendanceSubjectsAsync(int studentId, int semesterId);
    Task<IEnumerable<StudentAttendanceLessonDto>> GetStudentAttendanceLessonsAsync(int studentId, int semesterId, int subjectId);
}
