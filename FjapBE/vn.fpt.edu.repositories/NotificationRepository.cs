using System.Linq;
using FJAP.Repositories.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class NotificationRepository : GenericRepository<Notification>, INotificationRepository
{
    public NotificationRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Notification>> GetRecentForUserAsync(int userId, int take, DateTime? since)
    {
        IQueryable<Notification> query = _dbSet
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (since.HasValue)
        {
            query = query.Where(n => n.CreatedTime >= since.Value);
        }

        return await query
            .OrderByDescending(n => n.CreatedTime ?? DateTime.MinValue)
            .ThenByDescending(n => n.Id)
            .Take(take)
            .ToListAsync();
    }

}


