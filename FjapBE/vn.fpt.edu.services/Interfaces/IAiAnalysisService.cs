using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IAiAnalysisService
{
    Task<AiAnalysisResult> AnalyzeFeedbackAsync(
        Dictionary<int, int> answers,
        List<FeedbackQuestionDto> questions,
        decimal satisfactionScore,
        string? freeText);
}

