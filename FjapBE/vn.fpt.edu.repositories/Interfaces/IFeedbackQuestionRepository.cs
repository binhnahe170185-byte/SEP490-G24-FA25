using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface IFeedbackQuestionRepository : IGenericRepository<FeedbackQuestion>
{
    Task<IEnumerable<FeedbackQuestion>> GetActiveQuestionsAsync(int? subjectId = null);
    Task<IEnumerable<FeedbackQuestion>> GetAllQuestionsAsync();
}

