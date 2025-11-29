using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
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
        // Lấy danh sách classIds mà student tham gia
        var classIds = await _context.Students
            .AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .SelectMany(s => s.Classes.Select(c => c.ClassId))
            .ToListAsync();

        if (!classIds.Any())
        {
            return new List<LessonDto>();
        }

        // Query lessons từ các classes mà student tham gia và map sang DTO
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Lecture)
            .Include(l => l.Time)
            .Include(l => l.Attendances)
            .Where(l => classIds.Contains(l.ClassId))
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
                Attendance = l.Attendances
                    .Where(a => a.StudentId == studentId)
                    .Select(a => a.Status)
                    .FirstOrDefault(),
                StartTime = l.Time.StartTime,
                EndTime = l.Time.EndTime,
                SubjectCode = l.Class.Subject.SubjectCode
            })
            .ToListAsync();

        return lessons;
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

    /// Lấy danh sách tất cả môn học active trong curriculum với search và pagination
    public async Task<(IEnumerable<CurriculumSubjectDto> Items, int TotalCount)> GetCurriculumSubjectsAsync(string? search, int page, int pageSize)
    {
        // Query base với filter active
        var query = _context.Subjects
            .AsNoTracking()
            .Where(s => s.Status != null && s.Status.ToLower() == "active");

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim().ToLower();
            query = query.Where(s =>
                s.SubjectCode.ToLower().Contains(searchTerm) ||
                s.SubjectName.ToLower().Contains(searchTerm) ||
                (s.Description != null && s.Description.ToLower().Contains(searchTerm))
            );
        }

        // Get total count
        var totalCount = await query.CountAsync();

        // Apply pagination
        var subjectsData = await query
            .Include(s => s.SubjectGradeTypes)
            .OrderBy(s => s.SubjectCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new CurriculumSubjectDto
            {
                SubjectId = s.SubjectId,
                SubjectCode = s.SubjectCode,
                SubjectName = s.SubjectName,
                Description = s.Description,
                PassMark = s.PassMark,
                Status = s.Status ?? "Active",
                TotalLesson = s.TotalLesson,
                GradeComponents = s.SubjectGradeTypes
                    .Select(sgt => new SubjectGradeComponentInfoDto
                    {
                        GradeTypeName = sgt.GradeTypeName,
                        Weight = sgt.Weight,
                        MaxScore = sgt.MaxScore
                    })
                    .ToList(),
                Materials = new List<SubjectMaterialDto>() // Tạm thời để trống, sẽ load sau nếu cần
            })
            .ToListAsync();

        return (subjectsData, totalCount);
    }

    /// Lấy Academic Transcript (bảng điểm tổng hợp) của sinh viên
    public async Task<AcademicTranscriptDto> GetAcademicTranscriptAsync(int studentId)
    {
        // Lấy tất cả các lớp mà sinh viên đã tham gia
        var classes = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Semester)
            .Where(c => c.Students.Any(s => s.StudentId == studentId))
            .ToListAsync();

        // Lấy tất cả các điểm của sinh viên này
        var subjectIds = classes.Select(c => c.SubjectId).Distinct().ToList();
        var grades = await _context.Grades
            .Where(g => g.StudentId == studentId && subjectIds.Contains(g.SubjectId))
            .ToListAsync();

        var gradeDict = grades.ToDictionary(g => g.SubjectId);

        // Map sang DTO
        var coursesList = classes.Select(c =>
        {
            gradeDict.TryGetValue(c.SubjectId, out var grade);
            return new AcademicTranscriptCourseDto
            {
                CourseId = c.ClassId,
                SubjectCode = c.Subject.SubjectCode,
                SubjectName = c.Subject.SubjectName,
                Grade = grade?.FinalScore,
                Status = grade != null ? (grade.Status ?? "In Progress") : "Not Started",
                SemesterName = c.Semester != null ? c.Semester.Name : "N/A",
                SemesterId = c.SemesterId 
            };
        })
        .OrderByDescending(c => c.SemesterId)
        .ThenBy(c => c.SubjectCode)
        .ToList();

        // Tính toán thống kê
        var totalCourses = coursesList.Count;
        var completedCourses = coursesList.Where(c => c.Grade.HasValue).ToList();
        var passedCourses = completedCourses.Count(c => c.Grade >= 5.0m);
        var failedCourses = completedCourses.Count(c => c.Grade < 5.0m);
        var inProgressCourses = coursesList.Count(c => !c.Grade.HasValue || c.Status == "In Progress" || c.Status == "Not Started");

        // Tính Average GPA (chỉ tính các môn đã có điểm)
        var averageGPA = completedCourses.Any()
            ? completedCourses.Average(c => c.Grade ?? 0m)
            : 0m;

        return new AcademicTranscriptDto
        {
            AverageGPA = averageGPA,
            TotalCourses = totalCourses,
            PassedCourses = passedCourses,
            FailedCourses = failedCourses,
            InProgressCourses = inProgressCourses,
            Courses = coursesList
        };
    }

    // Attendance (student) - split APIs
    public async Task<IEnumerable<StudentAttendanceSubjectDto>> GetStudentAttendanceSubjectsAsync(int studentId, int semesterId)
    {
        var subjects = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Subject)
            .Where(c => c.SemesterId == semesterId && c.Students.Any(s => s.StudentId == studentId))
            .OrderBy(c => c.Subject.SubjectCode)
            .Select(c => new StudentAttendanceSubjectDto
            {
                SubjectId = c.SubjectId,
                SubjectCode = c.Subject.SubjectCode,
                SubjectName = c.Subject.SubjectName,
                ClassName = c.ClassName,
                ClassId = c.ClassId
            })
            .ToListAsync();

        return subjects;
    }

    public async Task<IEnumerable<StudentAttendanceLessonDto>> GetStudentAttendanceLessonsAsync(int studentId, int semesterId, int subjectId)
    {
        // Find all classes in semester for this subject and student
        var classIds = await _context.Classes
            .AsNoTracking()
            .Where(c => c.SemesterId == semesterId && c.SubjectId == subjectId && c.Students.Any(s => s.StudentId == studentId))
            .Select(c => c.ClassId)
            .ToListAsync();

        if (classIds.Count == 0) return new List<StudentAttendanceLessonDto>();

        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Room)
            .Include(l => l.Time)
            .Include(l => l.Lecture)
            .Where(l => classIds.Contains(l.ClassId))
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new
            {
                l.LessonId,
                l.Date,
                l.TimeId,
                RoomName = l.Room.RoomName,
                LectureCode = l.Lecture.LecturerCode ?? ""
            })
            .ToListAsync();

        var lessonIds = lessons.Select(l => l.LessonId).ToList();
        var attendance = await _context.Attendances
            .AsNoTracking()
            .Where(a => a.StudentId == studentId && lessonIds.Contains(a.LessonId))
            .ToDictionaryAsync(a => a.LessonId, a => a.Status ?? "Absent");

        return lessons.Select(l => new StudentAttendanceLessonDto
        {
            LessonId = l.LessonId,
            Date = l.Date.ToString("yyyy-MM-dd"),
            TimeId = l.TimeId,
            RoomName = l.RoomName,
            Status = attendance.TryGetValue(l.LessonId, out var st) ? st : "Absent",
            LectureCode = l.LectureCode
        })
        .ToList();
    }
}
