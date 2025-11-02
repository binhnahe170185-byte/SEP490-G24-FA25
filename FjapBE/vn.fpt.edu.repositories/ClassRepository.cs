using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class ClassRepository : GenericRepository<Class>, IClassRepository
{
    public ClassRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Class?> GetWithStudentsAsync(int id)
    {
        return await _context.Classes
            .Include(c => c.Subject)
                .ThenInclude(s => s.Level)
            .Include(c => c.Level)
            .Include(c => c.Semester)
            .Include(c => c.Students)
                .ThenInclude(s => s.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClassId == id);
    }

    public async Task<IEnumerable<Class>> GetAllAsync()
    {
        return await _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .Include(c => c.Subject)
                .ThenInclude(s => s.Level)
            .Include(c => c.Students)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Class?> GetSubjectsAsync(string classId)
    {
        if (string.IsNullOrWhiteSpace(classId))
        {
            return null;
        }

        var normalizedId = classId.Trim();

        IQueryable<Class> BuildQuery() => _context.Classes
            .Include(c => c.Subject)
                .ThenInclude(s => s.Level)
            .Include(c => c.Students)
            .Include(c => c.Lessons)
                .ThenInclude(l => l.Lecture)
                    .ThenInclude(le => le.User)
            .AsNoTracking();

        Class? cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassId.ToString() == normalizedId);

        if (cls == null)
        {
            cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassName == normalizedId);
        }

        if (cls == null)
        {
            var numericPart = new string(normalizedId.Where(char.IsDigit).ToArray());
            if (int.TryParse(numericPart, out var numericId))
            {
                cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassId == numericId);
            }
        }

        return cls;
    }

    public async Task<Class> UpdateStatusAsync(string classId, bool status)
    {
        var cls = await _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .FirstOrDefaultAsync(c => c.ClassId.ToString() == classId);

        if (cls == null)
        {
            throw new KeyNotFoundException("Class not found");
        }

        cls.Status = status ? "Active" : "Inactive";
        cls.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return cls;
    }

    public async Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId)
    {
        var subjectId = await _context.Classes
            .Where(c => c.ClassId == classId)
            .Select(c => c.SubjectId)
            .FirstOrDefaultAsync();

        var enrollmentTotals = await _context.Database
            .SqlQueryRaw<EnrollmentCount>(
                "SELECT class_id, COUNT(student_id) AS total_students FROM enrollment WHERE class_id = {0} GROUP BY class_id",
                classId)
            .ToListAsync();

        var totalStudents = enrollmentTotals.FirstOrDefault()?.total_students ?? 0;

        if (subjectId == 0)
        {
            return new Dictionary<int, int>();
        }

        return new Dictionary<int, int> { [subjectId] = totalStudents };
    }

    public async Task<(List<Level> Levels, List<Semester> Semesters, List<Subject> Subjects)> GetFormOptionsAsync()
    {
        var levels = await _context.Levels
            .AsNoTracking()
            .OrderBy(l => l.LevelName)
            .ToListAsync();

        var semesters = await _context.Semesters
            .AsNoTracking()
            .OrderByDescending(s => s.StartDate)
            .ToListAsync();

        var subjects = await _context.Subjects
            .Include(s => s.Level)
            .AsNoTracking()
            .Where(s => s.Status != null && s.Status.ToLower() == "active")
            .OrderBy(s => s.SubjectName)
            .ToListAsync();

        return (levels, semesters, subjects);
    }

    private sealed record EnrollmentCount(int class_id, int total_students);
    public async Task<List<ClassGradeDto>> GetClassesWithGradesAsync(ClassGradeFilterRequest? filter = null)
    {
        var query = _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .Include(c => c.Subject)
            .Include(c => c.Students)
            .AsQueryable();

        // Apply filters
        if (filter != null)
        {
            if (filter.SemesterId.HasValue)
                query = query.Where(c => c.SemesterId == filter.SemesterId.Value);

            if (filter.LevelId.HasValue)
                query = query.Where(c => c.LevelId == filter.LevelId.Value);

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(c => c.Status == filter.Status);

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(c => 
                    c.ClassName.ToLower().Contains(searchTerm) ||
                    (c.Subject != null && c.Subject.SubjectCode.ToLower().Contains(searchTerm)) ||
                    (c.Subject != null && c.Subject.SubjectName.ToLower().Contains(searchTerm))
                );
            }
        }

        var classes = await query
            .OrderByDescending(c => c.SemesterId)
            .ThenBy(c => c.ClassName)
            .ToListAsync();

        var result = new List<ClassGradeDto>();

        foreach (var cls in classes)
        {
            var totalStudents = cls.Students?.Count ?? 0;
            
            // Get grades for this class's subject
            var gradeStats = new
            {
                StudentsWithGrades = 0,
                PassedCount = 0,
                FailedCount = 0,
                IncompleteCount = totalStudents,
                AverageScore = 0m,
                GradingProgress = 0
            };

            if (totalStudents > 0)
            {
                var studentIds = cls.Students.Select(s => s.StudentId).ToList();
                
                var grades = await _context.Grades
                    .Where(g => g.SubjectId == cls.SubjectId && studentIds.Contains(g.StudentId))
                    .ToListAsync();

                var validGrades = grades.Where(g => g.FinalScore.HasValue && g.FinalScore.Value > 0).ToList();
                var studentsWithGrades = validGrades.Count;
                var passedCount = validGrades.Count(g => g.FinalScore >= 5.0m);
                var failedCount = validGrades.Count(g => g.FinalScore < 5.0m);
                var incompleteCount = totalStudents - studentsWithGrades;
                var averageScore = validGrades.Any() 
                    ? validGrades.Average(g => g.FinalScore ?? 0) 
                    : 0m;

                gradeStats = new
                {
                    StudentsWithGrades = studentsWithGrades,
                    PassedCount = passedCount,
                    FailedCount = failedCount,
                    IncompleteCount = incompleteCount,
                    AverageScore = averageScore,
                    GradingProgress = studentsWithGrades
                };
            }

            var gradingPercent = totalStudents > 0 
                ? (int)Math.Round((gradeStats.GradingProgress / (double)totalStudents) * 100) 
                : 0;

            var completionStatus = gradingPercent == 100 ? "100% Complete" 
                : gradingPercent > 0 ? "In Progress" 
                : "Not Started";

            result.Add(new ClassGradeDto
            {
                ClassId = cls.ClassId,
                ClassName = cls.ClassName,
                SemesterId = cls.SemesterId,
                SemesterName = cls.Semester?.Name ?? "Unknown",
                SemesterStartDate = cls.Semester?.StartDate.ToDateTime(TimeOnly.MinValue),
                SemesterEndDate = cls.Semester?.EndDate.ToDateTime(TimeOnly.MinValue),
                SubjectId = cls.SubjectId,
                SubjectCode = cls.Subject?.SubjectCode ?? "N/A",
                SubjectName = cls.Subject?.SubjectName ?? cls.ClassName,
                LevelId = cls.LevelId,
                LevelName = cls.Level?.LevelName ?? "Unknown",
                Status = cls.Status ?? "Active",
                UpdatedAt = cls.UpdatedAt,
                TotalStudents = totalStudents,
                StudentsWithGrades = gradeStats.StudentsWithGrades,
                PassedCount = gradeStats.PassedCount,
                FailedCount = gradeStats.FailedCount,
                IncompleteCount = gradeStats.IncompleteCount,
                AverageScore = gradeStats.AverageScore,
                GradingProgress = gradeStats.GradingProgress,
                GradingTotal = totalStudents,
                GradingPercent = gradingPercent,
                CompletionPercent = gradingPercent,
                CompletionStatus = completionStatus
            });
        }

        // Apply completion status filter if provided
        if (filter?.CompletionStatus != null && filter.CompletionStatus != "All Status")
        {
            result = result.Where(c => c.CompletionStatus == filter.CompletionStatus).ToList();
        }

        return result;
    }

    public async Task<ClassGradeDetailDto?> GetClassGradeDetailsAsync(int classId)
    {
        var cls = await _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Subject)
                .ThenInclude(s => s.SubjectGradeTypes)
            .Include(c => c.Students)
                .ThenInclude(s => s.User)
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (cls == null)
            return null;

        var studentIds = cls.Students.Select(s => s.StudentId).ToList();
        
        // Get all grades for students in this class for this subject
        var grades = await _context.Grades
            .Include(g => g.GradeTypes)
                .ThenInclude(gt => gt.SubjectGradeType)
            .Where(g => g.SubjectId == cls.SubjectId && studentIds.Contains(g.StudentId))
            .ToListAsync();

        var gradeDict = grades.ToDictionary(g => g.StudentId);

        var studentGrades = cls.Students.Select(student =>
        {
            gradeDict.TryGetValue(student.StudentId, out var grade);
            var components = grade?.GradeTypes?.ToList() ?? new List<GradeType>();

            var studentGrade = new StudentGradeDto
            {
                StudentId = student.StudentId,
                StudentCode = student.StudentCode ?? student.StudentId.ToString(),
                StudentName = $"{student.User?.FirstName ?? ""} {student.User?.LastName ?? ""}".Trim(),
                Email = student.User?.Email ?? "N/A",
                Average = grade?.FinalScore,
                Status = grade?.Status ?? "Incomplete",
                GradeId = grade?.GradeId
            };

            // Map all grade components dynamically
            foreach (var subjectGradeType in cls.Subject?.SubjectGradeTypes ?? new List<SubjectGradeType>())
            {
                var component = components.FirstOrDefault(c => c.SubjectGradeTypeId == subjectGradeType.SubjectGradeTypeId);
                var score = component?.Score;

                // Add to dynamic grade component scores
                studentGrade.GradeComponentScores.Add(new GradeComponentScoreDto
                {
                    SubjectGradeTypeId = subjectGradeType.SubjectGradeTypeId,
                    GradeTypeName = subjectGradeType.GradeTypeName,
                    Score = score,
                    Comment = component?.Comment,
                    Status = component?.Status ?? "Pending"
                });

                // Map to legacy fields for backward compatibility
                if (subjectGradeType.GradeTypeName.ToLower().Contains("participation") || 
                    subjectGradeType.GradeTypeName.ToLower().Contains("attendance")) {
                    studentGrade.Participation = score;
                } else if (subjectGradeType.GradeTypeName.ToLower().Contains("assignment")) {
                    studentGrade.Assignment = score;
                } else if (subjectGradeType.GradeTypeName.ToLower().Contains("progress test 1") || 
                           subjectGradeType.GradeTypeName.ToLower().Contains("pt1")) {
                    studentGrade.ProgressTest1 = score;
                } else if (subjectGradeType.GradeTypeName.ToLower().Contains("progress test 2") || 
                           subjectGradeType.GradeTypeName.ToLower().Contains("pt2")) {
                    studentGrade.ProgressTest2 = score;
                } else if (subjectGradeType.GradeTypeName.ToLower().Contains("final")) {
                    studentGrade.FinalExam = score;
                }
            }

            return studentGrade;
        }).ToList();

        // Get grade component weights for this subject
        var gradeComponentWeights = cls.Subject?.SubjectGradeTypes?.Select(sgt => new GradeComponentWeightDto
        {
            SubjectGradeTypeId = sgt.SubjectGradeTypeId,
            GradeTypeName = sgt.GradeTypeName,
            Weight = sgt.Weight,
            MaxScore = sgt.MaxScore
        }).ToList() ?? new List<GradeComponentWeightDto>();

        return new ClassGradeDetailDto
        {
            ClassId = cls.ClassId,
            ClassName = cls.ClassName,
            SemesterName = cls.Semester?.Name ?? "Unknown",
            SubjectCode = cls.Subject?.SubjectCode ?? "N/A",
            SubjectName = cls.Subject?.SubjectName ?? cls.ClassName,
            Students = studentGrades,
            GradeComponentWeights = gradeComponentWeights
        };
    }

    public async Task<bool> ExistsWithNameAndSubjectAsync(string className, int subjectId, int? excludeClassId = null)
    {
        if (string.IsNullOrWhiteSpace(className))
        {
            return false;
        }

        var normalizedName = className.Trim();

        var query = _context.Classes
            .AsNoTracking()
            .Where(c => c.SubjectId == subjectId && c.ClassName == normalizedName);

        if (excludeClassId.HasValue)
        {
            query = query.Where(c => c.ClassId != excludeClassId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<IEnumerable<ClassScheduleDto>> GetClassScheduleBySemesterAsync(int semesterId, int classId)
    {
        // Lấy thông tin semester để có StartDate
        var semester = await _context.Semesters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SemesterId == semesterId);

        if (semester == null)
        {
            return new List<ClassScheduleDto>();
        }

        // Tính tuần đầu tiên: từ StartDate đến StartDate + 6 ngày
        var firstWeekStart = semester.StartDate;
        var firstWeekEnd = firstWeekStart.AddDays(6);

        // Kiểm tra class có thuộc semester này không
        var classExists = await _context.Classes
            .AsNoTracking()
            .AnyAsync(c => c.ClassId == classId && c.SemesterId == semesterId);

        if (!classExists)
        {
            return new List<ClassScheduleDto>();
        }

        // Query lessons trong tuần đầu tiên và map sang DTO
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Time)
            .Where(l => l.ClassId == classId 
                && l.Date >= firstWeekStart 
                && l.Date <= firstWeekEnd)
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new ClassScheduleDto
            {
                ClassId = l.ClassId,
                ClassName = l.Class.ClassName,
                Date = l.Date,
                RoomName = l.Room.RoomName,
                TimeId = l.TimeId,
                StartTime = l.Time.StartTime,
                EndTime = l.Time.EndTime,
                SubjectCode = l.Class.Subject.SubjectCode
            })
            .ToListAsync();

        return lessons;
    }

    private static decimal? ExtractGradeComponent(List<GradeType> components, params string[] possibleNames)
    {
        var component = components.FirstOrDefault(c =>
            possibleNames.Any(name =>
                c.SubjectGradeType?.GradeTypeName?.Contains(name, StringComparison.OrdinalIgnoreCase) == true
            )
        );

        return component?.Score;
    }
}
