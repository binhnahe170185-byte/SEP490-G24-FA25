<<<<<<< HEAD
=======
using System.Threading.Tasks;
>>>>>>> 179db62 (View list material, create api for subject)
using FJAP.Models;

namespace FJAP.Repositories.Interfaces
{
    public interface ISubjectRepository : IGenericRepository<Subject>
    {
<<<<<<< HEAD
        Task<SubjectDto?> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync();
        Task UpdateStatusAsync(int subjectId, string status);
        Task<SubjectFormOptions> GetFormOptionsAsync();
=======
        Task<Subject?> GetDetailAsync(int id);
        // Thêm method đặc thù nếu cần
>>>>>>> 179db62 (View list material, create api for subject)
    }
}