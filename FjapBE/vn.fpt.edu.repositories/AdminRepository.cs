// Infrastructure/Extensions/AdminRepository.cs
using System.Linq.Expressions;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class AdminRepository : IAdminRepository
{
    private readonly FjapDbContext _context;

    public AdminRepository(FjapDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        // Lấy kèm Role + Student (Level, Semester)
        return await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Students)
                .ThenInclude(s => s.Semester)
            .Include(u => u.Students)
                .ThenInclude(s => s.Level)
            .OrderBy(u => u.UserId)
            .ToListAsync();
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == id);
    }

    public async Task<bool> ExistsAsync(Expression<Func<User, bool>> predicate)
        => await _context.Users.AnyAsync(predicate);

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
    }

    public Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(int id)
    {
        var existing = await _context.Users.FindAsync(id);
        if (existing != null)
        {
            _context.Users.Remove(existing);
        }
    }

    public async Task SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
