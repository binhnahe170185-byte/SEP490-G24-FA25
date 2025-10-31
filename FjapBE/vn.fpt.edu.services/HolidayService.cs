using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class HolidayService : IHolidayService
{
    private readonly IHolidayRepository _holidayRepository;
    private readonly FjapDbContext _context;

    public HolidayService(IHolidayRepository holidayRepository, FjapDbContext context)
    {
        _holidayRepository = holidayRepository;
        _context = context;
    }

    public async Task<IEnumerable<Holiday>> GetAllAsync()
        => await _holidayRepository.GetAllAsync(
            orderBy: q => q.OrderByDescending(h => h.Date).ThenBy(h => h.Name),
            includeProperties: "Semester");

    public Task<Holiday?> GetByIdAsync(int id)
        => _holidayRepository.FirstOrDefaultAsync(
            h => h.HolidayId == id,
            includeProperties: "Semester");

    public async Task<Holiday> CreateAsync(CreateHolidayRequest request)
    {
        if (request.SemesterId == null || request.SemesterId == 0)
        {
            throw new ArgumentException("SemesterId is required");
        }

        var holiday = new Holiday
        {
            Name = request.Name.Trim(),
            Date = request.Date,
            Description = request.Description?.Trim(),
            SemesterId = request.SemesterId.Value
        };

        await _holidayRepository.AddAsync(holiday);
        await _holidayRepository.SaveChangesAsync();
        return holiday;
    }

    public async Task<bool> UpdateAsync(int id, UpdateHolidayRequest request)
    {
        var existing = await _holidayRepository.GetByIdAsync(id);
        if (existing == null) return false;

        existing.Name = request.Name.Trim();
        existing.Date = request.Date;
        existing.Description = request.Description?.Trim();
        
        if (request.SemesterId != null && request.SemesterId != 0)
        {
            existing.SemesterId = request.SemesterId.Value;
        }

        _holidayRepository.Update(existing);
        await _holidayRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _holidayRepository.GetByIdAsync(id);
        if (existing == null) return false;

        _holidayRepository.Remove(existing);
        await _holidayRepository.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Holiday>> GetBySemesterAsync(int semesterId)
    {
        return await _holidayRepository.GetAllAsync(
            predicate: h => h.SemesterId == semesterId,
            orderBy: q => q.OrderBy(h => h.Date),
            includeProperties: "Semester");
    }

    public async Task<IEnumerable<Holiday>> CreateBulkAsync(CreateHolidayRequest[] requests)
    {
        if (requests == null || requests.Length == 0)
        {
            return new List<Holiday>();
        }

        var holidays = requests.Select(request =>
        {
            if (request.SemesterId == null || request.SemesterId == 0)
            {
                throw new ArgumentException($"SemesterId is required for holiday: {request.Name}");
            }

            return new Holiday
            {
                Name = request.Name.Trim(),
                Date = request.Date,
                Description = request.Description?.Trim(),
                SemesterId = request.SemesterId.Value
            };
        }).ToList();

        // Add holidays using DbContext - EF will handle foreign key properly
        await _context.Holidays.AddRangeAsync(holidays);
        await _context.SaveChangesAsync();
        
        return holidays;
    }
}
