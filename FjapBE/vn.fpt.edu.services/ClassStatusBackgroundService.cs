using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FJAP.Services;

/// <summary>
/// Background service that automatically updates class status when semester ends.
/// Runs daily to check and deactivate classes whose semester has ended.
/// </summary>
public class ClassStatusBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ClassStatusBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Check every hour

    public ClassStatusBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<ClassStatusBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ClassStatusBackgroundService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await UpdateClassStatusesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating class statuses.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("ClassStatusBackgroundService stopped.");
    }

    private async Task UpdateClassStatusesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FjapDbContext>();

        var today = DateOnly.FromDateTime(DateTime.Now);

        // Find all active classes whose semester has ended
        var classesToDeactivate = await db.Classes
            .Include(c => c.Semester)
            .Where(c => c.Status == "Active" 
                     && c.Semester != null 
                     && c.Semester.EndDate < today)
            .ToListAsync();

        if (classesToDeactivate.Any())
        {
            _logger.LogInformation("Found {Count} classes to deactivate (semester ended).", classesToDeactivate.Count);

            foreach (var cls in classesToDeactivate)
            {
                cls.Status = "Inactive";
                cls.UpdatedAt = DateTime.Now;
                _logger.LogInformation("Deactivating class {ClassId} ({ClassName}) - semester {SemesterName} ended on {EndDate}.",
                    cls.ClassId, cls.ClassName, cls.Semester?.Name, cls.Semester?.EndDate);
            }

            await db.SaveChangesAsync();
            _logger.LogInformation("Successfully deactivated {Count} classes.", classesToDeactivate.Count);
        }
    }
}
