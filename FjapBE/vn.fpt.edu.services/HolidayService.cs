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
        var holiday = new Holiday
        {
            Name = request.Name.Trim(),
            Date = request.Date,
            Type = request.Type.Trim(),
            Description = request.Description?.Trim(),
            IsRecurring = request.IsRecurring,
            SemesterId = request.SemesterId ?? 0
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
        existing.Type = request.Type.Trim();
        existing.Description = request.Description?.Trim();
        existing.IsRecurring = request.IsRecurring;
        existing.SemesterId = request.SemesterId ?? 0;

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
        var holidays = requests.Select(request => new Holiday
        {
            Name = request.Name.Trim(),
            Date = request.Date,
            Type = request.Type.Trim(),
            Description = request.Description?.Trim(),
            IsRecurring = request.IsRecurring,
            SemesterId = request.SemesterId ?? 0
        }).ToList();

        await _holidayRepository.AddRangeAsync(holidays);
        await _holidayRepository.SaveChangesAsync();
        return holidays;
    }
}
