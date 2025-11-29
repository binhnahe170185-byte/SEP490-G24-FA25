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
            var validStatuses = new[] { "In Progress", "Completed", "Failed" };
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
            return await _gradeRepository.GetGradeStatisticsAsync(filter);
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
                        grade.Status = finalScore >= passMark ? "Completed" : "Failed";
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
                    var grade = await _context.Grades
                        .Include(g => g.GradeTypes)
                        .Include(g => g.Student)
                            .ThenInclude(s => s.User)
                        .Include(g => g.Subject)
                        .FirstOrDefaultAsync(g => g.GradeId == request.GradeId);

                    if (grade == null)
                        return false;

                    // Update each grade component
                    foreach (var componentUpdate in request.GradeComponents)
                    {
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
                        else
                        {
                            // Create new grade type if it doesn't exist
                            var newGradeType = new GradeType
                            {
                                GradeId = request.GradeId,
                                SubjectGradeTypeId = componentUpdate.SubjectGradeTypeId,
                                Score = componentUpdate.Score,
                                Comment = componentUpdate.Comment,
                                Status = "Graded",
                                GradedAt = DateTime.UtcNow
                            };
                            grade.GradeTypes.Add(newGradeType);
                        }
                    }

                    // Update grade timestamp
                    grade.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Recalculate final score
                    await RecalculateFinalScoreAsync(request.GradeId);

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
    }
}