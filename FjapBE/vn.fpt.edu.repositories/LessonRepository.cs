using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class LessonRepository : GenericRepository<Lesson>, ILessonRepository
{
    public LessonRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Lesson?> GetByIdWithRelationsAsync(int lessonId)
    {
        return await _context.Lessons
            .Include(l => l.Class)
            .Include(l => l.Room)
            .Include(l => l.Time)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);
    }

    public async Task<Lesson?> GetByIdWithAttendancesAndHomeworksAsync(int lessonId)
    {
        return await _context.Lessons
            .Include(l => l.Attendances)
            .Include(l => l.Homeworks)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);
    }

    public async Task<Lesson?> FindConflictingLessonAsync(int lessonId, DateOnly date, int timeId, int? roomId, int? classId, int? lecturerId)
    {
        return await _context.Lessons
            .Where(l => l.LessonId != lessonId &&
                       l.Date == date &&
                       l.TimeId == timeId &&
                       (roomId.HasValue && l.RoomId == roomId.Value ||
                        classId.HasValue && l.ClassId == classId.Value ||
                        lecturerId.HasValue && l.LectureId == lecturerId.Value))
            .FirstOrDefaultAsync();
    }
}

