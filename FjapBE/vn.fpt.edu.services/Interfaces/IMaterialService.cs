using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface IMaterialService
{
    Task<IEnumerable<Material>> GetAllAsync();
    Task<Material?> GetByIdAsync(int id);
    Task<Material?> GetDetailAsync(int id);
    //Task<IEnumerable<Material>> GetByLessonAsync(int lessonId);
    Task<Material> CreateAsync(Material material);
    Task<bool> UpdateAsync(Material material);
    // updatedBy: optional user id who performs the delete (to populate UpdateBy)
    Task<bool> DeleteAsync(int id, int? updatedBy = null);
}
