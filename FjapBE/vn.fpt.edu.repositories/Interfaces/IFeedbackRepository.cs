using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IFeedbackRepository : IGenericRepository<Feedback>
{
    Task<Feedback?> GetByStudentAndClassAsync(int studentId, int classId);
    Task<IEnumerable<Feedback>> GetByClassAsync(int classId, int? sentiment = null, int? urgency = null, string? status = null);
    Task<IEnumerable<Feedback>> GetBySubjectAsync(int subjectId, int? sentiment = null, int? urgency = null, string? status = null);
    Task<Feedback?> GetByIdWithDetailsAsync(int id);
    Task<List<(string Issue, int Count)>> GetIssueCountsAsync(int? classId, DateTime? from, DateTime? to);
    Task<List<(string Issue, int Count)>> GetIssueCategoryCountsAsync(int? classId, DateTime? from, DateTime? to);
    Task<List<(int QuestionId, decimal AverageScore, int ResponseCount)>> GetQuestionAverageScoresAsync(int? classId, int? semesterId, DateTime? from, DateTime? to);
}

