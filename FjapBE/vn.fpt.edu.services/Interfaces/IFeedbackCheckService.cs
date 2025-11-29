using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IFeedbackCheckService
{
    Task<IEnumerable<PendingFeedbackClassDto>> GetPendingFeedbackClassesAsync(int studentId);
    Task<bool> HasPendingFeedbackAsync(int studentId);
}

