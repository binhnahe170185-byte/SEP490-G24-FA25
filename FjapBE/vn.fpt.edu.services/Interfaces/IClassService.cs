using System.Collections.Generic;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface IClassService
{
    Task<IEnumerable<Class>> GetAllAsync();
    Task<Class?> GetByIdAsync(int id);
    Task<Class?> GetWithStudentsAsync(int id);
    Task<Class> CreateAsync(Class item);
    Task<bool> UpdateAsync(Class item);
    Task<bool> DeleteAsync(int id);
    Task<Class?> GetSubjectsAsync(string classId);
    Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId);
    Task<Class> UpdateStatusAsync(string classId, bool status);
    Task<(List<Level> Levels, List<Semester> Semesters, List<Subject> Subjects)> GetFormOptionsAsync();
    Task<IEnumerable<ClassGradeDto>> GetClassesWithGradesAsync(ClassGradeFilterRequest? filter = null);
    Task<ClassGradeDetailDto?> GetClassGradeDetailsAsync(int classId);
    Task<bool> HasDuplicateNameForSubjectAsync(string className, int subjectId, int? excludeClassId = null);
    Task<IEnumerable<ClassScheduleDto>> GetClassScheduleBySemesterAsync(int semesterId, int classId);
}
