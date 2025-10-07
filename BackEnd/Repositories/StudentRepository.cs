using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    public StudentRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Student?> GetWithClassesAsync(int id)
    {
        return await _context.Students
            .Include(s => s.Classes)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentId == id);
    }

    public async Task<IEnumerable<Student>> GetAllAsync()
    {
        return await _context.Students
            .Include(s => s.User)
            .Include(s => s.Level)
            .Include(s => s.Classes)
            .ToListAsync();
    }
}
