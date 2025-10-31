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

    private string GetSemesterSeason(DateOnly date)
    {
        var month = date.Month;
        var day = date.Day;

        // Spring: 01/01 - 30/04
        if (month == 1 || month == 2 || month == 3 || (month == 4 && day <= 30))
        {
            return "spring";
        }
        // Summer: 01/05 - 31/08
        if (month == 5 || month == 6 || month == 7 || month == 8)
        {
            return "summer";
        }
        // Fall: 01/09 - 31/12
        if (month >= 9 && month <= 12)
        {
            return "fall";
        }

        return null;
    }

    public async Task<Semester> CreateAsync(CreateSemesterRequest request)
    {
        Console.WriteLine("=== SemesterService.CreateAsync called ===");
        Console.WriteLine($"Request - StartDate: {request.StartDate}, EndDate: {request.EndDate}");
        
        // Auto-generate semester name and code
        var semesterName = request.GenerateSemesterName();
        var semesterCode = request.GenerateSemesterCode();
        Console.WriteLine($"Generated - Name: {semesterName}, Code: {semesterCode}");

        // Validate dates are in allowed ranges
        var startSeason = GetSemesterSeason(request.StartDate);
        var endSeason = GetSemesterSeason(request.EndDate);
        Console.WriteLine($"Seasons - Start: {startSeason}, End: {endSeason}");

        if (startSeason == null)
        {
            throw new ArgumentException("Start date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)");
        }

        if (endSeason == null)
        {
            throw new ArgumentException("End date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)");
        }

        // Validate start and end dates are in the same season
        if (startSeason != endSeason)
        {
            throw new ArgumentException("Invalid semester range. Start date and end date must be in the same season.");
        }

        // Validate semester code uniqueness
        var existingByCode = await _semesterRepository.FirstOrDefaultAsync(s => s.SemesterCode == semesterCode);
        if (existingByCode != null)
        {
            throw new InvalidOperationException($"Semester with code '{semesterCode}' already exists");
        }

        // Validate semester name uniqueness
        var existingByName = await _semesterRepository.FirstOrDefaultAsync(s => s.Name.ToLower() == semesterName.ToLower());
        if (existingByName != null)
        {
            throw new InvalidOperationException($"Semester with name '{semesterName}' already exists");
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
            Name = semesterName,
            SemesterCode = semesterCode,
            StartDate = request.StartDate,
            EndDate = request.EndDate
        };

        Console.WriteLine($"Creating semester entity - Name: {semester.Name}, Code: {semester.SemesterCode}, StartDate: {semester.StartDate}, EndDate: {semester.EndDate}");
        
        try
        {
            await _semesterRepository.AddAsync(semester);
            Console.WriteLine("Semester added to repository");
            
            await _semesterRepository.SaveChangesAsync();
            Console.WriteLine($"Semester saved successfully with ID: {semester.SemesterId}");
            
            return semester;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== ERROR saving semester ===");
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }
    }

    public async Task<bool> UpdateAsync(int id, UpdateSemesterRequest request)
    {
        var existing = await _semesterRepository.GetByIdAsync(id);
        if (existing == null) return false;

        // Validate dates are in allowed ranges
        var startSeason = GetSemesterSeason(request.StartDate);
        var endSeason = GetSemesterSeason(request.EndDate);

        if (startSeason == null)
        {
            throw new ArgumentException("Start date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)");
        }

        if (endSeason == null)
        {
            throw new ArgumentException("End date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)");
        }

        // Validate start and end dates are in the same season
        if (startSeason != endSeason)
        {
            throw new ArgumentException("Invalid semester range. Start date and end date must be in the same season.");
        }

        // Auto-regenerate name and code based on new dates
        var semesterName = request.GenerateSemesterName();
        var semesterCode = request.GenerateSemesterCode();

        // Validate code uniqueness (excluding current semester)
        var existingByCode = await _semesterRepository.FirstOrDefaultAsync(s => s.SemesterCode == semesterCode && s.SemesterId != id);
        if (existingByCode != null)
        {
            throw new InvalidOperationException($"Semester with code '{semesterCode}' already exists");
        }

        existing.Name = semesterName;
        existing.SemesterCode = semesterCode;
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
