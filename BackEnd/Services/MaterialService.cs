using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services;

public class MaterialService : IMaterialService
{
    private readonly IMaterialRepository _materialRepository;

    public MaterialService(IMaterialRepository materialRepository)
    {
        _materialRepository = materialRepository;
    }

    public async Task<IEnumerable<Material>> GetAllAsync()
    => await _materialRepository.GetAllAsync(
           orderBy: q => q.OrderByDescending(m => m.CreateAt),
           includeProperties: "Subject",       
           noTracking: true);

    public Task<Material?> GetByIdAsync(int id) => _materialRepository.GetByIdAsync(id);

    public Task<Material?> GetDetailAsync(int id) => _materialRepository.GetDetailAsync(id);

    //public async Task<IEnumerable<Material>> GetByLessonAsync(int lessonId)
    //    => await _materialRepository.GetAllAsync(predicate: m => m.UserId == lessonId);

    public async Task<Material> CreateAsync(Material material)
    {
        if (material.CreateAt == default)
            material.CreateAt = DateTime.UtcNow;

        await _materialRepository.AddAsync(material);
        await _materialRepository.SaveChangesAsync();
        return material;
    }

    public async Task<bool> UpdateAsync(Material material)
    {
        var existing = await _materialRepository.GetByIdAsync(material.MaterialId);
        if (existing == null) return false;
        material.UpdateAt = DateTime.UtcNow;
        _materialRepository.Update(material);
        await _materialRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _materialRepository.GetByIdAsync(id);
        if (existing == null) return false;

        // Soft delete
        if (!string.Equals(existing.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
        {
            existing.Status = "Inactive";
            existing.UpdateAt = DateTime.UtcNow;
            _materialRepository.Update(existing);
            await _materialRepository.SaveChangesAsync();
        }
        return true;
    }

}
