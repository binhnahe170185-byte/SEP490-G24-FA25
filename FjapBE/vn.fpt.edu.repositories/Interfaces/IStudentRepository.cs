using FJAP.vn.fpt.edu.models;
using static FJAP.Repositories.StudentRepository;

namespace FJAP.Repositories.Interfaces;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetWithClassesAsync(int id);
    Task<IEnumerable<Student>> GetAllAsync();
    Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int id);
}
