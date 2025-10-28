using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace FJAP.Services
{
    public class GradeService : IGradeService
    {
        private readonly IGradeRepository _gradeRepository;
        private readonly FjapDbContext _context;

        public GradeService(IGradeRepository gradeRepository, FjapDbContext context)
        {
            _gradeRepository = gradeRepository;
            _context = context;
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

            // TODO: Implement Excel export using a library like EPPlus or ClosedXML
            // This is a placeholder implementation
            throw new NotImplementedException("Excel export feature is not yet implemented. Please use a library like EPPlus or ClosedXML.");

            /* Example implementation with EPPlus:
            using (var package = new ExcelPackage())
            {
                var worksheet = package.Workbook.Worksheets.Add("Grades");
                
                // Headers
                worksheet.Cells[1, 1].Value = "Student Code";
                worksheet.Cells[1, 2].Value = "Student Name";
                worksheet.Cells[1, 3].Value = "Subject Code";
                worksheet.Cells[1, 4].Value = "Subject Name";
                worksheet.Cells[1, 5].Value = "Final Score";
                worksheet.Cells[1, 6].Value = "Status";
                worksheet.Cells[1, 7].Value = "Level";
                worksheet.Cells[1, 8].Value = "Updated At";

                // Data
                int row = 2;
                foreach (var grade in grades.Items)
                {
                    worksheet.Cells[row, 1].Value = grade.StudentCode;
                    worksheet.Cells[row, 2].Value = grade.StudentName;
                    worksheet.Cells[row, 3].Value = grade.SubjectCode;
                    worksheet.Cells[row, 4].Value = grade.SubjectName;
                    worksheet.Cells[row, 5].Value = grade.FinalScore;
                    worksheet.Cells[row, 6].Value = grade.Status;
                    worksheet.Cells[row, 7].Value = grade.LevelName;
                    worksheet.Cells[row, 8].Value = grade.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss");
                    row++;
                }

                return package.GetAsByteArray();
            }
            */
        }

        public async Task<bool> UpdateGradeComponentsAsync(UpdateGradeComponentsRequest request)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Get the grade with its components
                    var grade = await _context.Grades
                        .Include(g => g.GradeTypes)
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

                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}