using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IClassRepository : IGenericRepository<Class>
{
    Task<Class?> GetWithStudentsAsync(int id);

    Task<IEnumerable<Class>> GetAllAsync();
    Task<Class?> GetSubjectsAsync(string classId);
    Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId);
    Task<Class> UpdateStatusAsync(string classId, bool status);
    Task<(List<Level> Levels, List<Semester> Semesters, List<Subject> Subjects)> GetFormOptionsAsync();
    Task<List<ClassGradeDto>> GetClassesWithGradesAsync(ClassGradeFilterRequest? filter = null);
    Task<ClassGradeDetailDto?> GetClassGradeDetailsAsync(int classId);
    Task<bool> ExistsWithNameAndSubjectAsync(string className, int subjectId, int? excludeClassId = null);
}
