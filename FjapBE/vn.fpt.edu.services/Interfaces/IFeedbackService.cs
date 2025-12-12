using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IFeedbackService
{
    Task<FeedbackDto> CreateFeedbackAsync(CreateFeedbackRequest request);
    Task<(IEnumerable<FeedbackDto> Items, int Total)> GetFeedbacksAsync(FeedbackFilterRequest filter);
    Task<FeedbackDto?> GetFeedbackByIdAsync(int id);
    Task<bool> UpdateStatusAsync(int id, UpdateFeedbackStatusRequest request);
    Task<FeedbackDto> ReAnalyzeFeedbackAsync(int id);
    Task<IEnumerable<FeedbackIssueParetoItemDto>> GetIssueParetoAsync(int? classId, DateTime? from, DateTime? to, string? groupBy = "category");
    Task<IEnumerable<FeedbackQuestionParetoItemDto>> GetQuestionParetoAsync(int? classId, int? semesterId, DateTime? from, DateTime? to);
    Task<FeedbackTextSummaryDto> GetTextSummaryAsync(int? classId, int? semesterId, DateTime? from, DateTime? to);
    Task<(int Total, int Processed, int Succeeded, int Failed)> ReAnalyzeAllWithoutCategoryAsync(int? limit = null);
    Task<(int Total, int Processed, int Succeeded, int Failed)> ReAnalyzeAllFeedbacksAsync(int? limit = null, bool force = false);

    // Lecturer view helpers
    Task<IEnumerable<LecturerFeedbackClassDto>> GetLecturerClassesWithFeedbackAsync(List<int> lecturerClassIds);
    Task<IEnumerable<LecturerClassFeedbackItemDto>> GetClassFeedbacksForLecturerAsync(int classId, List<int> lecturerClassIds);
}

