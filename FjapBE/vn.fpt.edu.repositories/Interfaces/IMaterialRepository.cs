using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IMaterialRepository : IGenericRepository<Material>
{
    Task<Material?> GetDetailAsync(int id); // include Lesson & User
    //Task<IEnumerable<Material>> GetByLessonAsync(int lessonId);
}
