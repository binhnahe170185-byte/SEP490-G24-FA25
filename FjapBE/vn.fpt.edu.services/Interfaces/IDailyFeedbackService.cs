using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IDailyFeedbackService
{
    Task<DailyFeedbackDto> CreateDailyFeedbackAsync(CreateDailyFeedbackRequest request);
    Task<(IEnumerable<DailyFeedbackDto> Items, int Total)> GetStudentDailyFeedbacksAsync(int studentId, DailyFeedbackFilterRequest filter);
    Task<(IEnumerable<DailyFeedbackDto> Items, int Total)> GetClassDailyFeedbacksAsync(int classId, DailyFeedbackFilterRequest filter);
    Task<DailyFeedbackDto?> GetDailyFeedbackByIdAsync(int id);
    Task<bool> UpdateStatusAsync(int id, UpdateDailyFeedbackStatusRequest request);
    Task<bool> HasFeedbackForLessonAsync(int studentId, int lessonId);
}

