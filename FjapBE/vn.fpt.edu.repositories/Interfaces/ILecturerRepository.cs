using FJAP.vn.fpt.edu.models;
using static FJAP.Repositories.StudentRepository;

namespace FJAP.Repositories.Interfaces;

public interface ILecturerRepository : IGenericRepository<Lecture>
{
    Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId);
}

