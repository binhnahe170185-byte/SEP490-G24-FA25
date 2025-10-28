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
    // get ra d? li?u c?a lesson d?a v�o studentId
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
            le.lecture_id  AS LectureId,
            le.lecturer_code AS LectureCode,
            a.status AS Attendance,
            t.start_time  AS StartTime,
            t.end_time    AS EndTime,
            s.subject_code AS SubjectCode
        FROM fjap.lesson   AS l
        JOIN fjap.class    AS c ON c.class_id  = l.class_id
        JOIN fjap.subject  AS s ON s.subject_id  = c.subject_id
        JOIN fjap.room     AS r ON r.room_id   = l.room_id
        JOIN fjap.lecture  AS le ON le.lecture_id = l.lecture_id
        JOIN fjap.enrollment AS e ON e.class_id = c.class_id
        JOIN fjap.timeslot AS t ON t.time_id   = l.time_id
        LEFT JOIN fjap.attendance AS a ON a.lesson_id = l.lesson_id AND a.student_id = e.student_id
        WHERE e.student_id= {studentId}";

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
        public string LectureCode { get; set; } = "";
        public string? Attendance { get; set; }

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
    /// Lấy danh sách semester mà sinh viên đã học
    public async Task<IEnumerable<StudentSemesterDto>> GetStudentSemestersAsync(int studentId)
    {
        var semesters = await _context.Classes
            .Where(c => c.Students.Any(s => s.StudentId == studentId))
            .Include(c => c.Semester)
            .Where(c => c.Semester != null)
            .Select(c => c.Semester!)
            .Distinct()
            .OrderByDescending(s => s.StartDate)
            .Select(s => new StudentSemesterDto
            {
                SemesterId = s.SemesterId,
                Name = s.Name,
                StartDate = s.StartDate.ToDateTime(TimeOnly.MinValue),
                EndDate = s.EndDate.ToDateTime(TimeOnly.MinValue)
            })
            .ToListAsync();

        return semesters;
    }

    /// Lấy danh sách môn học và điểm của sinh viên trong một semester
    public async Task<IEnumerable<StudentCourseGradeDto>> GetStudentCoursesBySemesterAsync(int studentId, int semesterId)
    {
        var courses = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Semester)
            .Where(c => c.SemesterId == semesterId && c.Students.Any(st => st.StudentId == studentId))
            .Select(c => new
            {
                Class = c,
                Grade = _context.Grades
                    .FirstOrDefault(g => g.SubjectId == c.SubjectId && g.StudentId == studentId)
            })
            .Select(x => new StudentCourseGradeDto
            {
                CourseId = x.Class.ClassId,
                SubjectCode = x.Class.Subject.SubjectCode,
                SubjectName = x.Class.Subject.SubjectName,
                ClassName = x.Class.ClassName,
                ClassCode = x.Class.ClassName, // Dùng ClassName thay cho ClassCode
                Average = x.Grade != null ? x.Grade.FinalScore : null,
                Status = "Showing",
                GradeStatus = x.Grade != null ? x.Grade.Status ?? "In Progress" : "Not Started",
                // Lấy StartDate và EndDate từ Semester thay vì từ Class
                StartDate = x.Class.Semester.StartDate.ToDateTime(TimeOnly.MinValue),
                EndDate = x.Class.Semester.EndDate.ToDateTime(TimeOnly.MinValue),
                ClassId = x.Class.ClassId,
                SubjectId = x.Class.SubjectId,
                GradeId = x.Grade != null ? x.Grade.GradeId : 0
            })
            .ToListAsync();

        return courses;
    }

    /// Lấy chi tiết điểm của sinh viên cho một môn học cụ thể
    public async Task<StudentGradeDetailDto?> GetStudentGradeDetailsAsync(int studentId, int classId)
    {
        var classInfo = await _context.Classes
            .Include(c => c.Subject)
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (classInfo == null) return null;

        var grade = await _context.Grades
            .Include(g => g.GradeTypes)
                .ThenInclude(gt => gt.SubjectGradeType)
            .FirstOrDefaultAsync(g => g.StudentId == studentId && g.SubjectId == classInfo.SubjectId);

        if (grade == null) return null;

        // Map từ GradeTypes collection sang DTO
        var gradeComponents = grade.GradeTypes.Select(gt => new StudentGradeComponentDto
        {
            ComponentName = gt.SubjectGradeType.GradeTypeName,
            Weight = gt.SubjectGradeType.Weight,
            Value = gt.Score,
            Comment = gt.Comment
        }).ToList();

        return new StudentGradeDetailDto
        {
            SubjectCode = classInfo.Subject.SubjectCode,
            SubjectName = classInfo.Subject.SubjectName,
            Average = grade.FinalScore,
            Status = grade.Status ?? "In Progress",
            GradeComponents = gradeComponents
        };
    }

    /// lấy GPA của sinh viên trong một semester
    public async Task<SemesterGPADto> GetStudentSemesterGPAAsync(int studentId, int semesterId)
    {
        var courses = await GetStudentCoursesBySemesterAsync(studentId, semesterId);
        var coursesList = courses.ToList();

        if (!coursesList.Any())
        {
            return new SemesterGPADto
            {
                GPA = 0,
                TotalCourses = 0,
                PassedCourses = 0,
                FailedCourses = 0
            };
        }

        var completedCourses = coursesList.Where(c => c.Average.HasValue).ToList();
        var totalCourses = completedCourses.Count;
        var passedCourses = completedCourses.Count(c => c.Average >= 5.0m);
        var failedCourses = totalCourses - passedCourses;

        var average = completedCourses.Any() 
            ? completedCourses.Average(c => c.Average ?? 0m) 
            : 0m;

        return new SemesterGPADto
        {
            GPA = average,
            TotalCourses = totalCourses,
            PassedCourses = passedCourses,
            FailedCourses = failedCourses
        };
    }
}
