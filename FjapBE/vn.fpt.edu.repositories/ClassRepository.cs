using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class ClassRepository : GenericRepository<Class>, IClassRepository
{
    private readonly IScheduleAvailabilityService _availabilityService;

    public ClassRepository(FjapDbContext context, IScheduleAvailabilityService availabilityService) : base(context)
    {
        _availabilityService = availabilityService;
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
            // Apply basic filters first (semester, level, status)
            if (filter.SemesterId.HasValue)
                query = query.Where(c => c.SemesterId == filter.SemesterId.Value);

            if (filter.LevelId.HasValue)
                query = query.Where(c => c.LevelId == filter.LevelId.Value);

            // Filter by lecturer UserId - classes that have lessons taught by this lecturer
            // Lecturer is linked via: User -> Lecture -> Lessons -> Class
            // This filter should be applied after semester/level filters for better performance
            if (filter.UserId.HasValue)
            {
                // Get LectureId from UserId
                var lectureId = await _context.Lectures
                    .Where(l => l.UserId == filter.UserId.Value)
                    .Select(l => l.LectureId)
                    .FirstOrDefaultAsync();
                
                if (lectureId > 0)
                {
                    // Get distinct ClassIds from Lessons where LectureId matches
                    // Also apply semester and status filters to lessons for better performance
                    var lessonsQuery = _context.Lessons
                        .Include(l => l.Class)
                        .Where(l => l.LectureId == lectureId);
                    
                    // If semester filter is applied, also filter lessons by semester
                    if (filter.SemesterId.HasValue)
                    {
                        lessonsQuery = lessonsQuery.Where(l => l.Class.SemesterId == filter.SemesterId.Value);
                    }
                    
                    // Always filter by Active status for lecturer - only get classes with Active status
                    lessonsQuery = lessonsQuery.Where(l => l.Class.Status == "Active");
                    
                    var classIdsTaughtByLecturer = await lessonsQuery
                        .Select(l => l.ClassId)
                        .Distinct()
                        .ToListAsync();
                    
                    query = query.Where(c => classIdsTaughtByLecturer.Contains(c.ClassId));
                }
                else
                {
                    // If no lecture found for this userId, return empty result
                    query = query.Where(c => false);
                }
            }

            // Always filter by Status if provided (apply after UserId filter to ensure it works correctly)
            // For lecturer (UserId provided), always filter by Active status
            if (filter.UserId.HasValue)
            {
                // For lecturer, always show only Active classes
                query = query.Where(c => c.Status == "Active");
            }
            else if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                // For manager, use the provided status filter
                query = query.Where(c => c.Status == filter.Status);
            }

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

        // Lấy tất cả lessons trong toàn bộ semester
        var semesterStart = semester.StartDate;
        var semesterEnd = semester.EndDate;

        // Kiểm tra class có thuộc semester này không
        var classExists = await _context.Classes
            .AsNoTracking()
            .AnyAsync(c => c.ClassId == classId && c.SemesterId == semesterId);

        if (!classExists)
        {
            return new List<ClassScheduleDto>();
        }

        // Query tất cả lessons trong semester và map sang DTO
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Lecture)
            .Include(l => l.Time)
            .Where(l => l.ClassId == classId 
                && l.Date >= semesterStart 
                && l.Date <= semesterEnd)
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
                SubjectCode = l.Class.Subject.SubjectCode,
                LecturerCode = l.Lecture != null ? l.Lecture.LecturerCode : ""
            })
            .ToListAsync();

        return lessons;
    }

    public async Task<int> CreateScheduleFromPatternsAsync(CreateScheduleRequest request)
    {
        Console.WriteLine("=== ClassRepository.CreateScheduleFromPatternsAsync called ===");
        Console.WriteLine($"SemesterId: {request.SemesterId}, ClassId: {request.ClassId}, LecturerId: {request.LecturerId}");
        Console.WriteLine($"Patterns count: {request.Patterns?.Count ?? 0}");

        // Validate semester exists
        var semester = await _context.Semesters
            .FirstOrDefaultAsync(s => s.SemesterId == request.SemesterId);
        
        if (semester == null)
        {
            throw new ArgumentException($"Semester with ID {request.SemesterId} not found");
        }

        // Validate class exists and belongs to semester
        var classEntity = await _context.Classes
            .FirstOrDefaultAsync(c => c.ClassId == request.ClassId && c.SemesterId == request.SemesterId);
        
        if (classEntity == null)
        {
            throw new ArgumentException($"Class with ID {request.ClassId} not found or does not belong to semester {request.SemesterId}");
        }

        // Validate lecturer exists
        var lecturer = await _context.Lectures
            .FirstOrDefaultAsync(l => l.LectureId == request.LecturerId);
        
        if (lecturer == null)
        {
            throw new ArgumentException($"Lecturer with ID {request.LecturerId} not found");
        }

        // Validate patterns
        if (request.Patterns == null || request.Patterns.Count == 0)
        {
            throw new ArgumentException("At least one pattern is required");
        }

        // Validate rooms and timeslots exist
        var roomIds = request.Patterns.Select(p => p.RoomId).Distinct().ToList();
        var timeIds = request.Patterns.Select(p => p.TimeId).Distinct().ToList();

        var roomsExist = await _context.Rooms
            .Where(r => roomIds.Contains(r.RoomId))
            .Select(r => r.RoomId)
            .ToListAsync();
        
        var missingRooms = roomIds.Except(roomsExist).ToList();
        if (missingRooms.Any())
        {
            throw new ArgumentException($"Rooms not found: {string.Join(", ", missingRooms)}");
        }

        var timeslotsExist = await _context.Timeslots
            .Where(t => timeIds.Contains(t.TimeId))
            .Select(t => t.TimeId)
            .ToListAsync();
        
        var missingTimeslots = timeIds.Except(timeslotsExist).ToList();
        if (missingTimeslots.Any())
        {
            throw new ArgumentException($"Timeslots not found: {string.Join(", ", missingTimeslots)}");
        }

        // Get holidays for this semester
        var holidays = await _context.Holidays
            .Where(h => h.SemesterId == request.SemesterId)
            .Select(h => h.HolidayDate)
            .ToListAsync();

        // Get startDate and endDate from semester
        var startDate = semester.StartDate;
        var endDate = semester.EndDate;

        Console.WriteLine($"Holidays count: {holidays.Count}");
        var studentScheduleCache = await _availabilityService.BuildStudentScheduleCacheAsync(request.ClassId, startDate, endDate);
        var classStudentIds = studentScheduleCache.StudentIds ?? Array.Empty<int>();
        var studentTimeMap = studentScheduleCache.StudentTimeMap ?? new Dictionary<int, HashSet<string>>();

        // Prepare for conflict detection and lesson generation
        var lessonsToCreate = new List<Lesson>();
        var conflictMessages = new List<string>();

        // Find Monday of semester start
        var startDayOfWeek = (int)startDate.DayOfWeek;
        var daysToMonday = startDayOfWeek == 0 ? 6 : startDayOfWeek - 1; // Sunday = 0, Monday = 1
        var mondayOfStart = startDate.AddDays(-daysToMonday);

        var currentDate = mondayOfStart;
        int lessonCount = 0;
        int updatedCount = 0;

        // Preload existing lessons in range for conflict checks
        var existingLessonsInRange = await _context.Lessons
            .Where(l => l.Date >= semester.StartDate && l.Date <= semester.EndDate)
            .ToListAsync();

        // Build lookup sets/maps for fast conflict checks
        // Class-time conflicts (same class, same date/time regardless of room)
        var classTimeSet = existingLessonsInRange
            .Where(l => l.ClassId == request.ClassId)
            .Select(l => $"{l.Date:yyyy-MM-dd}|{l.TimeId}")
            .ToHashSet();

        // Room-time conflicts (same room, same date/time regardless of class)
        var roomTimeSet = existingLessonsInRange
            .Where(l => roomIds.Contains(l.RoomId))
            .Select(l => $"{l.Date:yyyy-MM-dd}|{l.TimeId}|{l.RoomId}")
            .ToHashSet();

        // Lecturer-time conflicts (same lecturer, same date/time regardless of class/room)
        var lecturerTimeSet = existingLessonsInRange
            .Where(l => l.LectureId == request.LecturerId)
            .Select(l => $"{l.Date:yyyy-MM-dd}|{l.TimeId}")
            .ToHashSet();

        // Generate lessons for each week in semester and detect conflicts
        while (currentDate <= endDate)
        {
            // Check if we've reached the TotalLesson limit
            if (request.TotalLesson.HasValue && lessonCount >= request.TotalLesson.Value)
            {
                Console.WriteLine($"Reached TotalLesson limit ({request.TotalLesson.Value}). Stopping lesson generation.");
                break;
            }

            // For each weekday (Mon-Sun, which are days 0-6 in C# DayOfWeek)
            for (int dayOffset = 0; dayOffset < 7; dayOffset++)
            {
                // Check if we've reached the TotalLesson limit (check again inside loop)
                if (request.TotalLesson.HasValue && lessonCount >= request.TotalLesson.Value)
                {
                    break;
                }

                var lessonDate = currentDate.AddDays(dayOffset);

                // Skip if beyond semester end
                if (lessonDate > endDate) break;

                // Skip if before semester start
                if (lessonDate < startDate) continue;

                // Skip if holiday
                if (holidays.Contains(lessonDate)) continue;

                // Get day of week (0=Sun, 1=Mon, ..., 6=Sat)
                // Convert to our format: Mon=2 ... Sat=7, Sun=8
                var dayOfWeek = (int)lessonDate.DayOfWeek;
                var normalizedWeekday = dayOfWeek == 0 ? 8 : dayOfWeek + 1; // Sunday = 0 -> 8, Monday = 1 -> 2

                // Check if this weekday matches any pattern
                foreach (var pattern in request.Patterns)
                {
                    // Check limit again before processing each pattern
                    if (request.TotalLesson.HasValue && lessonCount >= request.TotalLesson.Value)
                    {
                        break;
                    }

                    if (pattern.Weekday == normalizedWeekday)
                    {
                        var dateKey = $"{lessonDate:yyyy-MM-dd}";
                        var classTimeKey = $"{dateKey}|{pattern.TimeId}";
                        var roomTimeKey = $"{dateKey}|{pattern.TimeId}|{pattern.RoomId}";
                        var lecturerTimeKey = $"{dateKey}|{pattern.TimeId}";

                        // Detect conflicts:
                        // 1) Class-time: same class already has a lesson at this date/time
                        if (classTimeSet.Contains(classTimeKey))
                        {
                            conflictMessages.Add($"Class conflict: class #{request.ClassId} already has a lesson at {dateKey} timeId {pattern.TimeId}.");
                            continue;
                        }

                        // 2) Room-time: same room already occupied at this date/time
                        if (roomTimeSet.Contains(roomTimeKey))
                        {
                            conflictMessages.Add($"Room conflict: room #{pattern.RoomId} is occupied at {dateKey} timeId {pattern.TimeId}.");
                            continue;
                        }
                        var conflictedStudents = new List<int>();
                        if (classStudentIds.Any())
                        {
                            foreach (var studentId in classStudentIds)
                            {
                                if (studentTimeMap.TryGetValue(studentId, out var studentSlots) && studentSlots.Contains(classTimeKey))
                                {
                                    conflictedStudents.Add(studentId);
                                }
                            }
                        }

                        if (conflictedStudents.Any())
                        {
                            var previewList = string.Join(", ", conflictedStudents.Take(5));
                            var suffix = conflictedStudents.Count > 5 ? $" (+{conflictedStudents.Count - 5} more)" : string.Empty;
                            conflictMessages.Add($"Student conflict: students [{previewList}{suffix}] are already scheduled at {dateKey} timeId {pattern.TimeId}.");
                            continue;
                        }

                        // 3) Lecturer-time: lecturer already occupied at this date/time
                        if (lecturerTimeSet.Contains(lecturerTimeKey))
                        {
                            conflictMessages.Add($"Lecturer conflict: lecturer #{request.LecturerId} is teaching at {dateKey} timeId {pattern.TimeId}.");
                            continue;
                        }

                        // No conflicts detected; stage new lesson for creation
                        var lesson = new Lesson
                        {
                            ClassId = request.ClassId,
                            RoomId = pattern.RoomId,
                            TimeId = pattern.TimeId,
                            LectureId = request.LecturerId,
                            Date = lessonDate
                        };

                        lessonsToCreate.Add(lesson);
                        lessonCount++;

                        // Update lookup sets to reflect staged additions (avoid intra-batch conflicts)
                        classTimeSet.Add(classTimeKey);
                        roomTimeSet.Add(roomTimeKey);
                        lecturerTimeSet.Add(lecturerTimeKey);
                        if (classStudentIds.Any())
                        {
                            foreach (var studentId in classStudentIds)
                            {
                                if (!studentTimeMap.TryGetValue(studentId, out var slots))
                                {
                                    slots = new HashSet<string>();
                                    studentTimeMap[studentId] = slots;
                                }
                                slots.Add(classTimeKey);
                            }
                        }
                    }
                }
            }

            // Move to next week
            currentDate = currentDate.AddDays(7);
        }

        // If any conflicts detected, abort without saving
        if (conflictMessages.Any())
        {
            var details = string.Join(" ", conflictMessages.Distinct());
            Console.WriteLine($"Conflicts detected, aborting save: {details}");
            throw new ArgumentException($"Schedule conflicts detected. {details}");
        }

        if (request.TotalLesson.HasValue && lessonCount >= request.TotalLesson.Value)
        {
            Console.WriteLine($"Generated {lessonCount} new lessons (limited by TotalLesson={request.TotalLesson.Value}) and updated {updatedCount} existing lessons from patterns");
        }
        else
        {
            Console.WriteLine($"Generated {lessonCount} new lessons and updated {updatedCount} existing lessons from patterns");
        }

        // Save all new lessons
        if (lessonsToCreate.Any())
        {
            await _context.Lessons.AddRangeAsync(lessonsToCreate);
        }

        // Save changes (for both new lessons and updated existing lessons)
        if (lessonsToCreate.Any() || updatedCount > 0)
        {
            await _context.SaveChangesAsync();
            Console.WriteLine($"Saved {lessonCount} new lessons and updated {updatedCount} existing lessons to database");
        }

        return lessonCount + updatedCount;
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
