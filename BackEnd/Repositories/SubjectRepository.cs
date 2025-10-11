using System.Threading.Tasks;
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

        public async Task<Subject?> GetDetailAsync(int id)
        {
            return await _context.Subjects
                // .Include(s => s.YourNavigation) // TODO: include nếu cần
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SubjectId == id); // TODO: đổi key nếu khác
        }
    }
}