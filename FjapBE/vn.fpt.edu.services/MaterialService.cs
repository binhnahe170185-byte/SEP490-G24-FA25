using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace FJAP.Services;

public class MaterialService : IMaterialService
{
    private readonly IMaterialRepository _materialRepository;
    private readonly ILogger<MaterialService>? _logger;

    public MaterialService(IMaterialRepository materialRepository, ILogger<MaterialService>? logger = null)
    {
        _materialRepository = materialRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<Material>> GetAllAsync()
    {
        return await _materialRepository.GetAllAsync(
            orderBy: q => q.OrderByDescending(m => m.CreatedAt),
            includeProperties: "Subject",
            noTracking: true);
    }

    public async Task<Material?> GetByIdAsync(int id)
    {
        return await _materialRepository.GetByIdAsync(id);
    }

    public async Task<Material?> GetDetailAsync(int id)
    {
        return await _materialRepository.GetDetailAsync(id);
    }

    public async Task<Material> CreateAsync(Material material)
    {
        // default status
        material.Status ??= "active";

        // Để DB tự set created_at/updated_at qua DEFAULT/ON UPDATE CURRENT_TIMESTAMP
        await _materialRepository.AddAsync(material);
        await _materialRepository.SaveChangesAsync();
        return material;
    }

    public async Task<bool> UpdateAsync(Material material)
    {
        var existing = await _materialRepository.GetByIdAsync(material.MaterialId);
        if (existing == null) 
            return false;

        // preserve created timestamps and let DB update updated_at automatically
        material.CreatedAt = existing.CreatedAt;
        material.CreatedBy = existing.CreatedBy;
        _materialRepository.Update(material);
        await _materialRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, int? updatedBy = null)
    {
        var existing = await _materialRepository.GetByIdAsync(id);
        if (existing == null)
        {
            _logger?.LogWarning("DeleteAsync: material {Id} not found.", id);
            return false;
        }

        if (!string.Equals(existing.Status, "inActive", StringComparison.OrdinalIgnoreCase))
        {
            existing.Status = "inActive";
            if (updatedBy.HasValue)
                existing.UpdatedBy = updatedBy.Value;
            _materialRepository.Update(existing);
            await _materialRepository.SaveChangesAsync();
            _logger?.LogInformation("Soft-deleted material {Id} by {User}", id, updatedBy?.ToString() ?? "(null)");
        }
        return true;
    }
}