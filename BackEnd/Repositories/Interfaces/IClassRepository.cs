using FJAP.Models;

namespace FJAP.Repositories.Interfaces;

public interface IClassRepository : IGenericRepository<Class>
{
    Task<Class?> GetWithStudentsAsync(int id);

    Task<IEnumerable<Class>> GetAllAsync();
    Task<Class?> GetSubjectsAsync(string classId);
    Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId);
    Task<Class> UpdateStatusAsync(string classId, bool status);
}
