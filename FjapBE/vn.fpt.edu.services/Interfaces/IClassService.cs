using FJAP.Models;

namespace FJAP.Services.Interfaces;

public interface IClassService
{
    Task<IEnumerable<Class>> GetAllAsync();
    Task<Class?> GetByIdAsync(int id);
    Task<Class?> GetWithStudentsAsync(int id);
    Task<Class> CreateAsync(Class item);
    Task<bool> UpdateAsync(Class item);
    Task<bool> DeleteAsync(int id);
    Task<Class?> GetSubjectsAsync(string classId);
    Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId);
    Task<Class> UpdateStatusAsync(string classId, bool status);
}
