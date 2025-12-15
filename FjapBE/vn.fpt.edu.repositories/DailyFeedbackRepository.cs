using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class DailyFeedbackRepository : GenericRepository<DailyFeedback>, IDailyFeedbackRepository
{
    public DailyFeedbackRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<DailyFeedback?> GetByStudentAndLessonAsync(int studentId, int lessonId)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Lesson)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .FirstOrDefaultAsync(f => f.StudentId == studentId && f.LessonId == lessonId);
    }

    public async Task<IEnumerable<DailyFeedback>> GetByStudentAsync(int studentId, int? classId = null, DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(f => f.Lesson)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .Where(f => f.StudentId == studentId);

        if (classId.HasValue)
        {
            query = query.Where(f => f.ClassId == classId.Value);
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= dateTo.Value);
        }

        return await query
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<DailyFeedback>> GetByClassAsync(int classId, int? lessonId = null, DateTime? dateFrom = null, DateTime? dateTo = null, string? sentiment = null, int? urgency = null, string? status = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Lesson)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .Where(f => f.ClassId == classId);

        if (lessonId.HasValue)
        {
            query = query.Where(f => f.LessonId == lessonId.Value);
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= dateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(sentiment))
        {
            query = query.Where(f => f.Sentiment == sentiment);
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

    public async Task<IEnumerable<DailyFeedback>> GetAllAsync(int? classId = null, int? lessonId = null, DateTime? dateFrom = null, DateTime? dateTo = null, string? sentiment = null, int? urgency = null, string? status = null)
    {
        var query = _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Lesson)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .AsQueryable();

        if (classId.HasValue)
        {
            query = query.Where(f => f.ClassId == classId.Value);
        }

        if (lessonId.HasValue)
        {
            query = query.Where(f => f.LessonId == lessonId.Value);
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= dateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(sentiment))
        {
            query = query.Where(f => f.Sentiment == sentiment);
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

    public async Task<DailyFeedback?> GetByIdWithDetailsAsync(int id)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(f => f.Student)
                .ThenInclude(s => s.User)
            .Include(f => f.Lesson)
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .FirstOrDefaultAsync(f => f.Id == id);
    }

    public async Task<bool> HasFeedbackForLessonAsync(int studentId, int lessonId)
    {
        return await _dbSet
            .AsNoTracking()
            .AnyAsync(f => f.StudentId == studentId && f.LessonId == lessonId);
    }
}

