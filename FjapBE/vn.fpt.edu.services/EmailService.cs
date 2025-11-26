using FJAP.Services.Interfaces;
using SendGrid;
using SendGrid.Helpers.Mail;
using Microsoft.Extensions.Configuration;

namespace FJAP.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string firstName, string lastName, string loginUrl)
    {
        _logger.LogInformation($"Attempting to send welcome email to {toEmail}");
        
        try
        {
            var apiKey = _configuration["Email:SendGridApiKey"];
            var fromEmail = _configuration["Email:FromEmail"];
            var fromName = _configuration["Email:FromName"] ?? "FPT Japan Academy";

            _logger.LogInformation($"Email config - FromEmail: {fromEmail}, FromName: {fromName}, ApiKey present: {!string.IsNullOrWhiteSpace(apiKey)}");

            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromEmail))
            {
                _logger.LogWarning("Email configuration is missing. Email will not be sent.");
                _logger.LogWarning($"ApiKey empty: {string.IsNullOrWhiteSpace(apiKey)}, FromEmail empty: {string.IsNullOrWhiteSpace(fromEmail)}");
                return;
            }

            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var to = new EmailAddress(toEmail, $"{firstName} {lastName}");
            var subject = "Welcome to FPT Japan Academy - Login Instructions";

            var htmlContent = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #0066cc;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }}
        .content {{
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }}
        .button {{
            display: inline-block;
            background-color: #0066cc;
            color: #ffffff !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
            border: none;
        }}
        .button:hover {{
            background-color: #0052a3;
            color: #ffffff !important;
        }}
        .footer {{
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class='header'>
        <h1>Welcome to FPT Japan Academy</h1>
    </div>
    <div class='content'>
        <p>Hello <strong>{firstName} {lastName}</strong>,</p>
        
        <p>Your account has been successfully created in the FPT Japan Academy system.</p>
        
        <h3>Login Instructions:</h3>
        <ol>
            <li>Access the login page using the link below</li>
            <li>Use your email <strong>{toEmail}</strong> to log in</li>
            <li>Select Google Sign-In to authenticate</li>
            <li>Make sure you use the correct Google account with email <strong>{toEmail}</strong></li>
        </ol>
        
        <div style='text-align: center;'>
            <a href='{loginUrl}' class='button' style='display: inline-block; background-color: #0066cc; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; border: none;'>Login Now</a>
        </div>
        
        <p><strong>Note:</strong> You need to use the Google account with email <strong>{toEmail}</strong> to log in to the system.</p>
        
        <div class='footer'>
            <p>Best regards,<br>FPT Japan Academy Team</p>
            <p>If you have any questions, please contact the support team.</p>
        </div>
    </div>
</body>
</html>";

            var textContent = $@"
Welcome to FPT Japan Academy

Hello {firstName} {lastName},

Your account has been successfully created in the FPT Japan Academy system.

Login Instructions:
1. Access the login page: {loginUrl}
2. Use your email {toEmail} to log in
3. Select Google Sign-In to authenticate
4. Make sure you use the correct Google account with email {toEmail}

Note: You need to use the Google account with email {toEmail} to log in to the system.

Best regards,
FPT Japan Academy Team
";

            _logger.LogInformation($"Creating email message for {toEmail} from {fromEmail}");
            var msg = MailHelper.CreateSingleEmail(from, to, subject, textContent, htmlContent);
            
            _logger.LogInformation($"Sending email via SendGrid to {toEmail}");
            var response = await client.SendEmailAsync(msg);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation($"Welcome email sent successfully to {toEmail}. Status: {response.StatusCode}");
            }
            else
            {
                var responseBody = await response.Body.ReadAsStringAsync();
                _logger.LogError($"Failed to send welcome email to {toEmail}. Status: {response.StatusCode}, Body: {responseBody}");
                Console.WriteLine($"SendGrid Error - Status: {response.StatusCode}, Body: {responseBody}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send welcome email to {toEmail}");
            // Không throw exception để không làm gián đoạn quá trình tạo user
        }
    }
}
