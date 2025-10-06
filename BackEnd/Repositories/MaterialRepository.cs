using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class MaterialRepository : GenericRepository<Material>, IMaterialRepository
{
    public MaterialRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Material?> GetDetailAsync(int id)
    {
        return await _context.Materials
            .Include(m => m.Lesson)
            .Include(m => m.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MaterialId == id);
    }

    public async Task<IEnumerable<Material>> GetByLessonAsync(int lessonId)
    {
        return await _context.Materials
            .Where(m => m.LessonId == lessonId)
            .AsNoTracking()
            .OrderByDescending(m => m.CreateAt)
            .ToListAsync();
    }
}
