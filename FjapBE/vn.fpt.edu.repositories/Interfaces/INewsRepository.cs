using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface INewsRepository : IGenericRepository<News>
{
    // Inherits all CRUD operations from IGenericRepository
    // Additional news-specific methods can be added here if needed
}

