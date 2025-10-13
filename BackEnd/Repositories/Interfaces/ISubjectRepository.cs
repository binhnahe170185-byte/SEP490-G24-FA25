using FJAP.Models;

namespace FJAP.Repositories.Interfaces
{
    public interface ISubjectRepository : IGenericRepository<Subject>
    {
        Task<SubjectDto?> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync();
        Task UpdateStatusAsync(int subjectId, string status);
        Task<SubjectFormOptions> GetFormOptionsAsync();
    }
}