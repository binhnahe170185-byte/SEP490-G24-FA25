
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
                    // Lấy LevelName từ bảng Level liên quan
                    LevelName = s.Level.LevelName 
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync()
        {
            return await _context.Subjects
                // Chỉ cần Include Level
                .Include(s => s.Level) 
                .OrderByDescending(s => s.CreatedAt)
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
                    LevelName = s.Level.LevelName
                })
                .ToListAsync();
        }

        public async Task UpdateStatusAsync(int subjectId, string status)
        {
            var subject = await _context.Subjects.FindAsync(subjectId);
            if (subject == null) throw new KeyNotFoundException("Subject not found");
            
            subject.Status = status;
            // SaveChanges sẽ được gọi ở Service layer hoặc Unit of Work
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
                // Chỉ trả về danh sách Levels
                Levels = levels 
            };
        }
    }
}