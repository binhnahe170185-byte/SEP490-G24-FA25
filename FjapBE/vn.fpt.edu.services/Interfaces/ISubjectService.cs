using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces
{
    public interface ISubjectService
    {
        Task<IEnumerable<SubjectDto>> GetAllAsync();
        Task<SubjectDto?> GetByIdAsync(int id);
        Task<Subject> CreateAsync(CreateSubjectRequest request);
        Task<bool> UpdateAsync(int id, UpdateSubjectRequest request);
        Task<bool> DeleteAsync(int id);
        Task UpdateStatusAsync(int id, bool status);
        Task<SubjectFormOptions> GetFormOptionsAsync();
        Task<IEnumerable<SubjectDropdownDto>> GetDropdownSubjectsActiveAsync();
    }
}