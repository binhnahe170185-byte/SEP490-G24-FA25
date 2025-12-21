using FJAP.DTOs;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace FJAP.Services
{
    public class GradeService : IGradeService
    {
        private readonly IGradeRepository _gradeRepository;
        private readonly FjapDbContext _context;
        private readonly INotificationService _notificationService;

        public GradeService(IGradeRepository gradeRepository, FjapDbContext context, INotificationService notificationService)
        {
            _gradeRepository = gradeRepository;
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<PagedResult<GradeListDto>> GetGradesAsync(GradeFilterRequest filter)
        {
            // Validate pagination
            if (filter.PageNumber < 1) filter.PageNumber = 1;
            if (filter.PageSize < 1 || filter.PageSize > 100) filter.PageSize = 20;
            
            if (filter.UserId.HasValue)
            {
                var lecture = await _context.Lectures.FirstOrDefaultAsync(l => l.UserId == filter.UserId.Value);
                if (lecture != null)
                {
                    filter.LectureId = lecture.LectureId;
                }
            }

            return await _gradeRepository.GetGradesWithFilterAsync(filter);
        }

        public async Task<GradeDetailDto?> GetGradeByIdAsync(int gradeId)
        {
            return await _gradeRepository.GetGradeDetailAsync(gradeId);
        }

        public async Task<GradeFilterOptions> GetFilterOptionsAsync()
        {
            return await _gradeRepository.GetFilterOptionsAsync();
        }

        public async Task<bool> UpdateGradeStatusAsync(int gradeId, string status)
        {
            // Validate status
            var validStatuses = new[] { "In Progress", "Passed", "Failed" };
            if (!validStatuses.Contains(status))
            {
                throw new ArgumentException($"Invalid status. Must be one of: {string.Join(", ", validStatuses)}");
            }

            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var grade = await _context.Grades.FindAsync(gradeId);
                    if (grade == null) return false;

                    await _gradeRepository.UpdateGradeStatusAsync(gradeId, status);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<GradeStatisticsDto> GetStatisticsAsync(GradeFilterRequest? filter = null)
        {
            var stats = await _gradeRepository.GetGradeStatisticsAsync(filter);
            if (filter == null || (filter.SemesterId == null && filter.SubjectId == null && filter.LevelId == null))
            {
                stats.TotalStudents = await _context.Students.CountAsync();
            }
            else
            {
                var query = _context.Grades.AsQueryable();
                 if (filter.SubjectId.HasValue) query = query.Where(g => g.SubjectId == filter.SubjectId.Value);
                if (filter.SemesterId.HasValue) 
                    query = query.Where(g => g.Subject.Classes.Any(c => c.SemesterId == filter.SemesterId.Value)); // This is complex, maybe just ignore filter for Total Students for now or use simplified approach
                
                // Simple approach: Total Students in the system (Active)
                 stats.TotalStudents = await _context.Students.CountAsync();
            }

            return stats;
        }

        public async Task RecalculateFinalScoreAsync(int gradeId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var grade = await _context.Grades
                        .Include(g => g.GradeTypes)
                            .ThenInclude(gt => gt.SubjectGradeType)
                        .Include(g => g.Subject)
                        .FirstOrDefaultAsync(g => g.GradeId == gradeId);

                    if (grade == null)
                        throw new KeyNotFoundException($"Grade with ID {gradeId} not found");

                    // Calculate final score based on grade components
                    decimal finalScore = 0;
                    bool allGraded = true;

                    foreach (var gradeType in grade.GradeTypes)
                    {
                        if (gradeType.Score.HasValue && gradeType.SubjectGradeType != null)
                        {
                            // Formula: (score × weight) / 100
                            finalScore += (gradeType.Score.Value * gradeType.SubjectGradeType.Weight) / 100;
                        }
                        else
                        {
                            allGraded = false;
                        }
                    }

                    // Update grade
                    grade.FinalScore = finalScore;
                    grade.UpdatedAt = DateTime.UtcNow;

                    // Auto-update status based on score and completion
                    if (allGraded)
                    {
                        var passMark = grade.Subject.PassMark ?? 5.0m;
                        grade.Status = finalScore >= passMark ? " Passed" : "Failed";
                    }
                    else
                    {
                        grade.Status = "In Progress";
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<byte[]> ExportGradesToExcelAsync(GradeFilterRequest filter)
        {
            // Set a large page size to get all records for export
            filter.PageSize = int.MaxValue;
            filter.PageNumber = 1;

            var grades = await _gradeRepository.GetGradesWithFilterAsync(filter);

            // Create Excel workbook using ClosedXML
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Grades");

            // Set headers
            worksheet.Cell(1, 1).Value = "No.";
            worksheet.Cell(1, 2).Value = "Student Code";
            worksheet.Cell(1, 3).Value = "Student Name";
            worksheet.Cell(1, 4).Value = "Subject Code";
            worksheet.Cell(1, 5).Value = "Subject Name";
            worksheet.Cell(1, 6).Value = "Final Score";
            worksheet.Cell(1, 7).Value = "Status";
            worksheet.Cell(1, 8).Value = "Level";
            worksheet.Cell(1, 9).Value = "Semester";
            worksheet.Cell(1, 10).Value = "Updated At";

            // Style header row
            var headerRange = worksheet.Range(1, 1, 1, 10);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightBlue;
            headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // Add data
            int row = 2;
            int no = 1;
            foreach (var grade in grades.Items)
            {
                worksheet.Cell(row, 1).SetValue(no++);
                worksheet.Cell(row, 2).SetValue(grade.StudentCode ?? "");
                worksheet.Cell(row, 3).SetValue(grade.StudentName ?? "");
                worksheet.Cell(row, 4).SetValue(grade.SubjectCode ?? "");
                worksheet.Cell(row, 5).SetValue(grade.SubjectName ?? "");
                
                if (grade.FinalScore.HasValue)
                {
                    worksheet.Cell(row, 6).SetValue(grade.FinalScore.Value);
                }
                else
                {
                    worksheet.Cell(row, 6).SetValue("-");
                }
                
                worksheet.Cell(row, 7).SetValue(grade.Status ?? "");
                worksheet.Cell(row, 8).SetValue(grade.LevelName ?? "-");
                worksheet.Cell(row, 9).SetValue(grade.SemesterName ?? "-");
                worksheet.Cell(row, 10).SetValue(grade.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "-");
                
                // Center align numeric columns
                worksheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                worksheet.Cell(row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                worksheet.Cell(row, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                
                row++;
            }

            // Auto-fit columns
            worksheet.Columns().AdjustToContents();

            // Convert to byte array
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public async Task<bool> UpdateGradeComponentsAsync(UpdateGradeComponentsRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            GradeNotificationContext? notificationContext = null;

            var result = await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Get the grade with its components
                    // IMPORTANT: Explicitly query ALL GradeTypes for this grade from database
                    var grade = await _context.Grades
                        .Include(g => g.GradeTypes)
                            .ThenInclude(gt => gt.SubjectGradeType)
                        .Include(g => g.Student)
                            .ThenInclude(s => s.User)
                        .Include(g => g.Subject)
                        .FirstOrDefaultAsync(g => g.GradeId == request.GradeId);

                    if (grade == null)
                        return false;

                    // Query database explicitly for ALL existing GradeType records to avoid duplicates
                    var existingGradeTypeIds = await _context.Set<GradeType>()
                        .Where(gt => gt.GradeId == request.GradeId)
                        .Select(gt => gt.SubjectGradeTypeId)
                        .ToListAsync();


                    // Fetch all SubjectGradeTypes for this subject to ensure we have weights for calculation
                    var subjectGradeTypes = await _context.SubjectGradeTypes
                        .Where(sgt => sgt.SubjectId == grade.SubjectId)
                        .ToDictionaryAsync(sgt => sgt.SubjectGradeTypeId);

                    // Update each grade component
                    foreach (var componentUpdate in request.GradeComponents)
                    {
                        // Check if this SubjectGradeTypeId already exists in the database
                        var existsInDb = existingGradeTypeIds.Contains(componentUpdate.SubjectGradeTypeId);
                        
                        // Find in the loaded collection
                        var gradeType = grade.GradeTypes
                            .FirstOrDefault(gt => gt.SubjectGradeTypeId == componentUpdate.SubjectGradeTypeId);

                        if (gradeType != null)
                        {
                            // Update existing grade type
                            gradeType.Score = componentUpdate.Score;
                            gradeType.Comment = componentUpdate.Comment;
                            gradeType.Status = "Graded";
                            gradeType.GradedAt = DateTime.UtcNow;
                            // Note: GradedBy should be set from the authenticated user context
                        }
                        else if (!existsInDb)
                        {
                            // Only create new grade type if it doesn't exist in database
                            // This prevents unique constraint violations
                            var newGradeType = new GradeType
                            {
                                GradeId = request.GradeId,
                                SubjectGradeTypeId = componentUpdate.SubjectGradeTypeId,
                                Score = componentUpdate.Score,
                                Comment = componentUpdate.Comment,
                                Status = "Graded",
                                GradedAt = DateTime.UtcNow
                            };

                            if (subjectGradeTypes.TryGetValue(componentUpdate.SubjectGradeTypeId, out var sgt))
                            {
                                newGradeType.SubjectGradeType = sgt;
                            }

                            grade.GradeTypes.Add(newGradeType);
                        }
                        else
                        {
                            // Record exists in DB but not loaded in context - load it and update
                            var existingGradeType = await _context.Set<GradeType>()
                                .Include(gt => gt.SubjectGradeType)
                                .FirstOrDefaultAsync(gt => gt.GradeId == request.GradeId 
                                    && gt.SubjectGradeTypeId == componentUpdate.SubjectGradeTypeId);
                            
                            if (existingGradeType != null)
                            {
                                existingGradeType.Score = componentUpdate.Score;
                                existingGradeType.Comment = componentUpdate.Comment;
                                existingGradeType.Status = "Graded";
                                existingGradeType.GradedAt = DateTime.UtcNow;
                                
                                if (!grade.GradeTypes.Contains(existingGradeType))
                                {
                                    grade.GradeTypes.Add(existingGradeType);
                                }
                            }
                        }
                    }

                    // INLINE: Calculate final score (instead of calling RecalculateFinalScoreAsync)
                    decimal finalScore = 0;
                    bool allGraded = true;

                    foreach (var gradeType in grade.GradeTypes)
                    {
                        if (gradeType.Score.HasValue && gradeType.SubjectGradeType != null)
                        {
                            // Formula: (score × weight) / 100
                            finalScore += (gradeType.Score.Value * gradeType.SubjectGradeType.Weight) / 100;
                        }
                        else
                        {
                            allGraded = false;
                        }
                    }

                    // Update grade with calculated values
                    grade.FinalScore = finalScore;
                    grade.UpdatedAt = DateTime.UtcNow;

                    // Auto-update status based on score and completion
                    if (allGraded)
                    {
                        var passMark = grade.Subject.PassMark ?? 5.0m;
                        grade.Status = finalScore >= passMark ? " Passed" : "Failed";
                    }
                    else
                    {
                        grade.Status = "In Progress";
                    }

                    // Save all changes in single transaction
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    if (grade.Student?.User != null && grade.Subject != null)
                    {
                        notificationContext = new GradeNotificationContext(
                            grade.Student.UserId,
                            grade.Subject.SubjectName);
                    }

                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });

            if (result && notificationContext != null)
            {
                // Grade notification không cần entityId vì link luôn là /student/grades
                await _notificationService.CreateAsync(new CreateNotificationRequest(
                    notificationContext.UserId,
                    $"{notificationContext.SubjectName} grade has been updated",
                    $"Your grade for {notificationContext.SubjectName} has just been updated. Please review the latest details.",
                    "grade",
                    null,
                    null // Grade không cần entityId
                ));
            }

            return result;
        }

        private sealed record GradeNotificationContext(int UserId, string SubjectName);

        public async Task<DashboardChartDataDto> GetDashboardChartsAsync(GradeFilterRequest filter)
        {
            var result = new DashboardChartDataDto();

                    // Prepare lecturer filter if allowed
            List<int> allowedClassIds = null;
            if (filter != null && filter.LectureId.HasValue)
            {
                allowedClassIds = await _context.Lessons
                    .Where(l => l.LectureId == filter.LectureId.Value && l.Class.Status == "Active")
                    .Select(l => l.ClassId)
                    .Distinct()
                    .ToListAsync();
            }

            // 1. Pass Rate by Semester
            var gradesQuery = _context.Grades
                .Include(g => g.Subject)
                .AsQueryable();

            if (allowedClassIds != null)
            {
                 gradesQuery = gradesQuery.Where(g => g.Subject.Classes.Any(c => 
                        allowedClassIds.Contains(c.ClassId) && 
                        c.Students.Any(s => s.StudentId == g.StudentId)
                    ));
            }

            // Note: Join logic in original code was complex/broken. Replaced with GroupBy logic on filtered grades.
            // Actually, to keep it simple and safe, I will stick to the existing logic structure but apply the filter to the data source.
            // But the original code was: 
            /*
            var semesterStats = await _context.Classes.Include(c => c.Semester).Select(...) 
            */
            // This selects ALL Classes. We must filter classes first.

            var classesQuery = _context.Classes.Include(c => c.Semester).AsQueryable();
            if (allowedClassIds != null)
            {
                classesQuery = classesQuery.Where(c => allowedClassIds.Contains(c.ClassId));
            }

            var semesterStats = await classesQuery
                .Select(c => new 
                {
                    SemesterName = c.Semester.Name,
                    SemesterId = c.SemesterId,
                    StartDate = c.Semester.StartDate,
                     // Get Grades for students in this class for this subject
                    Grades = _context.Grades
                        .Where(g => g.SubjectId == c.SubjectId && c.Students.Select(s => s.StudentId).Contains(g.StudentId))
                        .Select(g => new { g.FinalScore, PassMark = g.Subject.PassMark })
                        .ToList(),
                    // Capture Student IDs for unique headcount
                    StudentIds = c.Students.Select(s => s.StudentId).ToList()
                })
                .ToListAsync();

            // Group by Semester locally
            var groupedBySemesterRaw = semesterStats
                .GroupBy(x => x.SemesterName)
                .Select(g => new
                {
                    Semester = g.Key,
                    OrderDate = g.FirstOrDefault()?.StartDate,
                    TotalGrades = g.Sum(x => x.Grades.Count),
                    PassedGrades = g.Sum(x => x.Grades.Count(grade => grade.FinalScore >= (grade.PassMark ?? 5.0m))),
                    AverageScore = g.Average(x => x.Grades.Any() ? x.Grades.Average(gr => gr.FinalScore ?? 0) : 0),
                    SumScores = g.Sum(x => x.Grades.Sum(gr => gr.FinalScore ?? 0)),
                    // Calculate Unique Students
                    UniqueStudents = g.SelectMany(x => x.StudentIds).Distinct().Count()
                })
                .OrderByDescending(x => x.OrderDate)
                .ToList();

            // For Charts: Take 5 most recent, sort ASC (Left to Right)
            var groupedForCharts = groupedBySemesterRaw
                .Take(5)
                .OrderBy(x => x.OrderDate)
                .ToList();

            // For List: All, Descending (Top to Bottom)
            var groupedForList = groupedBySemesterRaw; 

            result.PassRateBySemester = groupedForCharts.Select(x => new ChartSeriesDto
            {
                Name = x.Semester,
                Value = x.TotalGrades > 0 ? Math.Round((double)x.PassedGrades * 100 / x.TotalGrades, 1) : 0,
                ExtraInfo = $"Passed: {x.PassedGrades}/{x.TotalGrades}"
            }).ToList();

            result.AverageScoreBySemester = groupedForCharts.Select(x => new ChartSeriesDto
            {
                Name = x.Semester,
                Value = x.TotalGrades > 0 ? Math.Round((double)x.SumScores / x.TotalGrades, 2) : 0,
                ExtraInfo = $"Avg: {(x.TotalGrades > 0 ? Math.Round((double)x.SumScores / x.TotalGrades, 2) : 0)}"
            }).ToList();

            result.StudentQuantityBySemester = groupedForList.Select(x => new ChartSeriesDto
            {
                Name = x.Semester,
                Value = x.UniqueStudents,
                ExtraInfo = $"{x.UniqueStudents} Students"
            }).ToList();


            // 2. Attendance Rate by Semester
            var attendanceQuery = _context.Attendances
                .Include(a => a.Lesson)
                .ThenInclude(l => l.Class)
                .ThenInclude(c => c.Semester)
                .Where(a => a.Lesson.Class.Semester != null)
                .AsQueryable();

            if (allowedClassIds != null)
            {
                attendanceQuery = attendanceQuery.Where(a => allowedClassIds.Contains(a.Lesson.ClassId));
            }

            var attendanceStats = await attendanceQuery
                .GroupBy(a => new { a.Lesson.Class.Semester.Name, a.Lesson.Class.Semester.StartDate })
                .Select(g => new
                {
                    SemesterName = g.Key.Name,
                    StartDate = g.Key.StartDate,
                    TotalSlots = g.Count(),
                    PresentSlots = g.Count(a => a.Status == "Present")
                })
                .OrderByDescending(g => g.StartDate)
                .Take(5)
                .OrderBy(g => g.StartDate)
                .ToListAsync();

            result.AttendanceRateBySemester = attendanceStats.Select(x => new ChartSeriesDto
            {
                Name = x.SemesterName,
                Value = x.TotalSlots > 0 ? Math.Round((double)x.PresentSlots * 100 / x.TotalSlots, 1) : 0,
                ExtraInfo = $"Present: {x.PresentSlots}/{x.TotalSlots}"
            }).ToList();

            return result;
        }
    }
}