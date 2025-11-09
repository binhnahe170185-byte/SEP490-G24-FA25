using System.Collections.Generic;
using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetRecentAsync(NotificationFilterRequest filter);
    Task<NotificationDto> CreateAsync(CreateNotificationRequest request, bool broadcast = true);
    Task BroadcastAsync(IEnumerable<NotificationDto> notifications);
}


