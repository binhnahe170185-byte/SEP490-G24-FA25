using System.Threading.Tasks;
using FJAP.Models;

namespace FJAP.Repositories.Interfaces
{
    public interface ISubjectRepository : IGenericRepository<Subject>
    {
        Task<Subject?> GetDetailAsync(int id);
        // Thêm method đặc thù nếu cần
    }
}