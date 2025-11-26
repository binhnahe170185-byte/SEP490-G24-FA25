using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class AIChatRequest
{
    [Required(ErrorMessage = "Message is required")]
    public string Message { get; set; } = null!;
    
    public string? Context { get; set; }
}

public class AIChatResponse
{
    public string Response { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}

