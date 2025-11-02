using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class LecturerRepository : GenericRepository<Lecture>, ILecturerRepository
{
    public LecturerRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId)
    {
        // Query lessons của lecturer và map sang DTO
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Lecture)
            .Include(l => l.Time)
            .Where(l => l.LectureId == lecturerId)
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new LessonDto
            {
                LessonId = l.LessonId,
                ClassId = l.ClassId,
                ClassName = l.Class.ClassName,
                Date = l.Date,
                RoomName = l.Room.RoomName,
                TimeId = l.TimeId,
                LectureId = l.LectureId,
                LectureCode = l.Lecture.LecturerCode ?? "",
                Attendance = null, // Không có attendance cho lecturer
                StartTime = l.Time.StartTime,
                EndTime = l.Time.EndTime,
                SubjectCode = l.Class.Subject.SubjectCode
            })
            .ToListAsync();

        return lessons;
    }
}

