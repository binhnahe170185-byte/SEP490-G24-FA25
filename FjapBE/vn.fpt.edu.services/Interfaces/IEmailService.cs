namespace FJAP.Services.Interfaces;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string firstName, string lastName, string loginUrl);
}

