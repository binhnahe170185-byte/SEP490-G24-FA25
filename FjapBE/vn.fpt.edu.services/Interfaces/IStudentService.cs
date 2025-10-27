using FJAP.vn.fpt.edu.models;
using static FJAP.Repositories.StudentRepository;

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
}
