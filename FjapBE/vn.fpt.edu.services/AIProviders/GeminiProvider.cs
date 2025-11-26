using System.Net.Http.Json;
using System.Text.Json;
using FJAP.Services.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FJAP.Services.AIProviders;

public class GeminiProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public GeminiProvider(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        // Try to get API key from environment variable first, then from config
        _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
               ?? configuration["AI:Gemini:ApiKey"] 
               ?? "";
        // Model name với version suffix: gemini-1.5-flash-001, gemini-1.5-pro-001
        _model = configuration["AI:Gemini:Model"] ?? "gemini-1.5-flash-001";
        
        // Console.WriteLine($"[GeminiProvider] Initialized with model: {_model}");
        // Console.WriteLine($"[GeminiProvider] API Key configured: {(!string.IsNullOrEmpty(_apiKey) ? "Yes" : "No")}");
        
        // Gemini API base URL - thử lại v1beta với model name đúng
        _httpClient.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/");
    }

    public async Task<string> ChatAsync(string message, string? context = null)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured");
        }

        var systemInstruction = "Bạn là AI Study Companion, một trợ lý học tập thân thiện và hữu ích cho sinh viên. " +
                          "Bạn giúp sinh viên với:\n" +
                          "- Trả lời câu hỏi về bài học\n" +
                          "- Nhắc nhở deadline bài tập\n" +
                          "- Gợi ý tài liệu học tập\n" +
                          "- Tư vấn cách học hiệu quả\n\n" +
                          "Hãy trả lời một cách thân thiện, ngắn gọn và hữu ích bằng tiếng Việt.";

        if (!string.IsNullOrEmpty(context))
        {
            systemInstruction += $"\n\nContext: {context}";
        }

        // Gemini API format - đơn giản hóa format request
        // Kết hợp system instruction vào phần đầu của message
        var fullMessage = $"{systemInstruction}\n\nCâu hỏi của sinh viên: {message}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = fullMessage }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 2048,
                topP = 0.95,
                topK = 40
            }
        };

        // Gemini API endpoint: models/{model}:generateContent?key={apiKey}
        var endpoint = $"models/{_model}:generateContent?key={_apiKey}";

        // Console.WriteLine($"[GeminiProvider] Calling endpoint: {_httpClient.BaseAddress}{endpoint}");
        // Console.WriteLine($"[GeminiProvider] Request body: {System.Text.Json.JsonSerializer.Serialize(requestBody)}");

        // Retry logic với exponential backoff cho lỗi 429
        const int maxRetries = 3;
        var delay = TimeSpan.FromSeconds(1);

        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(endpoint, requestBody);
                
                // Console.WriteLine($"[GeminiProvider] Response status: {response.StatusCode}");
                
                if (response.IsSuccessStatusCode)
                {
                    var responseData = await response.Content.ReadFromJsonAsync<JsonElement>();
                    
                    // Log full response để debug
                    var responseJson = System.Text.Json.JsonSerializer.Serialize(responseData, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                    // Console.WriteLine($"[GeminiProvider] Full response: {responseJson}");
                    
                    // Gemini response format: candidates[0].content.parts[0].text
                    if (responseData.TryGetProperty("candidates", out var candidates))
                    {
                        // Console.WriteLine($"[GeminiProvider] Found candidates array, length: {candidates.GetArrayLength()}");
                        
                        if (candidates.GetArrayLength() > 0)
                        {
                            var firstCandidate = candidates[0];
                            // Console.WriteLine($"[GeminiProvider] First candidate: {firstCandidate}");
                            
                            // Kiểm tra xem có finishReason không (có thể bị block bởi safety settings)
                            string? finishReasonValue = null;
                            if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
                            {
                                finishReasonValue = finishReason.GetString();
                                // Console.WriteLine($"[GeminiProvider] Finish reason: {finishReasonValue}");
                                
                                if (finishReasonValue == "SAFETY" || finishReasonValue == "RECITATION")
                                {
                                    return "Xin lỗi, câu hỏi của bạn có thể vi phạm chính sách an toàn. Vui lòng thử lại với câu hỏi khác.";
                                }
                            }
                            
                            if (firstCandidate.TryGetProperty("content", out var content))
                            {
                                // Console.WriteLine($"[GeminiProvider] Found content property");
                                
                                // Kiểm tra parts trong content
                                if (content.TryGetProperty("parts", out var parts))
                                {
                                    // Console.WriteLine($"[GeminiProvider] Found parts array, length: {parts.GetArrayLength()}");
                                    
                                    if (parts.GetArrayLength() > 0)
                                    {
                                        var firstPart = parts[0];
                                        // Console.WriteLine($"[GeminiProvider] First part: {firstPart}");
                                        
                                        if (firstPart.TryGetProperty("text", out var text))
                                        {
                                            var responseText = text.GetString();
                                            // Console.WriteLine($"[GeminiProvider] Extracted text: {responseText?.Substring(0, Math.Min(100, responseText?.Length ?? 0))}...");
                                            return responseText ?? "Xin lỗi, tôi không thể xử lý yêu cầu này.";
                                        }
                                        else
                                        {
                                            // Console.WriteLine($"[GeminiProvider] No 'text' property in first part");
                                        }
                                    }
                                }
                                else
                                {
                                    // Console.WriteLine($"[GeminiProvider] No 'parts' property in content - content structure: {content}");
                                    
                                    // Có thể response text nằm ở nơi khác hoặc bị MAX_TOKENS cắt
                                    // Kiểm tra xem có text trực tiếp trong content không
                                    if (content.TryGetProperty("text", out var directText))
                                    {
                                        var responseText = directText.GetString();
                                        return responseText ?? "Xin lỗi, tôi không thể xử lý yêu cầu này.";
                                    }
                                    
                                    // Nếu bị MAX_TOKENS và không có parts, có nghĩa là response chưa kịp generate text
                                    // Điều này xảy ra khi model dùng hết tokens cho "thoughts" mà chưa generate output
                                    if (finishReasonValue == "MAX_TOKENS")
                                    {
                                        // Console.WriteLine($"[GeminiProvider] MAX_TOKENS detected without parts - model used tokens for thoughts only");
                                        return "Xin lỗi, tôi gặp vấn đề khi tạo phản hồi do giới hạn tokens. Vui lòng hỏi câu hỏi ngắn gọn hơn hoặc thử lại sau.";
                                    }
                                }
                            }
                            else
                            {
                                // Console.WriteLine($"[GeminiProvider] No 'content' property in first candidate");
                            }
                        }
                        else
                        {
                            // Console.WriteLine($"[GeminiProvider] Candidates array is empty");
                        }
                    }
                    else
                    {
                        // Console.WriteLine($"[GeminiProvider] No 'candidates' property in response");
                    }

                    return "Xin lỗi, tôi không thể tạo phản hồi.";
                }

                // Xử lý lỗi 429 (Rate Limit)
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    if (response.Headers.Contains("Retry-After"))
                    {
                        var retryAfter = response.Headers.GetValues("Retry-After").FirstOrDefault();
                        if (int.TryParse(retryAfter, out var retrySeconds))
                        {
                            delay = TimeSpan.FromSeconds(retrySeconds);
                        }
                    }

                    if (attempt < maxRetries - 1)
                    {
                        // Console.WriteLine($"Gemini API rate limit hit (429). Retrying after {delay.TotalSeconds} seconds... (Attempt {attempt + 1}/{maxRetries})");
                        await Task.Delay(delay);
                        delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2);
                        continue;
                    }
                    
                    throw new InvalidOperationException(
                        "Gemini API đang bị giới hạn request (Rate Limit). " +
                        "Có thể do:\n" +
                        "- Quota API đã hết\n" +
                        "- Quá nhiều request trong thời gian ngắn\n" +
                        "- API key không hợp lệ\n\n" +
                        "Vui lòng thử lại sau vài phút hoặc kiểm tra API key của bạn.");
                }

                // Đọc error message từ response nếu có
                var errorText = await response.Content.ReadAsStringAsync();
                // Console.WriteLine($"[GeminiProvider] Error response: {errorText}");
                throw new InvalidOperationException($"Gemini API error ({response.StatusCode}): {errorText}");
            }
            catch (HttpRequestException httpEx) when (attempt < maxRetries - 1)
            {
                // Console.WriteLine($"Network error calling Gemini API: {httpEx.Message}. Retrying... (Attempt {attempt + 1}/{maxRetries})");
                await Task.Delay(delay);
                delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2);
            }
        }

        throw new InvalidOperationException("Không thể kết nối đến Gemini API sau nhiều lần thử.");
    }
}

