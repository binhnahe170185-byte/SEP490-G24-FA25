using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IFeedbackTextAnalysisService
{
    Task<FeedbackTextSummaryDto> AnalyzeTextFeedbackAsync(int? classId, int? semesterId, DateTime? from, DateTime? to);
}
