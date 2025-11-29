using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IAIService
{
    Task<AIChatResponse> ChatWithStudentAsync(AIChatRequest request, int studentId);
}

