using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

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
                    SemesterId = s.SemesterId,
                    LevelId = s.LevelId,
                    ClassId = s.ClassId,
                    SemesterName = s.Semester.Name,
                    LevelName = s.Level.LevelName,
                    ClassName = s.Class.ClassName
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<SubjectDto>> GetAllWithDetailsAsync()
        {
            return await _context.Subjects
                .Include(s => s.Semester)
                .Include(s => s.Level)
                .Include(s => s.Class)
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
                    SemesterId = s.SemesterId,
                    LevelId = s.LevelId,
                    ClassId = s.ClassId,
                    SemesterName = s.Semester.Name,
                    LevelName = s.Level.LevelName,
                    ClassName = s.Class.ClassName
                })
                .ToListAsync();
        }

        public async Task UpdateStatusAsync(int subjectId, bool status)
        {
            var subject = await _context.Subjects.FindAsync(subjectId);
            if (subject == null) throw new Exception("Subject not found");
            
            subject.Status = status;
            await _context.SaveChangesAsync();
        }

        public async Task<SubjectFormOptions> GetFormOptionsAsync()
        {
            var semesters = await _context.Semesters
                .Select(s => new LookupItem { Id = s.SemesterId, Name = s.Name })
                .ToListAsync();

            var levels = await _context.Levels
                .Select(l => new LookupItem { Id = l.LevelId, Name = l.LevelName })
                .ToListAsync();

            var classes = await _context.Classes
                .Select(c => new LookupItem { Id = c.ClassId, Name = c.ClassName })
                .ToListAsync();

            return new SubjectFormOptions
            {
                Semesters = semesters,
                Levels = levels,
                Classes = classes
            };
        }
    }
}