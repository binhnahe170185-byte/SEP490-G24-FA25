using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace FJAP.Repositories;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    public StudentRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Student?> GetWithClassesAsync(int id)
    {
        return await _context.Students
            .Include(s => s.Classes)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentId == id);
    }

    public async Task<IEnumerable<Student>> GetAllAsync()
    {
        return await _context.Students
            .Include(s => s.User)
            .Include(s => s.Level)
            .Include(s => s.Classes)
            .ToListAsync();
    }
    // get ra d? li?u c?a lesson d?a vào studentId
    public async Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int studentId)
    {
        FormattableString sql = $@"
        SELECT 
            l.lesson_id   AS LessonId,
            l.class_id    AS ClassId,
            c.class_name  AS ClassName,
            l.date        AS Date,
            r.room_name   AS RoomName,
            l.time_id     AS TimeId,
            l.lecture_id  AS LectureId,
            t.start_time  AS StartTime,
            t.end_time    AS EndTime,
            s.subject_code AS SubjectCode
        FROM fjap.lesson   AS l
        JOIN fjap.class    AS c ON c.class_id  = l.class_id
        JOIN fjap.subject  AS s ON s.class_id  = l.class_id
        JOIN fjap.room     AS r ON r.room_id   = l.room_id
        JOIN fjap.enrollment AS e ON e.class_id = c.class_id
        JOIN fjap.timeslot AS t ON t.time_id   = l.time_id
        WHERE e.student_id = {studentId}";

        var lessons = await _context
            .Set<LessonDto>()
            .FromSqlInterpolated(sql)
            .AsNoTracking()
            .ToListAsync();

        return lessons;
    }

    public class LessonDto
    {
        public int LessonId { get; set; }
        public int ClassId { get; set; }
        public string ClassName { get; set; } = "";

        public DateOnly Date { get; set; }

        public string RoomName { get; set; } = "";

        public int TimeId { get; set; }
        public int LectureId { get; set; }

        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public string SubjectCode { get; set; } = "";
    }

    public async Task<List<Student>> GetEligibleForClassAsync(int classId)
    {
        var classInfo = await _context.Classes
            .AsNoTracking()
            .Select(c => new { c.ClassId, c.LevelId, c.SubjectId })
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (classInfo == null)
        {
            return new List<Student>();
        }

        return await _context.Students
            .Include(s => s.User)
            .AsNoTracking()
            .Where(s => s.LevelId == classInfo.LevelId)
            .Where(s => !s.Classes.Any(cls => cls.SubjectId == classInfo.SubjectId))
            .OrderBy(s => s.StudentId)
            .ToListAsync();
    }

    public async Task AddStudentsToClassAsync(int classId, IEnumerable<int> studentIds)
    {
        var distinctIds = studentIds?.Distinct().ToList() ?? new List<int>();
        if (distinctIds.Count == 0)
        {
            return;
        }

        var targetClass = await _context.Classes
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (targetClass == null)
        {
            throw new KeyNotFoundException("Class not found");
        }

        var students = await _context.Students
            .Where(s => distinctIds.Contains(s.StudentId))
            .ToListAsync();

        foreach (var student in students)
        {
            if (!targetClass.Students.Any(s => s.StudentId == student.StudentId))
            {
                targetClass.Students.Add(student);
            }
        }

        await _context.SaveChangesAsync();
    }
}
