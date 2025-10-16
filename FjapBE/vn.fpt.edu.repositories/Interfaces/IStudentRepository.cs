using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetWithClassesAsync(int id);
    Task<IEnumerable<Student>> GetAllAsync();
    Task<IEnumerable<Lesson>> GetLessonsByStudentIdAsync(int id);
}
