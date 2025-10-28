using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class SemesterService : ISemesterService
{
    private readonly ISemesterRepository _semesterRepository;
    private readonly FjapDbContext _context;

    public SemesterService(ISemesterRepository semesterRepository, FjapDbContext context)
    {
        _semesterRepository = semesterRepository;
        _context = context;
    }

    public async Task<IEnumerable<Semester>> GetAllAsync()
        => await _semesterRepository.GetAllAsync(
            orderBy: q => q.OrderByDescending(s => s.StartDate).ThenByDescending(s => s.Name),
            includeProperties: "Classes,Students");

    public Task<Semester?> GetByIdAsync(int id)
        => _semesterRepository.FirstOrDefaultAsync(
            s => s.SemesterId == id,
            includeProperties: "Classes,Students");

    public async Task<Semester> CreateAsync(CreateSemesterRequest request)
    {
        // Validate semester name uniqueness
        var existingSemester = await _semesterRepository.FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.Trim().ToLower());
        if (existingSemester != null)
        {
            throw new InvalidOperationException($"Semester with name '{request.Name}' already exists");
        }

        // Validate date range
        if (request.StartDate >= request.EndDate)
        {
            throw new ArgumentException("Start date must be before end date");
        }

        // Validate semester duration (minimum 30 days, maximum 365 days)
        var duration = (request.EndDate.DayNumber - request.StartDate.DayNumber);
        if (duration < 30)
        {
            throw new ArgumentException("Semester duration must be at least 30 days");
        }
        if (duration > 365)
        {
            throw new ArgumentException("Semester duration cannot exceed 365 days");
        }

        // Validate start date is not in the past (allow 7 days buffer)
        var minStartDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
        if (request.StartDate < minStartDate)
        {
            throw new ArgumentException("Start date cannot be more than 7 days in the past");
        }

        var semester = new Semester
        {
            Name = request.Name.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate
        };

        await _semesterRepository.AddAsync(semester);
        await _semesterRepository.SaveChangesAsync();
        return semester;
    }

    public async Task<bool> UpdateAsync(int id, UpdateSemesterRequest request)
    {
        var existing = await _semesterRepository.GetByIdAsync(id);
        if (existing == null) return false;

        existing.Name = request.Name.Trim();
        existing.StartDate = request.StartDate;
        existing.EndDate = request.EndDate;

        _semesterRepository.Update(existing);
        await _semesterRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _semesterRepository.GetByIdAsync(id);
        if (existing == null) return false;

        _semesterRepository.Remove(existing);
        await _semesterRepository.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Semester>> GetActiveSemestersAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        return await _semesterRepository.GetAllAsync(
            predicate: s => s.StartDate <= today && s.EndDate >= today,
            orderBy: q => q.OrderByDescending(s => s.StartDate),
            includeProperties: "Classes,Students");
    }

    public async Task<IEnumerable<Semester>> GetUpcomingSemestersAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        return await _semesterRepository.GetAllAsync(
            predicate: s => s.StartDate > today,
            orderBy: q => q.OrderBy(s => s.StartDate),
            includeProperties: "Classes,Students");
    }
}
