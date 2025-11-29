using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IFeedbackQuestionService
{
    Task<IEnumerable<FeedbackQuestionDto>> GetActiveQuestionsAsync(int? subjectId = null);
    Task<IEnumerable<FeedbackQuestionDto>> GetAllQuestionsAsync();
    Task<FeedbackQuestionDto> CreateQuestionAsync(CreateFeedbackQuestionRequest request);
    Task<FeedbackQuestionDto?> UpdateQuestionAsync(int id, UpdateFeedbackQuestionRequest request);
    Task<bool> DeleteQuestionAsync(int id);
}

