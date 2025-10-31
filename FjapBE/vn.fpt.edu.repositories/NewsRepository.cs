using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class NewsRepository : GenericRepository<News>, INewsRepository
{
    public NewsRepository(FjapDbContext context) : base(context)
    {
    }

    // Inherits all CRUD operations from GenericRepository
    // Additional news-specific methods can be added here if needed
}

