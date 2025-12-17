using System.Text;
using System.Text.Json;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace FJAP.Services;

public class FeedbackTextAnalysisService : IFeedbackTextAnalysisService
{
    private readonly FjapDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FeedbackTextAnalysisService>? _logger;

    public FeedbackTextAnalysisService(
        FjapDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<FeedbackTextAnalysisService>? logger = null)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FeedbackTextSummaryDto> AnalyzeTextFeedbackAsync(int? classId, int? semesterId, DateTime? from, DateTime? to)
    {
        try
        {
            _logger?.LogInformation("Analyzing text feedbacks - ClassId: {ClassId}, SemesterId: {SemesterId}, From: {From}, To: {To}", 
                classId, semesterId, from, to);

            // Query feedbacks with filters (keep tracking to update AnalyzedAt for incremental flow)
            var query = _context.Feedbacks
                .Include(f => f.Class)
                .Where(f => (!string.IsNullOrWhiteSpace(f.FreeText) || !string.IsNullOrWhiteSpace(f.FreeTextTranscript)));

            if (classId.HasValue)
            {
                query = query.Where(f => f.ClassId == classId.Value);
            }

            if (semesterId.HasValue)
            {
                query = query.Where(f => f.Class.SemesterId == semesterId.Value);
            }

            if (from.HasValue)
            {
                query = query.Where(f => f.CreatedAt >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(f => f.CreatedAt <= to.Value);
            }

            var feedbacks = await query.ToListAsync();
            _logger?.LogInformation("Found {Count} feedbacks with text content", feedbacks.Count);

            if (!feedbacks.Any())
            {
                _logger?.LogInformation("No feedbacks found with text content for the given filters");
                return new FeedbackTextSummaryDto(
                    new List<TextSummaryItemDto>(),
                    new List<TextSummaryItemDto>(),
                    0,
                    0
                );
            }

            // Mark newly processed feedbacks as analyzed (incremental guard to avoid re-processing)
            var newlyMarked = feedbacks.Where(f => f.AnalyzedAt == null).ToList();
            if (newlyMarked.Any())
            {
                var now = DateTime.UtcNow;
                newlyMarked.ForEach(f => f.AnalyzedAt = now);
                await _context.SaveChangesAsync();
                _logger?.LogInformation("Marked {Count} feedbacks as analyzed (no AI re-run needed)", newlyMarked.Count);
            }

            // Group by sentiment (use stored AI results)
            var positiveFeedbacks = feedbacks.Where(f => f.Sentiment == "Positive").ToList();
            var negativeFeedbacks = feedbacks.Where(f => f.Sentiment == "Negative").ToList();
            var neutralFeedbacks = feedbacks.Where(f => f.Sentiment != "Positive" && f.Sentiment != "Negative").ToList();

            // Build summaries from stored AI fields (no extra Gemini calls)
            _logger?.LogInformation("Summarizing {PositiveCount} positive and {NegativeCount} negative feedbacks from cached data", 
                positiveFeedbacks.Count, negativeFeedbacks.Count);

            var positiveSummary = BuildSummaryFromCachedData(positiveFeedbacks, "Positive");
            var negativeSummary = BuildSummaryFromCachedData(negativeFeedbacks, "Negative");

            return new FeedbackTextSummaryDto(
                positiveSummary,
                negativeSummary,
                positiveFeedbacks.Count,
                negativeFeedbacks.Count
            );
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error in AnalyzeTextFeedbackAsync");
            // Return empty result instead of throwing to prevent 500 error
            return new FeedbackTextSummaryDto(
                new List<TextSummaryItemDto>(),
                new List<TextSummaryItemDto>(),
                0,
                0
            );
        }
    }

    private async Task<List<TextSummaryItemDto>> SummarizeTextFeedbacksAsync(List<Feedback> feedbacks, string sentiment)
    {
        if (!feedbacks.Any())
        {
            _logger?.LogInformation("No {Sentiment} feedbacks to analyze", sentiment);
            return new List<TextSummaryItemDto>();
        }

        _logger?.LogInformation("Starting analysis for {Count} {Sentiment} feedbacks", feedbacks.Count, sentiment);

        // New incremental path: build summary from cached AI fields, no Gemini call
        var cachedSummary = BuildSummaryFromCachedData(feedbacks, sentiment);
        if (cachedSummary.Any())
        {
            return cachedSummary;
        }

        // Combine all text feedbacks - prioritize FreeText, fallback to FreeTextTranscript
        // Limit to 30 feedbacks and truncate each to 200 chars for faster processing
        var combinedTexts = feedbacks
            .Select(f => 
            {
                var text = !string.IsNullOrWhiteSpace(f.FreeText) 
                    ? f.FreeText 
                    : f.FreeTextTranscript ?? "";
                // Truncate each feedback to 200 characters for faster analysis
                if (text.Length > 200)
                {
                    text = text.Substring(0, 200) + "...";
                }
                return text.Trim();
            })
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Take(30) // Reduced from 100 to 30 for faster processing
            .ToList();

        if (!combinedTexts.Any())
        {
            _logger?.LogWarning("No text content found in {Count} {Sentiment} feedbacks (FreeText and FreeTextTranscript are both empty)", feedbacks.Count, sentiment);
            return new List<TextSummaryItemDto>();
        }

        _logger?.LogInformation("Found {Count} text entries to analyze for {Sentiment} feedbacks", combinedTexts.Count, sentiment);

        var apiKey = _configuration["Gemini:ApiKey"];
        var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";
        var maxTokens = int.Parse(_configuration["Gemini:MaxTokens"] ?? "2000");
        // Google AI Studio uses v1 API
        var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger?.LogWarning("Gemini API key is not configured. Returning empty summary.");
            return new List<TextSummaryItemDto>();
        }

        _logger?.LogInformation("Gemini API configured - Model: {Model}, MaxTokens: {MaxTokens}, BaseUrl: {BaseUrl}", model, maxTokens, baseUrl);
        
        // Try to get available models from API first
        var availableModels = await GetAvailableModelsAsync(apiKey, baseUrl);
        if (availableModels.Any())
        {
            _logger?.LogInformation("Found {Count} available models from API: {Models}", availableModels.Count, string.Join(", ", availableModels));
        }
        
        // List of model names to try (fallback options)
        // Try v1beta models first, then v1 models if needed
        var modelNamesToTry = new List<string> { model };
        if (!model.Contains("-latest"))
        {
            modelNamesToTry.Add($"{model}-latest");
        }
        
        // Add available models from API if we got them
        if (availableModels.Any())
        {
            modelNamesToTry.AddRange(availableModels.Where(m => !modelNamesToTry.Contains(m)));
        }
        
        // For Google AI Studio (v1 API), try these model names
        if (baseUrl.Contains("v1beta"))
        {
            modelNamesToTry.AddRange(new[] { "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro" });
        }
        else
        {
            // For v1 (Google AI Studio), try newer models first (based on available models list)
            modelNamesToTry.AddRange(new[] { 
                "gemini-2.5-flash",      // Latest stable (from your API list)
                "gemini-2.5-pro",        // Latest pro (from your API list)
                "gemini-2.0-flash",      // Stable 2.0 (from your API list)
                "gemini-2.0-flash-001",  // Stable 2.0 version (from your API list)
                "gemini-2.5-flash-lite", // Lite version (from your API list)
                "gemini-2.0-flash-lite", // 2.0 lite (from your API list)
                "gemini-1.5-flash",      // Fallback to 1.5
                "gemini-1.5-pro"         // Fallback to 1.5 pro
            });
        }
        
        // Remove duplicates and ensure we don't have "models/" prefix (API expects just model name)
        modelNamesToTry = modelNamesToTry
            .Select(m => m.Replace("models/", ""))
            .Distinct()
            .ToList();

        // Build prompt
        var prompt = BuildSummaryPrompt(combinedTexts, sentiment);
        _logger?.LogDebug("Built prompt for {Sentiment} analysis. Prompt length: {Length} chars", sentiment, prompt.Length);

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = "You are a feedback analysis assistant. Always respond with valid JSON only, no additional text.\n\n" + prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.3, // Slightly higher for better quality
                topP = 0.8,
                topK = 40, // Restore for better quality
                maxOutputTokens = Math.Min(maxTokens, 2000) // Cap at 2000 for better results
            }
        };

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(60);

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            // Try different model names if the first one fails
            System.Net.Http.HttpResponseMessage? response = null;
            string? responseContent = null;
            string? lastModelTried = null;
            
            foreach (var modelToTry in modelNamesToTry.Distinct())
            {
                lastModelTried = modelToTry;
                var requestUri = $"{baseUrl.TrimEnd('/')}/models/{modelToTry}:generateContent?key={apiKey}";
                _logger?.LogInformation("Trying Gemini API with model: {Model} - {Uri} (without key)", modelToTry, requestUri.Replace(apiKey, "***"));
                
                response = await httpClient.PostAsync(requestUri, content);
                responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger?.LogInformation("Successfully connected to Gemini API with model: {Model}", modelToTry);
                    break;
                }
                
                // If 404, try next model
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger?.LogWarning("Model {Model} not found (404), trying next model...", modelToTry);
                    continue;
                }
                
                // For other errors, stop trying
                break;
            }

            if (response == null || responseContent == null || !response.IsSuccessStatusCode)
            {
                _logger?.LogError("Gemini API error after trying {Count} models. Last model: {Model}, StatusCode: {StatusCode} - {Content}", 
                    modelNamesToTry.Count, lastModelTried, response?.StatusCode, responseContent);
                
                // Check for quota/rate limit errors
                if (response?.StatusCode == System.Net.HttpStatusCode.TooManyRequests || 
                    response?.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    _logger?.LogWarning("Gemini API quota/rate limit reached. Please check your Google Cloud Console billing/quota settings.");
                }
                
                return new List<TextSummaryItemDto>();
            }

            _logger?.LogInformation("Gemini API call successful. Response length: {Length} chars", responseContent.Length);

            var jsonDoc = JsonDocument.Parse(responseContent);
            if (!jsonDoc.RootElement.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
            {
                _logger?.LogWarning("Gemini API returned no candidates. Response: {Response}", responseContent);
                return new List<TextSummaryItemDto>();
            }

            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var contentElement) ||
                !contentElement.TryGetProperty("parts", out var partsElement) ||
                partsElement.GetArrayLength() == 0)
            {
                _logger?.LogWarning("Gemini API response missing content/parts. Candidate: {Candidate}", candidate.ToString());
                return new List<TextSummaryItemDto>();
            }

            var sbText = new StringBuilder();
            foreach (var part in partsElement.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    sbText.Append(textElement.GetString());
                }
            }

            var messageContent = sbText.ToString();
            if (string.IsNullOrWhiteSpace(messageContent))
            {
                _logger?.LogWarning("Gemini API returned empty message content. Parts count: {Count}", partsElement.GetArrayLength());
                return new List<TextSummaryItemDto>();
            }

            _logger?.LogDebug("Extracted message content from Gemini. Length: {Length} chars", messageContent.Length);

            // Extract JSON
            var extractedJson = ExtractJsonFromResponse(messageContent);
            if (string.IsNullOrWhiteSpace(extractedJson))
            {
                _logger?.LogWarning("Failed to extract JSON from Gemini response. Message content (first 500 chars): {Content}", 
                    messageContent.Length > 500 ? messageContent.Substring(0, 500) : messageContent);
                return new List<TextSummaryItemDto>();
            }

            _logger?.LogDebug("Extracted JSON from response. JSON length: {Length} chars", extractedJson.Length);

            // Parse JSON
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true
            };

            var summaryResult = JsonSerializer.Deserialize<TextSummaryResponse>(extractedJson, options);
            if (summaryResult?.Items == null || !summaryResult.Items.Any())
            {
                _logger?.LogWarning("Failed to parse or empty result from Gemini. Extracted JSON: {Json}", 
                    extractedJson.Length > 1000 ? extractedJson.Substring(0, 1000) + "..." : extractedJson);
                return new List<TextSummaryItemDto>();
            }

            _logger?.LogInformation("Successfully parsed {Count} {Sentiment} topics from Gemini API", summaryResult.Items.Count, sentiment);
            return summaryResult.Items;
        }
        catch (JsonException ex)
        {
            _logger?.LogError(ex, "JSON parsing error when summarizing {Sentiment} feedbacks", sentiment);
            return new List<TextSummaryItemDto>();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error summarizing {Sentiment} text feedbacks", sentiment);
            return new List<TextSummaryItemDto>();
        }
    }

    private List<TextSummaryItemDto> BuildSummaryFromCachedData(List<Feedback> feedbacks, string sentiment)
    {
        if (!feedbacks.Any())
        {
            _logger?.LogInformation("No {Sentiment} feedbacks to summarize from cache", sentiment);
            return new List<TextSummaryItemDto>();
        }

        var groups = feedbacks.GroupBy(f =>
            !string.IsNullOrWhiteSpace(f.CategoryCode) ? f.CategoryCode :
            !string.IsNullOrWhiteSpace(f.IssueCategory) ? f.IssueCategory :
            "UNK");

        var summaries = new List<TextSummaryItemDto>();

        foreach (var group in groups)
        {
            var code = group.Key ?? "UNK";
            var display = IssueCategoryInfo.GetDisplayNameWithCode(code);
            var nameOnly = IssueCategoryInfo.GetDisplayName(code);
            var topic = !string.IsNullOrWhiteSpace(display) ? display : nameOnly ?? "Unknown";

            var mainIssue = group.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g.MainIssue))?.MainIssue
                            ?? $"Feedback about {nameOnly ?? "Unknown"}";

            var examples = group
                .Select(g => g.FreeText ?? g.FreeTextTranscript ?? string.Empty)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Take(2)
                .ToList();

            if (!examples.Any())
            {
                examples.Add("No example available");
            }

            var mentionCount = group.Count();
            var urgencyScore = group.Any() ? group.Max(g => g.Urgency) : 0;

            summaries.Add(new TextSummaryItemDto(
                topic,
                mainIssue,
                mentionCount,
                examples,
                urgencyScore
            ));
        }

        return summaries
            .OrderByDescending(s => s.MentionCount)
            .ToList();
    }

    private string BuildSummaryPrompt(List<string> feedbackTexts, string sentiment)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Analyze feedbacks and return ONLY valid JSON (no markdown, no explanations).");
        sb.AppendLine();
        sb.AppendLine("JSON:");
        sb.AppendLine("{\"items\":[{\"topic\":\"category\",\"summary\":\"1 sentence\",\"mentionCount\":number,\"examples\":[\"quote1\",\"quote2\"],\"urgencyScore\":0-10}]}");
        sb.AppendLine();
        sb.AppendLine($"Feedbacks ({sentiment}):");
        for (int i = 0; i < feedbackTexts.Count && i < 30; i++)
        {
            // Text already truncated to 200 chars above
            sb.AppendLine($"{i + 1}. {feedbackTexts[i]}");
        }
        sb.AppendLine();
        if (sentiment == "Negative")
        {
            sb.AppendLine("CRITICAL: These are NEGATIVE feedbacks that need immediate attention. You MUST analyze and categorize ALL issues.");
            sb.AppendLine("Tasks: 1) Group issues into categories (Teaching Quality, Workload, Materials, Facilities, Support, Technical Issues, Schedule). 2) Count how many feedbacks mention each issue. 3) Write 1-sentence summary for each category. 4) Extract 2 example quotes. 5) Assign urgency score 0-10 (higher = more urgent). 6) Return MAX 8 topics, sorted by mentionCount DESCENDING.");
            sb.AppendLine("IMPORTANT: If feedbacks mention problems, you MUST return at least 1 item. Do NOT return empty array.");
        }
        else
        {
            sb.AppendLine("Tasks: 1) Group positive topics. 2) Count mentions. 3) Brief summary. 4) 2 examples. 5) Urgency=0. 6) Max 5 topics.");
        }
        sb.AppendLine("Return ONLY valid JSON (no markdown, no explanations):");

        return sb.ToString();
    }

    private string ExtractJsonFromResponse(string messageContent)
    {
        // Try to extract JSON if wrapped in markdown code blocks
        var extractedJson = messageContent;
        if (messageContent.Contains("```json"))
        {
            var startIdx = messageContent.IndexOf("```json") + 7;
            var endIdx = messageContent.IndexOf("```", startIdx);
            if (endIdx > startIdx)
            {
                extractedJson = messageContent.Substring(startIdx, endIdx - startIdx).Trim();
            }
        }
        else if (messageContent.Contains("```"))
        {
            var startIdx = messageContent.IndexOf("```") + 3;
            var endIdx = messageContent.IndexOf("```", startIdx);
            if (endIdx > startIdx)
            {
                extractedJson = messageContent.Substring(startIdx, endIdx - startIdx).Trim();
            }
        }

        // Find JSON object boundaries
        var jsonStart = extractedJson.IndexOf('{');
        var jsonEnd = extractedJson.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
        {
            extractedJson = extractedJson.Substring(jsonStart, jsonEnd - jsonStart + 1);
        }

        return extractedJson;
    }

    private async Task<List<string>> GetAvailableModelsAsync(string apiKey, string baseUrl)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            // Try both v1 and v1beta endpoints (Google AI Studio might use either)
            var endpointsToTry = new List<string>();
            if (baseUrl.Contains("v1beta"))
            {
                endpointsToTry.Add(baseUrl);
                endpointsToTry.Add(baseUrl.Replace("/v1beta", "/v1"));
            }
            else
            {
                endpointsToTry.Add(baseUrl);
                endpointsToTry.Add(baseUrl.Replace("/v1", "/v1beta"));
            }
            
            foreach (var endpoint in endpointsToTry)
            {
                try
                {
                    var listModelsUrl = $"{endpoint.TrimEnd('/')}/models?key={apiKey}";
                    _logger?.LogDebug("Trying to list models from: {Url} (without key)", listModelsUrl.Replace(apiKey, "***"));
                    
                    var response = await httpClient.GetAsync(listModelsUrl);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger?.LogDebug("Failed to list models from {Endpoint}: {StatusCode}", endpoint, response.StatusCode);
                        continue;
                    }
                    
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var jsonDoc = JsonDocument.Parse(responseContent);
                    
                    if (!jsonDoc.RootElement.TryGetProperty("models", out var modelsArray))
                    {
                        _logger?.LogDebug("No 'models' property in response from {Endpoint}", endpoint);
                        continue;
                    }
                    
                    var modelNames = new List<string>();
                    foreach (var modelElement in modelsArray.EnumerateArray())
                    {
                        if (modelElement.TryGetProperty("name", out var nameElement))
                        {
                            var name = nameElement.GetString();
                            if (!string.IsNullOrWhiteSpace(name))
                            {
                                // Extract model name from full path (e.g., "models/gemini-1.5-flash" -> "gemini-1.5-flash")
                                var modelName = name.Contains("/") ? name.Split('/').Last() : name;
                                modelNames.Add(modelName);
                                
                                // Check if model supports generateContent
                                if (modelElement.TryGetProperty("supportedGenerationMethods", out var methods))
                                {
                                    foreach (var method in methods.EnumerateArray())
                                    {
                                        if (method.GetString() == "generateContent")
                                        {
                                            // Model supports generateContent, add it to list
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (modelNames.Any())
                    {
                        _logger?.LogInformation("Successfully retrieved {Count} models from {Endpoint}", modelNames.Count, endpoint);
                        return modelNames;
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogDebug(ex, "Error trying endpoint {Endpoint}", endpoint);
                    continue;
                }
            }
            
            return new List<string>();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error getting available models list");
            return new List<string>();
        }
    }

    private List<TextSummaryItemDto> CreateFallbackNegativeSummary(List<Feedback> negativeFeedbacks)
    {
        var summary = new List<TextSummaryItemDto>();
        
        // Group by IssueCategory if available
        var groupedByCategory = negativeFeedbacks
            .Where(f => !string.IsNullOrWhiteSpace(f.IssueCategory))
            .GroupBy(f => f.IssueCategory ?? "Other")
            .ToList();

        if (groupedByCategory.Any())
        {
            foreach (var group in groupedByCategory)
            {
                var feedbacks = group.ToList();
                var texts = feedbacks
                    .Select(f => !string.IsNullOrWhiteSpace(f.FreeText) ? f.FreeText : f.FreeTextTranscript ?? "")
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToList();

                // Get display name for category
                var categoryName = GetCategoryDisplayName(group.Key);
                
                // Create a meaningful summary from actual feedback content
                var summaryText = CreateSummaryFromTexts(texts, categoryName, feedbacks.Count);

                // Get examples (first 2 non-empty texts, truncated to 100 chars each)
                var examples = texts
                    .Take(2)
                    .Select(t => t.Length > 100 ? t.Substring(0, 100) + "..." : t)
                    .ToList();

                summary.Add(new TextSummaryItemDto(
                    Topic: categoryName,
                    Summary: summaryText,
                    MentionCount: feedbacks.Count,
                    Examples: examples,
                    UrgencyScore: (int)feedbacks.Average(f => f.Urgency > 0 ? f.Urgency : 5)
                ));
            }
        }
        else
        {
            // If no categories, analyze all feedbacks together
            var allTexts = negativeFeedbacks
                .Select(f => !string.IsNullOrWhiteSpace(f.FreeText) ? f.FreeText : f.FreeTextTranscript ?? "")
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .ToList();

            var summaryText = CreateSummaryFromTexts(allTexts, "General Issues", negativeFeedbacks.Count);
            
            var examples = allTexts
                .Take(2)
                .Select(t => t.Length > 100 ? t.Substring(0, 100) + "..." : t)
                .ToList();

            summary.Add(new TextSummaryItemDto(
                Topic: "General Negative Feedback",
                Summary: summaryText,
                MentionCount: negativeFeedbacks.Count,
                Examples: examples,
                UrgencyScore: negativeFeedbacks.Any(f => f.Urgency > 0) 
                    ? (int)negativeFeedbacks.Where(f => f.Urgency > 0).Average(f => f.Urgency)
                    : 5
            ));
        }

        return summary;
    }

    private string GetCategoryDisplayName(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return "Other";

        // Try to get display name from FeedbackIssueCategory
        if (FeedbackIssueCategory.DisplayNames.TryGetValue(category, out var displayName))
        {
            return displayName;
        }

        // Try to parse as IssueCategory code (C1, C2, etc.) and get name
        if (IssueCategoryInfo.GetDisplayName(category) != category)
        {
            return IssueCategoryInfo.GetDisplayName(category);
        }

        // Fallback: convert to readable format (ASSESSMENT_LOAD -> Assessment Load)
        return category
            .Replace("_", " ")
            .Split(' ')
            .Select(word => 
                string.IsNullOrEmpty(word) 
                    ? "" 
                    : word.Length > 1 
                        ? char.ToUpper(word[0]) + word.Substring(1).ToLower() 
                        : word.ToUpper())
            .Where(w => !string.IsNullOrEmpty(w))
            .Aggregate((a, b) => a + " ");
    }

    private string CreateSummaryFromTexts(List<string> texts, string category, int count)
    {
        if (!texts.Any())
        {
            return $"Found {count} feedback(s) related to {category}";
        }

        // Combine all texts and create a concise summary
        var combined = string.Join(" ", texts.Take(3));
        
        // Extract key phrases (simple approach: first 150 chars)
        var preview = combined.Length > 150 
            ? combined.Substring(0, 150).Trim() + "..."
            : combined.Trim();

        // Create a more meaningful summary
        if (count == 1)
        {
            return $"Student reported: {preview}";
        }
        else
        {
            return $"{count} students mentioned issues about {category.ToLower()}. Common concerns: {preview}";
        }
    }

    private class TextSummaryResponse
    {
        public List<TextSummaryItemDto>? Items { get; set; }
    }
}
