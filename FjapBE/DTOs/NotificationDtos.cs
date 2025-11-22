using System;
using System.Collections.Generic;

namespace FJAP.DTOs;

public record NotificationDto(
    int Id,
    int UserId,
    string Title,
    string? Content,
    DateTime CreatedTime,
    string? Category,
    int? CreatedBy
);

public record CreateNotificationRequest(
    int UserId,
    string Title,
    string? Content,
    string? Category = null,
    int? CreatedBy = null,
    int? EntityId = null
);

public record NotificationFilterRequest(
    int UserId,
    int Take = 20,
    DateTime? Since = null
);


