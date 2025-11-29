using System.Net.Http.Json;
using System.Text.Json;
using FJAP.Services.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FJAP.Services.AIProviders;

public class OpenAIProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public OpenAIProvider(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        // Try to get API key from environment variable first, then from config
        _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
               ?? configuration["AI:OpenAI:ApiKey"] 
               ?? "";
        _model = configuration["AI:OpenAI:Model"] ?? "gpt-3.5-turbo";
        
        _httpClient.BaseAddress = new Uri("https://api.openai.com/v1/");
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        }
    }

    public async Task<string> ChatAsync(string message, string? context = null)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("OpenAI API key is not configured");
        }

        var systemPrompt = "You are AI Study Companion, a friendly and helpful study assistant for students. " +
                          "You help students with:\n" +
                          "- Answering questions about lessons\n" +
                          "- Reminding about homework deadlines\n" +
                          "- Suggesting study materials\n" +
                          "- Providing study advice\n\n" +
                          "Please respond in a friendly, concise, and helpful manner. Always respond in the same language that the student uses. If the student asks in Vietnamese, respond in Vietnamese. If the student asks in English, respond in English.";

        if (!string.IsNullOrEmpty(context))
        {
            systemPrompt += $"\n\nContext: {context}";
        }

        var requestBody = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = message }
            },
            temperature = 0.7,
            max_tokens = 500
        };

        // Retry logic với exponential backoff cho lỗi 429 (Too Many Requests)
        const int maxRetries = 3;
        var delay = TimeSpan.FromSeconds(1);

        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("chat/completions", requestBody);
                
                // Nếu thành công
                if (response.IsSuccessStatusCode)
                {
                    var responseData = await response.Content.ReadFromJsonAsync<JsonElement>();
                    
                    if (responseData.TryGetProperty("choices", out var choices) && 
                        choices.GetArrayLength() > 0)
                    {
                        var firstChoice = choices[0];
                        if (firstChoice.TryGetProperty("message", out var messageObj) &&
                            messageObj.TryGetProperty("content", out var content))
                        {
                            return content.GetString() ?? "Sorry, I cannot process this request.";
                        }
                    }

                    return "Sorry, I cannot generate a response.";
                }

                // Xử lý lỗi 429 (Rate Limit)
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    // Đọc Retry-After header nếu có
                    if (response.Headers.Contains("Retry-After"))
                    {
                        var retryAfter = response.Headers.GetValues("Retry-After").FirstOrDefault();
                        if (int.TryParse(retryAfter, out var retrySeconds))
                        {
                            delay = TimeSpan.FromSeconds(retrySeconds);
                        }
                    }

                    // Nếu chưa đến lần retry cuối, thử lại
                    if (attempt < maxRetries - 1)
                    {
                        // Console.WriteLine($"OpenAI rate limit hit (429). Retrying after {delay.TotalSeconds} seconds... (Attempt {attempt + 1}/{maxRetries})");
                        await Task.Delay(delay);
                        delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2); // Exponential backoff
                        continue;
                    }
                    
                    // Nếu đã hết lần retry, throw exception với message rõ ràng
                    throw new InvalidOperationException(
                        "OpenAI API is rate limited. " +
                        "Possible reasons:\n" +
                        "- API quota exceeded\n" +
                        "- Too many requests in a short time\n" +
                        "- Invalid API key\n\n" +
                        "Please try again in a few minutes or check your API key.");
                }

                // Các lỗi khác
                response.EnsureSuccessStatusCode();
            }
            catch (HttpRequestException httpEx) when (attempt < maxRetries - 1)
            {
                // Retry cho network errors
                // Console.WriteLine($"Network error: {httpEx.Message}. Retrying... (Attempt {attempt + 1}/{maxRetries})");
                await Task.Delay(delay);
                delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2);
            }
        }

        throw new InvalidOperationException("Unable to connect to OpenAI API after multiple attempts.");
    }
}

