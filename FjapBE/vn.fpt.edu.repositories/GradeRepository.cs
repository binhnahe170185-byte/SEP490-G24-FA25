using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace FJAP.Repositories
{
    public class GradeRepository : GenericRepository<Grade>, IGradeRepository
    {
        public GradeRepository(FjapDbContext context) : base(context)
        {
        }

        public async Task<PagedResult<GradeListDto>> GetGradesWithFilterAsync(GradeFilterRequest filter)
        {
            var query = _context.Grades
                .Include(g => g.Student).ThenInclude(s => s.User)
                .Include(g => g.Student).ThenInclude(s => s.Level)
                .Include(g => g.Student).ThenInclude(s => s.Semester)
                .Include(g => g.Subject)
                .AsQueryable();

            // Apply filters
            if (filter.SubjectId.HasValue)
                query = query.Where(g => g.SubjectId == filter.SubjectId.Value);

            if (filter.LevelId.HasValue)
                query = query.Where(g => g.Student.LevelId == filter.LevelId.Value);

            if (filter.SemesterId.HasValue)
                query = query.Where(g => g.Student.SemesterId == filter.SemesterId.Value);

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(g => g.Status == filter.Status);

            // Search by student name or code
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.Trim().ToLower();
                query = query.Where(g => 
                    g.Student.StudentCode.ToLower().Contains(searchTerm) ||
                    (g.Student.User.FirstName + " " + g.Student.User.LastName).ToLower().Contains(searchTerm)
                );
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var items = await query
                .OrderByDescending(g => g.UpdatedAt)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(g => new GradeListDto
                {
                    GradeId = g.GradeId,
                    StudentId = g.StudentId,
                    StudentCode = g.Student.StudentCode ?? "",
                    StudentName = g.Student.User.FirstName + " " + g.Student.User.LastName,
                    SubjectId = g.SubjectId,
                    SubjectCode = g.Subject.SubjectCode,
                    SubjectName = g.Subject.SubjectName,
                    FinalScore = g.FinalScore,
                    Status = g.Status ?? "In Progress",
                    UpdatedAt = g.UpdatedAt,
                    LevelName = g.Student.Level.LevelName,
                    SemesterName = g.Student.Semester != null ? g.Student.Semester.Name : null
                })
                .ToListAsync();

            return new PagedResult<GradeListDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }

        public async Task<GradeDetailDto?> GetGradeDetailAsync(int gradeId)
        {
            var grade = await _context.Grades
                .Include(g => g.Student).ThenInclude(s => s.User)
                .Include(g => g.Subject)
                .Include(g => g.GradeTypes).ThenInclude(gt => gt.SubjectGradeType)
                .Where(g => g.GradeId == gradeId)
                .Select(g => new GradeDetailDto
                {
                    GradeId = g.GradeId,
                    StudentId = g.StudentId,
                    StudentCode = g.Student.StudentCode ?? "",
                    StudentName = g.Student.User.FirstName + " " + g.Student.User.LastName,
                    StudentEmail = g.Student.User.Email,
                    SubjectId = g.SubjectId,
                    SubjectCode = g.Subject.SubjectCode,
                    SubjectName = g.Subject.SubjectName,
                    PassMark = g.Subject.PassMark,
                    FinalScore = g.FinalScore,
                    Status = g.Status ?? "In Progress",
                    CreatedAt = g.CreatedAt,
                    UpdatedAt = g.UpdatedAt,
                    GradeComponents = g.GradeTypes.Select(gt => new GradeComponentDto
                    {
                        GradeTypeId = gt.GradeTypeId,
                        SubjectGradeTypeId = gt.SubjectGradeTypeId,
                        GradeTypeName = gt.SubjectGradeType.GradeTypeName,
                        Weight = gt.SubjectGradeType.Weight,
                        MaxScore = gt.SubjectGradeType.MaxScore,
                        Score = gt.Score,
                        Comment = gt.Comment,
                        Status = gt.Status ?? "Pending",
                        GradedBy = gt.GradedBy,
                        GradedByName = gt.GradedBy != null 
                            ? _context.Users
                                .Where(u => u.UserId == gt.GradedBy)
                                .Select(u => u.FirstName + " " + u.LastName)
                                .FirstOrDefault()
                            : null,
                        GradedAt = gt.GradedAt
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            return grade;
        }

        public async Task<GradeFilterOptions> GetFilterOptionsAsync()
        {
            var subjects = await _context.Subjects
                .Where(s => s.Status == "Active")
                .OrderBy(s => s.SubjectName)
                .Select(s => new LookupItem
                {
                    Id = s.SubjectId,
                    Name = $"{s.SubjectCode} - {s.SubjectName}"
                })
                .ToListAsync();

            var levels = await _context.Levels
                .OrderBy(l => l.LevelName)
                .Select(l => new LookupItem
                {
                    Id = l.LevelId,
                    Name = l.LevelName
                })
                .ToListAsync();

            var semesters = await _context.Semesters
                .OrderByDescending(s => s.StartDate)
                .Select(s => new LookupItem
                {
                    Id = s.SemesterId,
                    Name = s.Name
                })
                .ToListAsync();

            return new GradeFilterOptions
            {
                Subjects = subjects,
                Levels = levels,
                Semesters = semesters
            };
        }

        public async Task UpdateGradeStatusAsync(int gradeId, string status)
        {
            var grade = await _context.Grades.FindAsync(gradeId);
            if (grade == null)
                throw new KeyNotFoundException($"Grade with ID {gradeId} not found");

            grade.Status = status;
            grade.UpdatedAt = DateTime.UtcNow;
        }

        public async Task<GradeStatisticsDto> GetGradeStatisticsAsync(GradeFilterRequest? filter = null)
        {
            var query = _context.Grades.AsQueryable();

            // Apply filters if provided
            if (filter != null)
            {
                if (filter.SubjectId.HasValue)
                    query = query.Where(g => g.SubjectId == filter.SubjectId.Value);

                if (filter.LevelId.HasValue)
                    query = query.Where(g => g.Student.LevelId == filter.LevelId.Value);

                if (filter.SemesterId.HasValue)
                    query = query.Where(g => g.Student.SemesterId == filter.SemesterId.Value);
            }

            var stats = await query
                .GroupBy(g => 1)
                .Select(g => new GradeStatisticsDto
                {
                    TotalGrades = g.Count(),
                    InProgressCount = g.Count(x => x.Status == "In Progress"),
                    CompletedCount = g.Count(x => x.Status == "Completed"),
                    FailedCount = g.Count(x => x.Status == "Failed"),
                    AverageScore = g.Average(x => x.FinalScore ?? 0)
                })
                .FirstOrDefaultAsync();

            return stats ?? new GradeStatisticsDto();
        }

        public async Task<bool> GradeExistsAsync(int studentId, int subjectId)
        {
            return await _context.Grades
                .AnyAsync(g => g.StudentId == studentId && g.SubjectId == subjectId);
        }
    }
}