using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class SemesterRepository : GenericRepository<Semester>, ISemesterRepository
{
    public SemesterRepository(FjapDbContext context) : base(context)
    {
    }

    // Inherits all CRUD operations from GenericRepository
    // Additional semester-specific methods can be added here if needed
}
