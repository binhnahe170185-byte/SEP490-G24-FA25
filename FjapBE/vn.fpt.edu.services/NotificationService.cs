using System.Linq;
using FJAP.DTOs;
using FJAP.Hubs;
using FJAP.Repositories.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace FJAP.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IHubContext<NotificationHub, INotificationClient> _hubContext;
    private readonly ILogger<NotificationService>? _logger;

    public NotificationService(
        INotificationRepository notificationRepository,
        IHubContext<NotificationHub, INotificationClient> hubContext,
        ILogger<NotificationService>? logger = null)
    {
        _notificationRepository = notificationRepository;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<IReadOnlyList<NotificationDto>> GetRecentAsync(NotificationFilterRequest filter)
    {
        var take = filter.Take is > 0 and <= 100 ? filter.Take : 20;
        var notifications = await _notificationRepository.GetRecentForUserAsync(filter.UserId, take, filter.Since);
        return notifications.Select(MapToDto).ToArray();
    }

    public async Task<NotificationDto> CreateAsync(CreateNotificationRequest request, bool broadcast = true)
    {
        // Lưu EntityId trong Content dưới dạng JSON metadata nếu có
        var content = request.Content;
        if (request.EntityId.HasValue)
        {
            var metadata = $"\n\n{{\"entityId\":{request.EntityId.Value}}}";
            // Luôn thêm \n\n trước metadata để dễ parse
            content = string.IsNullOrWhiteSpace(content) 
                ? metadata.TrimStart() 
                : content + metadata;
        }

        var entity = new Notification
        {
            UserId = request.UserId,
            Title = FormatTitle(request.Title, request.Category),
            Content = content,
            CreatedBy = request.CreatedBy,
            CreatedTime = DateTime.UtcNow
        };

        await _notificationRepository.AddAsync(entity);
        await _notificationRepository.SaveChangesAsync();

        var dto = MapToDto(entity);

        if (broadcast)
        {
            await BroadcastAsync(new[] { dto });
        }

        return dto;
    }

    public async Task BroadcastAsync(IEnumerable<NotificationDto> notifications)
    {
        var list = notifications.ToList();
        if (list.Count == 0)
        {
            return;
        }

        var grouped = list.GroupBy(n => n.UserId);

        foreach (var group in grouped)
        {
            var groupName = $"user:{group.Key}";
            var payload = group.ToList();

            if (payload.Count == 1)
            {
                await _hubContext.Clients.Group(groupName).ReceiveNotification(payload[0]);
            }
            else
            {
                await _hubContext.Clients.Group(groupName).ReceiveNotifications(payload);
            }
        }
    }

    private static NotificationDto MapToDto(Notification entity)
    {
        var (category, title) = ExtractCategory(entity.Title);
        return new NotificationDto(
            entity.Id,
            entity.UserId,
            title,
            entity.Content,
            entity.CreatedTime ?? DateTime.UtcNow,
            category,
            entity.CreatedBy);
    }

    private static string FormatTitle(string title, string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return title;
        }

        if (title.StartsWith($"[{category}]", StringComparison.OrdinalIgnoreCase))
        {
            return title;
        }

        return $"[{category}] {title}";
    }

    private static (string? category, string title) ExtractCategory(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return (null, string.Empty);
        }

        if (title.StartsWith("[", StringComparison.Ordinal) && title.Contains(']'))
        {
            var closingIndex = title.IndexOf(']');
            if (closingIndex > 1)
            {
                var category = title.Substring(1, closingIndex - 1);
                var displayTitle = title[(closingIndex + 1)..].TrimStart();
                return (string.IsNullOrWhiteSpace(category) ? null : category, displayTitle);
            }
        }

        return (null, title);
    }
}


