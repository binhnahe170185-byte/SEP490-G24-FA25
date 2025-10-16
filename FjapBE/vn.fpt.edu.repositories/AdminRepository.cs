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
        return await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Students)
                .ThenInclude(s => s.Semester)
            .Include(u => u.Students)
                .ThenInclude(s => s.Level)
            .AsNoTracking()
            .OrderBy(u => u.UserId)
            .ToListAsync();
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == id);
    }

    // ⬇️ NEW: kiểm tra tồn tại với điều kiện bất kỳ (dùng cho email)
    public async Task<bool> ExistsAsync(Expression<Func<User, bool>> predicate)
    {
        return await _context.Users.AnyAsync(predicate);
    }

    // ⬇️ NEW: lấy theo email (nếu cần dùng nơi khác)
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

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await Task.CompletedTask;
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
    {
        await _context.SaveChangesAsync();
    }
}
