using System.Collections.Generic;
using System.Threading.Tasks;
using FJAP.Models;

namespace FJAP.Services.Interfaces
{
    public interface ISubjectService
    {
        Task<IEnumerable<Subject>> GetAllAsync();
        Task<Subject?> GetByIdAsync(int id);
        Task<Subject?> GetDetailAsync(int id);

        Task<Subject> CreateAsync(Subject model);
        Task<bool> UpdateAsync(int id, Subject model);
        Task<bool> DeleteAsync(int id);
    }
}