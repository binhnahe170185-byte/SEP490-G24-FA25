using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class FeedbackQuestionRepository : GenericRepository<FeedbackQuestion>, IFeedbackQuestionRepository
{
    public FeedbackQuestionRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<FeedbackQuestion>> GetActiveQuestionsAsync(int? subjectId = null)
    {
        // All subjects use the same feedback form (general questions only)
        // Ignore subjectId parameter for now, always return general questions
        return await _dbSet
            .AsNoTracking()
            .Where(q => (q.IsActive ?? false) && q.SubjectId == null)
            .OrderBy(q => q.OrderIndex)
            .ThenBy(q => q.Id)
            .ToListAsync();
    }

    public async Task<IEnumerable<FeedbackQuestion>> GetAllQuestionsAsync()
    {
        return await _dbSet
            .AsNoTracking()
            .Include(q => q.Subject)
            .OrderBy(q => q.OrderIndex)
            .ThenBy(q => q.Id)
            .ToListAsync();
    }
}

