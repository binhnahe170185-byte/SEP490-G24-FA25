namespace FJAP.Services.Interfaces;

public interface IAIProvider
{
    Task<string> ChatAsync(string message, string? context = null);
}



