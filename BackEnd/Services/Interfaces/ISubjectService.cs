<<<<<<< HEAD
=======
using System.Collections.Generic;
using System.Threading.Tasks;
>>>>>>> 179db62 (View list material, create api for subject)
using FJAP.Models;

namespace FJAP.Services.Interfaces
{
    public interface ISubjectService
    {
<<<<<<< HEAD
        Task<IEnumerable<SubjectDto>> GetAllAsync();
        Task<SubjectDto?> GetByIdAsync(int id);
        Task<Subject> CreateAsync(CreateSubjectRequest request);
        Task<bool> UpdateAsync(int id, UpdateSubjectRequest request);
        Task<bool> DeleteAsync(int id);
        Task UpdateStatusAsync(int id, bool status);
        Task<SubjectFormOptions> GetFormOptionsAsync();
=======
        Task<IEnumerable<Subject>> GetAllAsync();
        Task<Subject?> GetByIdAsync(int id);
        Task<Subject?> GetDetailAsync(int id);

        Task<Subject> CreateAsync(Subject model);
        Task<bool> UpdateAsync(int id, Subject model);
        Task<bool> DeleteAsync(int id);
>>>>>>> 179db62 (View list material, create api for subject)
    }
}