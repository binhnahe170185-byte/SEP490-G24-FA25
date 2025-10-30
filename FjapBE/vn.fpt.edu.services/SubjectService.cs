using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace FJAP.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _subjectRepository;
        private readonly FjapDbContext _context;

        public SubjectService(ISubjectRepository subjectRepository, FjapDbContext context)
        {
            _subjectRepository = subjectRepository;
            _context = context;
        }

        public async Task<IEnumerable<SubjectDto>> GetAllAsync()
            => await _subjectRepository.GetAllWithDetailsAsync();

        public Task<SubjectDto?> GetByIdAsync(int id)
            => _subjectRepository.GetByIdWithDetailsAsync(id);

        public async Task<Subject> CreateAsync(CreateSubjectRequest request)
        {
            // 1. Validation logic
            ValidateGradeTypes(request.GradeTypes);

            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                // 2. Begin transaction inside the strategy
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 3. Check for duplicates
                    if (await _context.Subjects.AnyAsync(s => s.SubjectCode == request.SubjectCode))
                    {
                        throw new InvalidOperationException($"Subject code '{request.SubjectCode}' already exists.");
                    }

                    // 4. Map request to the entity
                    var subject = new Subject
                    {
                        SubjectCode = request.SubjectCode,
                        SubjectName = request.SubjectName,
                        Description = request.Description,
                        PassMark = request.PassMark ?? 5.0m,
                        LevelId = request.LevelId,
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow
                    };

                    // 5. Add grade types if they exist
                    if (request.GradeTypes != null && request.GradeTypes.Any())
                    {
                        subject.SubjectGradeTypes = request.GradeTypes.Select(gt => new SubjectGradeType
                        {
                            GradeTypeName = gt.GradeTypeName,
                            Weight = gt.Weight,
                            MaxScore = 10.0m,
                            Status = "Active",
                            CreatedAt = DateTime.UtcNow
                        }).ToList();
                    }
                    
                    await _context.Subjects.AddAsync(subject);

                    // 6. Save all changes at once
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return subject;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<bool> UpdateAsync(int id, UpdateSubjectRequest request)
        {
            // 1. Validation logic
            ValidateGradeTypes(request.GradeTypes);

            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                // 2. Begin transaction inside the strategy
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 3. Fetch the existing subject with its grade types
                    var existingSubject = await _context.Subjects
                        .Include(s => s.SubjectGradeTypes)
                        .FirstOrDefaultAsync(s => s.SubjectId == id);

                    if (existingSubject == null) return false;

                    // 4. Check for duplicate subject code
                    if (await _context.Subjects.AnyAsync(s => s.SubjectCode == request.SubjectCode && s.SubjectId != id))
                    {
                        throw new InvalidOperationException($"Subject code '{request.SubjectCode}' already exists.");
                    }

                    // 5. Update subject's main properties
                    existingSubject.SubjectCode = request.SubjectCode;
                    existingSubject.SubjectName = request.SubjectName;
                    existingSubject.Description = request.Description;
                    existingSubject.PassMark = request.PassMark ?? 5.0m;
                    existingSubject.LevelId = request.LevelId;

                    // 6. Handle Grade Type updates (Delete, Update, Add)
                    var gradeTypesFromRequest = request.GradeTypes ?? new List<GradeTypeDto>();
                    var requestGradeTypeIds = gradeTypesFromRequest.Select(r => r.SubjectGradeTypeId).ToHashSet();

                    // Delete grade types that are not in the request
                    var gradeTypesToDelete = existingSubject.SubjectGradeTypes
                        .Where(dbGt => !requestGradeTypeIds.Contains(dbGt.SubjectGradeTypeId))
                        .ToList();

                    if (gradeTypesToDelete.Any())
                    {
                        // Optional: Add logic here to check if these grade types have been used
                        _context.SubjectGradeTypes.RemoveRange(gradeTypesToDelete);
                    }

                    // Update existing or add new grade types
                    foreach (var reqGt in gradeTypesFromRequest)
                    {
                        var existingGradeType = existingSubject.SubjectGradeTypes
                            .FirstOrDefault(dbGt => dbGt.SubjectGradeTypeId == reqGt.SubjectGradeTypeId);

                        if (existingGradeType != null) // Update
                        {
                            existingGradeType.GradeTypeName = reqGt.GradeTypeName;
                            existingGradeType.Weight = reqGt.Weight;
                            existingGradeType.UpdatedAt = DateTime.UtcNow;
                        }
                        else // Add new one
                        {
                            existingSubject.SubjectGradeTypes.Add(new SubjectGradeType
                            {
                                SubjectId = existingSubject.SubjectId,
                                GradeTypeName = reqGt.GradeTypeName,
                                Weight = reqGt.Weight,
                                MaxScore = 10.0m,
                                Status = "Active",
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    // 7. Save all changes and commit
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

        public async Task<bool> DeleteAsync(int id)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var subject = await _context.Subjects
                        .Include(s => s.Classes)
                        .Include(s => s.Grades)
                        .FirstOrDefaultAsync(s => s.SubjectId == id);

                    if (subject == null) return false;

                    // Business rule checks
                    if (subject.Classes.Any())
                        throw new InvalidOperationException("Cannot delete subject with assigned classes.");
                    if (subject.Grades.Any())
                        throw new InvalidOperationException("Cannot delete subject with existing student grades.");

                    _context.Subjects.Remove(subject);
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

        public async Task UpdateStatusAsync(int id, bool status)
        {
            var statusString = status ? "Active" : "Inactive";
            await _subjectRepository.UpdateStatusAsync(id, statusString);
            await _context.SaveChangesAsync();
        }

        public Task<SubjectFormOptions> GetFormOptionsAsync()
            => _subjectRepository.GetFormOptionsAsync();

        public async Task<IEnumerable<SubjectDropdownDto>> GetDropdownOptionsAsync()
        {
            return await _context.Subjects
                .Where(s => s.Status == "Active") // Chỉ lấy subjects active
                .OrderBy(s => s.SubjectCode)
                .Select(s => new SubjectDropdownDto
                {
                    SubjectId = s.SubjectId,
                    SubjectCode = s.SubjectCode,
                    SubjectName = s.SubjectName
                })
                .ToListAsync();
        }

        private void ValidateGradeTypes(List<GradeTypeDto>? gradeTypes)
        {
            if (gradeTypes == null || !gradeTypes.Any())
            {
                throw new InvalidOperationException("At least one grade type is required.");
            }

            if (gradeTypes.GroupBy(gt => gt.GradeTypeName.Trim().ToLower()).Any(g => g.Count() > 1))
            {
                throw new InvalidOperationException("Duplicate grade type names are not allowed.");
            }

            var totalWeight = gradeTypes.Sum(gt => gt.Weight);
            if (Math.Abs(totalWeight - 100) > 0.01m)
            {
                throw new InvalidOperationException($"Total weight must be 100%. Current total: {totalWeight}%.");
            }

            if (gradeTypes.Any(gt => gt.Weight <= 0 || gt.Weight > 100))
            {
                throw new InvalidOperationException("Each grade type weight must be between 1 and 100.");
            }

            if (gradeTypes.Any(gt => string.IsNullOrWhiteSpace(gt.GradeTypeName)))
            {
                throw new InvalidOperationException("Grade type name cannot be empty.");
            }
        }
    }
}