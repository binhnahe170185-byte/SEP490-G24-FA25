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

        var systemPrompt = "Bạn là AI Study Companion, một trợ lý học tập thân thiện và hữu ích cho sinh viên. " +
                          "Bạn giúp sinh viên với:\n" +
                          "- Trả lời câu hỏi về bài học\n" +
                          "- Nhắc nhở deadline bài tập\n" +
                          "- Gợi ý tài liệu học tập\n" +
                          "- Tư vấn cách học hiệu quả\n\n" +
                          "Hãy trả lời một cách thân thiện, ngắn gọn và hữu ích bằng tiếng Việt.";

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
                            return content.GetString() ?? "Xin lỗi, tôi không thể xử lý yêu cầu này.";
                        }
                    }

                    return "Xin lỗi, tôi không thể tạo phản hồi.";
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
                        "OpenAI API đang bị giới hạn request (Rate Limit). " +
                        "Có thể do:\n" +
                        "- Quota API đã hết\n" +
                        "- Quá nhiều request trong thời gian ngắn\n" +
                        "- API key không hợp lệ\n\n" +
                        "Vui lòng thử lại sau vài phút hoặc kiểm tra API key của bạn.");
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

        throw new InvalidOperationException("Không thể kết nối đến OpenAI API sau nhiều lần thử.");
    }
}

