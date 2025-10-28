using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class HolidayRepository : GenericRepository<Holiday>, IHolidayRepository
{
    public HolidayRepository(FjapDbContext context) : base(context)
    {
    }

    // Inherits all CRUD operations from GenericRepository
    // Additional holiday-specific methods can be added here if needed
}
