using FJAP.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace FJAP.Services.AIProviders;

/// <summary>
/// AI Provider với fallback mechanism: Thử OpenAI trước, nếu fail thì dùng Mock AI
/// </summary>
public class FallbackAIProvider : IAIProvider
{
    private readonly IAIProvider _primaryProvider; // OpenAI
    private readonly IAIProvider _fallbackProvider; // Mock
    private readonly ILogger<FallbackAIProvider>? _logger;

    public FallbackAIProvider(IAIProvider primaryProvider, IAIProvider fallbackProvider, ILogger<FallbackAIProvider>? logger = null)
    {
        _primaryProvider = primaryProvider;
        _fallbackProvider = fallbackProvider;
        _logger = logger;
    }

    public async Task<string> ChatAsync(string message, string? context = null)
    {
        try
        {
            // Thử primary provider (OpenAI) trước
            var response = await _primaryProvider.ChatAsync(message, context);
            var providerName = _primaryProvider.GetType().Name.Replace("Provider", "");
            _logger?.LogInformation($"✅ Successfully used primary AI provider ({providerName})");
            return response;
        }
        catch (Exception ex)
        {
            // Nếu primary fail, fallback sang Mock AI
            _logger?.LogWarning($"⚠️ Primary AI provider failed: {ex.Message}. Falling back to Mock AI.");
            
            try
            {
                var fallbackResponse = await _fallbackProvider.ChatAsync(message, context);
                
                // Thêm note vào response để user biết đang dùng fallback
                return $"{fallbackResponse}\n\n*[Lưu ý: Đang sử dụng chế độ hỗ trợ cơ bản do dịch vụ AI chính tạm thời không khả dụng]*";
            }
            catch (Exception fallbackEx)
            {
                _logger?.LogError($"❌ Fallback AI provider also failed: {fallbackEx.Message}");
                throw new InvalidOperationException(
                    "Cả dịch vụ AI chính và dịch vụ dự phòng đều không khả dụng. " +
                    "Vui lòng thử lại sau hoặc liên hệ với quản trị viên hệ thống.");
            }
        }
    }
}

