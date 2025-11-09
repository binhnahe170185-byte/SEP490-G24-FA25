using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface INotificationRepository : IGenericRepository<Notification>
{
    Task<IReadOnlyList<Notification>> GetRecentForUserAsync(int userId, int take, DateTime? since);
}


