<<<<<<< HEAD
<<<<<<< HEAD
=======
using System.Threading.Tasks;
>>>>>>> 179db62 (View list material, create api for subject)
=======
using System.Threading.Tasks;
=======
>>>>>>> master
>>>>>>> ba272be (change subject repo)
using FJAP.Models;

namespace FJAP.Repositories.Interfaces
{
    public interface ISubjectRepository : IGenericRepository<Subject>
    {
<<<<<<< HEAD
<<<<<<< HEAD
        Task<SubjectDto?> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync();
        Task UpdateStatusAsync(int subjectId, string status);
        Task<SubjectFormOptions> GetFormOptionsAsync();
=======
        Task<Subject?> GetDetailAsync(int id);
        // Thêm method đặc thù nếu cần
>>>>>>> 179db62 (View list material, create api for subject)
=======
        Task<Subject?> GetDetailAsync(int id);
        // Thêm method đặc thù nếu cần
=======
        Task<SubjectDto?> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync();
        Task UpdateStatusAsync(int subjectId, string status);
        Task<SubjectFormOptions> GetFormOptionsAsync();

>>>>>>> master
>>>>>>> ba272be (change subject repo)
    }
}