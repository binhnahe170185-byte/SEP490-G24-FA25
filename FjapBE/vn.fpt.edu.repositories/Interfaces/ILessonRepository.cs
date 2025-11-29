using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface ILessonRepository : IGenericRepository<Lesson>
{
    Task<Lesson?> GetByIdWithRelationsAsync(int lessonId);
    Task<Lesson?> GetByIdWithAttendancesAndHomeworksAsync(int lessonId);
    Task<Lesson?> FindConflictingLessonAsync(int lessonId, DateOnly date, int timeId, int? roomId, int? classId, int? lecturerId);
}

