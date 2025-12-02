using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FJAP.Repositories;

public class FeedbackRepository : GenericRepository<Feedback>, IFeedbackRepository
{
    public FeedbackRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Feedback?> GetByStudentAndClassAsync(int studentId, int classId)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .FirstOrDefaultAsync(f => f.StudentId == studentId && f.ClassId == classId);
    }

    public async Task<IEnumerable<Feedback>> GetByClassAsync(int classId, int? sentiment = null, int? urgency = null, string? status = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .Where(f => f.ClassId == classId);

        if (sentiment.HasValue)
        {
            var sentimentStr = sentiment.Value switch
            {
                1 => "Positive",
                -1 => "Negative",
                _ => "Neutral"
            };
            query = query.Where(f => f.Sentiment == sentimentStr);
        }

        if (urgency.HasValue)
        {
            query = query.Where(f => f.Urgency >= urgency.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(f => f.Status == status);
        }

        return await query
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Feedback>> GetBySubjectAsync(int subjectId, int? sentiment = null, int? urgency = null, string? status = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .Where(f => f.SubjectId == subjectId);

        if (sentiment.HasValue)
        {
            var sentimentStr = sentiment.Value switch
            {
                1 => "Positive",
                -1 => "Negative",
                _ => "Neutral"
            };
            query = query.Where(f => f.Sentiment == sentimentStr);
        }

        if (urgency.HasValue)
        {
            query = query.Where(f => f.Urgency >= urgency.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(f => f.Status == status);
        }

        return await query
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<Feedback?> GetByIdWithDetailsAsync(int id)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Class)
                .ThenInclude(c => c.Subject)
            .Include(f => f.Subject)
            .FirstOrDefaultAsync(f => f.Id == id);
    }

    public async Task<List<(string Issue, int Count)>> GetIssueCountsAsync(int? classId, DateTime? from, DateTime? to)
    {
        var query = _dbSet.AsNoTracking()
            .Where(f => !string.IsNullOrEmpty(f.MainIssue));

        if (classId.HasValue)
        {
            query = query.Where(f => f.ClassId == classId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= to.Value);
        }

        var grouped = await query
            .GroupBy(f => f.MainIssue!)
            .Select(g => new
            {
                Issue = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return grouped
            .Select(x => (x.Issue, x.Count))
            .ToList();
    }

    public async Task<List<(string Issue, int Count)>> GetIssueCategoryCountsAsync(int? classId, DateTime? from, DateTime? to)
    {
        try
        {
            var query = _dbSet.AsNoTracking()
                .Where(f => f.IssueCategory != null && !string.IsNullOrEmpty(f.IssueCategory));

            if (classId.HasValue)
            {
                query = query.Where(f => f.ClassId == classId.Value);
            }

            if (from.HasValue)
            {
                query = query.Where(f => f.CreatedAt >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(f => f.CreatedAt <= to.Value);
            }

            var grouped = await query
                .GroupBy(f => f.IssueCategory!)
                .Select(g => new
                {
                    Issue = g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            return grouped
                .Select(x => (x.Issue, x.Count))
                .ToList();
        }
        catch (Exception)
        {
            // If column doesn't exist or other error, return empty list
            // Service layer will handle fallback
            return new List<(string Issue, int Count)>();
        }
    }

    public async Task<List<(int QuestionId, decimal AverageScore, int ResponseCount)>> GetQuestionAverageScoresAsync(int? classId, int? semesterId, DateTime? from, DateTime? to)
    {
        var query = _dbSet.AsNoTracking()
            .Include(f => f.Class)
            .Where(f => f.Answers != null && !string.IsNullOrEmpty(f.Answers));

        if (classId.HasValue)
        {
            query = query.Where(f => f.ClassId == classId.Value);
        }

        if (semesterId.HasValue)
        {
            query = query.Where(f => f.Class.SemesterId == semesterId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= to.Value);
        }

        var feedbacks = await query.ToListAsync();

        // Parse answers and calculate averages
        var questionScores = new Dictionary<int, List<decimal>>();

        foreach (var feedback in feedbacks)
        {
            try
            {
                // TODO: GetAnswersDict - extension method not implemented
                var answersDict = new Dictionary<int, int>(); // feedback.GetAnswersDict();
                if (answersDict == null) continue;

                foreach (var kvp in answersDict)
                {
                    var questionId = kvp.Key;
                    var answerValue = kvp.Value; // 1-4 scale

                    // Normalize to 0-10 scale: (value - 1) * 10 / 3
                    var normalizedScore = (decimal)(answerValue - 1) * 10m / 3m;

                    if (!questionScores.ContainsKey(questionId))
                    {
                        questionScores[questionId] = new List<decimal>();
                    }
                    questionScores[questionId].Add(normalizedScore);
                }
            }
            catch
            {
                // Skip invalid answers
                continue;
            }
        }

        // Calculate averages
        var result = new List<(int QuestionId, decimal AverageScore, int ResponseCount)>();
        foreach (var kvp in questionScores)
        {
            var average = kvp.Value.Count > 0 ? kvp.Value.Average() : 0m;
            result.Add((kvp.Key, Math.Round(average, 2), kvp.Value.Count));
        }

        return result.OrderBy(x => x.QuestionId).ToList();
    }
}

