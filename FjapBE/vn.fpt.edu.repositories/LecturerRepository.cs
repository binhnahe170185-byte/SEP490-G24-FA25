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
        FormattableString sql = $@"
        SELECT 
            l.lesson_id   AS LessonId,
            l.class_id    AS ClassId,
            c.class_name  AS ClassName,
            l.date        AS Date,
            r.room_name   AS RoomName,
            l.time_id     AS TimeId,
            le.lecture_id  AS LectureId,
            le.lecturer_code AS LectureCode,
            NULL AS Attendance,
            t.start_time  AS StartTime,
            t.end_time    AS EndTime,
            s.subject_code AS SubjectCode
        FROM fjap.lesson   AS l
        JOIN fjap.class    AS c ON c.class_id  = l.class_id
        JOIN fjap.subject  AS s ON s.subject_id  = c.subject_id
        JOIN fjap.room     AS r ON r.room_id   = l.room_id
        JOIN fjap.lecture  AS le ON le.lecture_id = l.lecture_id
        JOIN fjap.timeslot AS t ON t.time_id   = l.time_id
        WHERE le.lecture_id = {lecturerId}";

        var lessons = await _context
            .Set<LessonDto>()
            .FromSqlInterpolated(sql)
            .AsNoTracking()
            .ToListAsync();

        return lessons;
    }
}

