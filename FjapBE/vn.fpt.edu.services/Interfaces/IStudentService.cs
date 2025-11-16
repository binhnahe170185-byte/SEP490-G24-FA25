using System.IO;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IStudentService
{
    Task<IEnumerable<Student>> GetAllAsync();
    Task<Student?> GetByIdAsync(int id);
    Task<Student?> GetWithClassesAsync(int id);
    Task<Student> CreateAsync(Student student);
    Task<bool> UpdateAsync(Student student);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int id);
    Task<List<Student>> GetEligibleForClassAsync(int classId);
    Task AddStudentsToClassAsync(int classId, IEnumerable<int> studentIds);
    Task<IEnumerable<StudentSemesterDto>> GetStudentSemestersAsync(int studentId);
    Task<IEnumerable<StudentCourseGradeDto>> GetStudentCoursesBySemesterAsync(int studentId, int semesterId);
    Task<StudentGradeDetailDto?> GetStudentGradeDetailsAsync(int studentId, int classId);
    Task<SemesterGPADto> GetStudentSemesterGPAAsync(int studentId, int semesterId);
    Task<AcademicTranscriptDto> GetAcademicTranscriptAsync(int studentId);
    // Import methods
    Task<ImportStudentPreviewResponse> PreviewImportAsync(Stream excelStream, int enrollmentSemesterId, int levelId);
    Task<ImportStudentResponse> ImportStudentsAsync(ImportStudentRequest request);
    Task<(IEnumerable<CurriculumSubjectDto> Items, int TotalCount)> GetCurriculumSubjectsAsync(string? search, int page, int pageSize);

    // Attendance (student) 
    Task<IEnumerable<StudentAttendanceSubjectDto>> GetStudentAttendanceSubjectsAsync(int studentId, int semesterId);
    Task<IEnumerable<StudentAttendanceLessonDto>> GetStudentAttendanceLessonsAsync(int studentId, int semesterId, int subjectId);
}
