using FJAP.Models;

namespace FJAP.Repositories.Interfaces;

public interface IClassRepository : IGenericRepository<Class>
{
    Task<Class?> GetWithStudentsAsync(int id);

    Task<IEnumerable<Class>> GetAllAsync();
    Task<IEnumerable<ClassSubjectDetail>> GetSubjectsAsync(string classId);
    Task<Class> UpdateStatusAsync(string classId, bool status);
}
