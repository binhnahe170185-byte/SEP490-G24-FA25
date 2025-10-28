using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface ISemesterService
{
    Task<IEnumerable<Semester>> GetAllAsync();
    Task<Semester?> GetByIdAsync(int id);
    Task<Semester> CreateAsync(CreateSemesterRequest request);
    Task<bool> UpdateAsync(int id, UpdateSemesterRequest request);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<Semester>> GetActiveSemestersAsync();
    Task<IEnumerable<Semester>> GetUpcomingSemestersAsync();
}
