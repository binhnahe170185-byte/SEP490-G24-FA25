using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace FJAP.Repositories
{
    public class SubjectRepository : GenericRepository<Subject>, ISubjectRepository
    {
        public SubjectRepository(FjapDbContext context) : base(context)
        {
        }

        public async Task<SubjectDto?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Subjects
                .Where(s => s.SubjectId == id)
                .Select(s => new SubjectDto
                {
                    SubjectId = s.SubjectId,
                    SubjectCode = s.SubjectCode,
                    SubjectName = s.SubjectName,
                    Status = s.Status,
                    Description = s.Description,
                    PassMark = s.PassMark,
                    CreatedAt = s.CreatedAt,
                    LevelId = s.LevelId,
                    LevelName = s.Level.LevelName,
                    TotalLesson = s.TotalLesson,
                    GradeTypes = s.SubjectGradeTypes.Select(sgt => new GradeTypeDto
                    {
                        SubjectGradeTypeId = sgt.SubjectGradeTypeId,
                        GradeTypeName = sgt.GradeTypeName,
                        Weight = sgt.Weight
                    }).ToList()
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        // Các hàm còn lại giữ nguyên, không cần sửa
        public async Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync()
        {
            return await _context.Subjects
                .Include(s => s.Level)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new SubjectDto
                {
                    SubjectId = s.SubjectId,
                    SubjectCode = s.SubjectCode,
                    SubjectName = s.SubjectName,
                    Status = s.Status,
                    // Bỏ các trường không cần thiết cho danh sách
                    LevelId = s.LevelId,
                    LevelName = s.Level.LevelName,
                    TotalLesson = s.TotalLesson
                })
                .ToListAsync();
        }

        public async Task UpdateStatusAsync(int subjectId, string status)
        {
            var subject = await _context.Subjects.FindAsync(subjectId);
            if (subject == null) throw new KeyNotFoundException("Subject not found");

            subject.Status = status;
        }

        public async Task<SubjectFormOptions> GetFormOptionsAsync()
        {
            var levels = await _context.Levels
                .Select(l => new LookupItem
                {
                    Id = l.LevelId,
                    Name = l.LevelName
                })
                .ToListAsync();

            return new SubjectFormOptions
            {
                Levels = levels
            };
        }
    }
}