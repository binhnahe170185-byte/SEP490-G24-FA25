using FJAP.Models;
using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services;

public class ClassService : IClassService
{
    private readonly IClassRepository _classRepository;

    public ClassService(IClassRepository classRepository)
    {
        _classRepository = classRepository;
    }

    public async Task<IEnumerable<Class>> GetAllAsync()
        => await _classRepository.GetAllAsync(orderBy: q => q.OrderBy(c => c.ClassId));

    public Task<Class?> GetByIdAsync(int id) => _classRepository.GetByIdAsync(id);

    public Task<Class?> GetWithStudentsAsync(int id) => _classRepository.GetWithStudentsAsync(id);

    public async Task<Class> CreateAsync(Class item)
    {
        await _classRepository.AddAsync(item);
        await _classRepository.SaveChangesAsync();
        return item;
    }

    public async Task<bool> UpdateAsync(Class item)
    {
        var existing = await _classRepository.GetByIdAsync(item.ClassId);
        if (existing == null) return false;
        _classRepository.Update(item);
        await _classRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _classRepository.GetByIdAsync(id);
        if (existing == null) return false;
        _classRepository.Remove(existing);
        await _classRepository.SaveChangesAsync();
        return true;
    }
    public Task<IEnumerable<ClassSubjectDetail>> GetSubjectsAsync(string classId) => _classRepository.GetSubjectsAsync(classId);
    public Task UpdateStatusAsync(string classId, bool status) => _classRepository.UpdateStatusAsync(classId, status);
}
