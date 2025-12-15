using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IDailyFeedbackRepository : IGenericRepository<DailyFeedback>
{
    Task<DailyFeedback?> GetByStudentAndLessonAsync(int studentId, int lessonId);
    Task<IEnumerable<DailyFeedback>> GetByStudentAsync(int studentId, int? classId = null, DateTime? dateFrom = null, DateTime? dateTo = null);
    Task<IEnumerable<DailyFeedback>> GetByClassAsync(int classId, int? lessonId = null, DateTime? dateFrom = null, DateTime? dateTo = null, string? sentiment = null, int? urgency = null, string? status = null);
    Task<IEnumerable<DailyFeedback>> GetAllAsync(int? classId = null, int? lessonId = null, DateTime? dateFrom = null, DateTime? dateTo = null, string? sentiment = null, int? urgency = null, string? status = null);
    Task<DailyFeedback?> GetByIdWithDetailsAsync(int id);
    Task<bool> HasFeedbackForLessonAsync(int studentId, int lessonId);
}

