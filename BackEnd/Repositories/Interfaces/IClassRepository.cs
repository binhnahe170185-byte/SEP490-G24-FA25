using FJAP.Models;

namespace FJAP.Repositories.Interfaces;

public interface IClassRepository : IGenericRepository<Class>
{
    Task<Class?> GetWithStudentsAsync(int id);
}
