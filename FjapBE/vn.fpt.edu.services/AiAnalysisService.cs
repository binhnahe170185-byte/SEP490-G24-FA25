using System.Linq;
using System.Text;
using System.Text.Json;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FJAP.Services;

public class AiAnalysisService : IAiAnalysisService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiAnalysisService>? _logger;

    public AiAnalysisService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiAnalysisService>? logger = null)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AiAnalysisResult> AnalyzeFeedbackAsync(
        Dictionary<int, int> answers,
        List<FeedbackQuestionDto> questions,
        decimal satisfactionScore,
        string? freeText)
    {
        try
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"] ?? "gemini-1.5-flash";
            var maxTokens = int.Parse(_configuration["Gemini:MaxTokens"] ?? "500");
            var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger?.LogWarning("Gemini API key is not configured. Returning fallback analysis from freeText.");
                return GetFallbackAnalysis(freeText, satisfactionScore);
            }

            // Truncate free text to 4000 characters
            var truncatedFreeText = freeText?.Length > 4000 
                ? freeText.Substring(0, 4000) 
                : freeText;

            var prompt = BuildPrompt(answers, questions, satisfactionScore, truncatedFreeText);

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
                    temperature = 0.1, // Lower temperature for more consistent, deterministic output
                    topP = 0.8, // Nucleus sampling for better quality
                    topK = 40, // Limit vocabulary for more focused responses
                    maxOutputTokens = maxTokens
                }
            };

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var requestUri = $"{baseUrl.TrimEnd('/')}/models/{model}:generateContent?key={apiKey}";
            var response = await httpClient.PostAsync(requestUri, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogError("Gemini API error: {StatusCode} - {Content}", response.StatusCode, responseContent);
                return GetFallbackAnalysis(freeText, satisfactionScore);
            }

            var jsonDoc = JsonDocument.Parse(responseContent);
            if (!jsonDoc.RootElement.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
            {
                _logger?.LogWarning("Gemini API returned no candidates. Using fallback analysis.");
                return GetFallbackAnalysis(freeText, satisfactionScore);
            }

            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var contentElement) ||
                !contentElement.TryGetProperty("parts", out var partsElement) ||
                partsElement.GetArrayLength() == 0)
            {
                _logger?.LogWarning("Gemini API returned empty content");
                return GetDefaultAnalysis();
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
                _logger?.LogWarning("Gemini API returned empty message text. Using fallback analysis.");
                return GetFallbackAnalysis(freeText, satisfactionScore);
            }

            _logger?.LogInformation("Gemini raw response (length: {Length}): {Response}", messageContent.Length, messageContent);

            // Try to extract JSON if wrapped in markdown code blocks
            var extractedJson = messageContent;
            if (messageContent.Contains("```json"))
            {
                var startIdx = messageContent.IndexOf("```json") + 7;
                var endIdx = messageContent.IndexOf("```", startIdx);
                if (endIdx > startIdx)
                {
                    extractedJson = messageContent.Substring(startIdx, endIdx - startIdx).Trim();
                    _logger?.LogInformation("Extracted JSON from ```json block");
                }
            }
            else if (messageContent.Contains("```"))
            {
                var startIdx = messageContent.IndexOf("```") + 3;
                var endIdx = messageContent.IndexOf("```", startIdx);
                if (endIdx > startIdx)
                {
                    extractedJson = messageContent.Substring(startIdx, endIdx - startIdx).Trim();
                    _logger?.LogInformation("Extracted JSON from ``` block");
                }
            }

            // Find JSON object boundaries
            var jsonStart = extractedJson.IndexOf('{');
            var jsonEnd = extractedJson.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                extractedJson = extractedJson.Substring(jsonStart, jsonEnd - jsonStart + 1);
                _logger?.LogInformation("Extracted JSON object boundaries: start={Start}, end={End}", jsonStart, jsonEnd);
            }
            else
            {
                _logger?.LogWarning("Could not find JSON object boundaries. Start: {Start}, End: {End}", jsonStart, jsonEnd);
            }

            _logger?.LogInformation("Extracted JSON (length: {Length}): {Json}", extractedJson.Length, extractedJson);

            // Parse JSON response - try multiple approaches
            AiAnalysisResult? analysisResult = null;
            
            // Approach 1: Normalize JSON to handle snake_case → PascalCase conversion
            try
            {
                // Normalize JSON: convert snake_case to camelCase for better compatibility
                var normalizedJson = NormalizeJsonPropertyNames(extractedJson);
                _logger?.LogInformation("Normalized JSON (length: {Length}): {Json}", normalizedJson.Length, normalizedJson);
                
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    AllowTrailingCommas = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };
                
                analysisResult = JsonSerializer.Deserialize<AiAnalysisResult>(normalizedJson, options);
                if (analysisResult != null)
                {
                    _logger?.LogInformation("Successfully parsed JSON using normalized deserialization. Keywords count: {Count}, Suggestions count: {SuggestionsCount}", 
                        analysisResult.Keywords?.Count ?? 0, analysisResult.Suggestions?.Count ?? 0);
                }
            }
            catch (JsonException jsonEx)
            {
                _logger?.LogWarning(jsonEx, "Normalized JSON deserialization failed: {Message}. Trying alternative parsing...", jsonEx.Message);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Unexpected error during normalized JSON deserialization: {Message}", ex.Message);
            }
            
            // Approach 1b: Try with snake_case naming policy
            if (analysisResult == null)
            {
                try
                {
                    // Create custom snake_case converter
                    var snakeCaseOptions = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true
                    };
                    
                    // Try direct deserialization with case-insensitive matching
                    analysisResult = JsonSerializer.Deserialize<AiAnalysisResult>(extractedJson, snakeCaseOptions);
                    if (analysisResult != null)
                    {
                        _logger?.LogInformation("Successfully parsed JSON using snake_case deserialization. Keywords count: {Count}, Suggestions count: {SuggestionsCount}", 
                            analysisResult.Keywords?.Count ?? 0, analysisResult.Suggestions?.Count ?? 0);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Snake_case JSON deserialization also failed: {Message}", ex.Message);
                }
            }

            // Approach 2: Try to fix common JSON issues and retry
            if (analysisResult == null)
            {
                try
                {
                    // Try to fix common issues: remove trailing commas, fix quotes, normalize
                    var fixedJson = extractedJson
                        .Replace(",\n}", "\n}")
                        .Replace(",\n]", "\n]")
                        .Replace(",\r\n}", "\r\n}")
                        .Replace(",\r\n]", "\r\n]");
                    
                    // Normalize property names
                    fixedJson = NormalizeJsonPropertyNames(fixedJson);
                    
                    var options2 = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true,
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    };
                    analysisResult = JsonSerializer.Deserialize<AiAnalysisResult>(fixedJson, options2);
                    if (analysisResult != null)
                    {
                        _logger?.LogInformation("Successfully parsed JSON after fixing common issues. Keywords count: {Count}, Suggestions count: {SuggestionsCount}", 
                            analysisResult.Keywords?.Count ?? 0, analysisResult.Suggestions?.Count ?? 0);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Fixed JSON parsing also failed: {Message}", ex.Message);
                }
            }

            // Approach 3: Manual extraction of key fields using regex
            if (analysisResult == null)
            {
                _logger?.LogWarning("All JSON parsing attempts failed. Attempting manual field extraction from response...");
                
                try
                {
                    var sentimentMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""sentiment""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var sentiment = sentimentMatch.Success ? sentimentMatch.Groups[1].Value : "Neutral";
                    
                    var sentimentScoreMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""sentiment_score""\s*:\s*(-?\d+\.?\d*)", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var sentimentScore = sentimentScoreMatch.Success && decimal.TryParse(sentimentScoreMatch.Groups[1].Value, out var ss) ? ss : 0.0m;
                    
                    var urgencyMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""urgency""\s*:\s*(\d+)", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var urgency = urgencyMatch.Success && int.TryParse(urgencyMatch.Groups[1].Value, out var u) ? u : 0;
                    
                    // Try new fields first (category_code, reason), then fallback to old fields (main_issue, issue_category)
                    var categoryCodeMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""category_code""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var categoryCode = categoryCodeMatch.Success ? categoryCodeMatch.Groups[1].Value : null;
                    
                    var categoryNameMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""category_name""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var categoryName = categoryNameMatch.Success ? categoryNameMatch.Groups[1].Value : null;
                    
                    var confidenceMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""confidence""\s*:\s*(\d+\.?\d*)", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var confidence = confidenceMatch.Success && decimal.TryParse(confidenceMatch.Groups[1].Value, out var conf) ? conf : (decimal?)null;
                    
                    var reasonMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""reason""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var reason = reasonMatch.Success ? reasonMatch.Groups[1].Value : null;
                    
                    // Fallback to old fields if new fields not found
                    var mainIssueMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""main_issue""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var mainIssue = reason ?? (mainIssueMatch.Success ? mainIssueMatch.Groups[1].Value : "Unknown");
                    
                    var categoryMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""issue_category""\s*:\s*""([^""]+)""", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    var extractedCategory = categoryCode ?? (categoryMatch.Success ? categoryMatch.Groups[1].Value : null);
                    
                    // Extract keywords array
                    var keywordsMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""keywords""\s*:\s*\[(.*?)\]", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
                    var keywords = new List<string>();
                    if (keywordsMatch.Success)
                    {
                        var keywordsStr = keywordsMatch.Groups[1].Value;
                        var keywordMatches = System.Text.RegularExpressions.Regex.Matches(keywordsStr, @"""([^""]+)""");
                        foreach (System.Text.RegularExpressions.Match km in keywordMatches)
                        {
                            keywords.Add(km.Groups[1].Value);
                        }
                    }
                    
                    // Extract suggestions array - improved regex to handle multiline and nested quotes
                    var suggestionsMatch = System.Text.RegularExpressions.Regex.Match(
                        messageContent, 
                        @"""suggestions""\s*:\s*\[(.*?)\]", 
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
                    var suggestions = new List<string>();
                    if (suggestionsMatch.Success)
                    {
                        var suggestionsStr = suggestionsMatch.Groups[1].Value;
                        // Try to parse as JSON array first
                        try
                        {
                            var suggestionsArray = JsonSerializer.Deserialize<List<string>>($"[{suggestionsStr}]");
                            if (suggestionsArray != null)
                            {
                                suggestions = suggestionsArray;
                            }
                        }
                        catch
                        {
                            // Fallback to regex extraction
                            var suggestionMatches = System.Text.RegularExpressions.Regex.Matches(suggestionsStr, @"""([^""\\]*(?:\\.[^""\\]*)*)""");
                            foreach (System.Text.RegularExpressions.Match sm in suggestionMatches)
                            {
                                var suggestion = sm.Groups[1].Value.Replace("\\\"", "\"").Replace("\\n", " ").Trim();
                                if (!string.IsNullOrWhiteSpace(suggestion))
                                {
                                    suggestions.Add(suggestion);
                                }
                            }
                        }
                    }
                    
                    _logger?.LogInformation("Manually extracted fields - Sentiment: {Sentiment}, Score: {Score}, Urgency: {Urgency}, MainIssue: {MainIssue}, CategoryCode: {CategoryCode}, CategoryName: {CategoryName}, Keywords: {KeywordsCount}, Suggestions: {SuggestionsCount}", 
                        sentiment, sentimentScore, urgency, mainIssue, categoryCode, categoryName, keywords.Count, suggestions.Count);
                    
                    // Create result even if mainIssue is "Unknown" - we can use reason or generate from text
                    var finalMainIssue = mainIssue;
                    if (string.IsNullOrWhiteSpace(finalMainIssue) || finalMainIssue == "Unknown")
                    {
                        finalMainIssue = reason ?? "General feedback";
                    }
                    
                    analysisResult = new AiAnalysisResult(
                        sentiment,
                        sentimentScore,
                        keywords.Count > 0 ? keywords : new List<string>(),
                        suggestions.Count > 0 ? suggestions : new List<string>(),
                        urgency,
                        finalMainIssue,
                        extractedCategory,
                        categoryCode,
                        categoryName,
                        confidence,
                        reason
                    );
                    _logger?.LogInformation("Created analysis result from manually extracted fields - Keywords: {KeywordsCount}, Suggestions: {SuggestionsCount}, MainIssue: {MainIssue}", 
                        analysisResult.Keywords?.Count ?? 0, analysisResult.Suggestions?.Count ?? 0, analysisResult.MainIssue);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Manual field extraction also failed: {Message}", ex.Message);
                }
            }

            // If still null, return default but log extensively
            if (analysisResult == null)
            {
                _logger?.LogError("=== ALL PARSING ATTEMPTS FAILED ===");
                _logger?.LogError("Raw Gemini response (first 1000 chars): {Response}", 
                    messageContent.Length > 1000 ? messageContent.Substring(0, 1000) : messageContent);
                _logger?.LogError("Extracted JSON (first 1000 chars): {Json}", 
                    extractedJson.Length > 1000 ? extractedJson.Substring(0, 1000) : extractedJson);
                
                // Generate fallback analysis from freeText
                _logger?.LogInformation("All parsing attempts failed. Generating fallback analysis from freeText.");
                return GetFallbackAnalysis(freeText, satisfactionScore);
            }

            // Log parsed result details
            _logger?.LogInformation("=== Parsed Analysis Result ===");
            _logger?.LogInformation("Category: {Category}, CategoryCode: {CategoryCode}", 
                analysisResult.IssueCategory, analysisResult.CategoryCode);
            _logger?.LogInformation("MainIssue: {MainIssue}, Reason: {Reason}", 
                analysisResult.MainIssue, analysisResult.Reason);
            _logger?.LogInformation("Sentiment: {Sentiment}, SentimentScore: {SentimentScore}, Urgency: {Urgency}", 
                analysisResult.Sentiment, analysisResult.SentimentScore, analysisResult.Urgency);
            _logger?.LogInformation("Keywords count: {KeywordsCount}, Suggestions count: {SuggestionsCount}", 
                analysisResult.Keywords?.Count ?? 0, analysisResult.Suggestions?.Count ?? 0);
            if (analysisResult.Keywords != null && analysisResult.Keywords.Count > 0)
            {
                _logger?.LogInformation("Keywords: {Keywords}", string.Join(", ", analysisResult.Keywords));
            }
            if (analysisResult.Suggestions != null && analysisResult.Suggestions.Count > 0)
            {
                _logger?.LogInformation("Suggestions: {Suggestions}", string.Join(" | ", analysisResult.Suggestions));
            }

            // Validate and sanitize result
            var sanitized = SanitizeResult(analysisResult);
            _logger?.LogInformation("=== Sanitized Analysis Result ===");
            _logger?.LogInformation("Category: {Category}, CategoryCode: {CategoryCode}", 
                sanitized.IssueCategory, sanitized.CategoryCode);
            _logger?.LogInformation("MainIssue: {MainIssue}, Reason: {Reason}", 
                sanitized.MainIssue, sanitized.Reason);
            _logger?.LogInformation("Keywords count: {KeywordsCount}, Suggestions count: {SuggestionsCount}", 
                sanitized.Keywords?.Count ?? 0, sanitized.Suggestions?.Count ?? 0);
            
            // If still no valid category after sanitization, try pattern-based classification
            var finalCategoryCode = sanitized.CategoryCode ?? sanitized.IssueCategory;
            var validCodes = new[] { "C1", "C2", "C3", "C4", "M1", "A1", "T1", "F1" };
            var isValidCategory = !string.IsNullOrWhiteSpace(finalCategoryCode) && 
                                  validCodes.Contains(finalCategoryCode.ToUpperInvariant());
            
            if (!isValidCategory && !string.IsNullOrWhiteSpace(sanitized.MainIssue))
            {
                _logger?.LogWarning("AI returned invalid category after sanitization. Attempting pattern-based re-classification.");
                
                // Try pattern-based classification as last resort
                var patternCode = ClassifyByPattern(sanitized.MainIssue, freeText);
                if (!string.IsNullOrWhiteSpace(patternCode))
                {
                    _logger?.LogInformation("Pattern-based classification succeeded: {Category}", patternCode);
                    var categoryEnum = FJAP.vn.fpt.edu.models.IssueCategoryInfo.FromCode(patternCode);
                    var categoryName = categoryEnum != FJAP.vn.fpt.edu.models.IssueCategory.Unknown
                        ? FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetName(categoryEnum)
                        : null;
                    
                    return new AiAnalysisResult(
                        sanitized.Sentiment,
                        sanitized.SentimentScore,
                        sanitized.Keywords,
                        sanitized.Suggestions,
                        sanitized.Urgency,
                        sanitized.MainIssue,
                        patternCode,
                        patternCode,
                        categoryName,
                        sanitized.Confidence,
                        sanitized.Reason
                    );
                }
            }
            
            return sanitized;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error analyzing feedback with AI. Using fallback analysis.");
            return GetFallbackAnalysis(freeText, satisfactionScore);
        }
    }

    private string BuildPrompt(Dictionary<int, int> answers, List<FeedbackQuestionDto> questions, decimal satisfactionScore, string? freeText)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a feedback analysis assistant. Analyze the following course feedback and return ONLY a valid JSON object.");
        sb.AppendLine();
        sb.AppendLine("CRITICAL: Return ONLY valid JSON. Do NOT include markdown code fences (```json), do NOT add explanations, do NOT add any text before or after the JSON.");
        sb.AppendLine();
        sb.AppendLine("=== REQUIRED JSON SCHEMA (use EXACT property names) ===");
        sb.AppendLine("{");
        sb.AppendLine("  \"category_code\": \"C1\" | \"C2\" | \"C3\" | \"C4\" | \"M1\" | \"A1\" | \"T1\" | \"F1\",");
        sb.AppendLine("  \"category_name\": \"string (e.g., 'Teaching Clarity')\",");
        sb.AppendLine("  \"confidence\": 0.0 to 1.0 (decimal number),");
        sb.AppendLine("  \"urgency\": 0 to 10 (integer),");
        sb.AppendLine("  \"sentiment\": \"Positive\" | \"Neutral\" | \"Negative\",");
        sb.AppendLine("  \"sentiment_score\": -1.0 to 1.0 (decimal number),");
        sb.AppendLine("  \"reason\": \"Short justification (max 2 sentences)\",");
        sb.AppendLine("  \"keywords\": [\"keyword1\", \"keyword2\", \"keyword3\"],");
        sb.AppendLine("  \"suggestions\": [\"suggestion1\", \"suggestion2\", \"suggestion3\"]");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("=== EXAMPLE JSON OUTPUT ===");
        sb.AppendLine("{");
        sb.AppendLine("  \"category_code\": \"A1\",");
        sb.AppendLine("  \"category_name\": \"Assessment & Workload Fairness\",");
        sb.AppendLine("  \"confidence\": 0.85,");
        sb.AppendLine("  \"urgency\": 7,");
        sb.AppendLine("  \"sentiment\": \"Negative\",");
        sb.AppendLine("  \"sentiment_score\": -0.6,");
        sb.AppendLine("  \"reason\": \"Student reports excessive homework causing stress and difficulty understanding assignments.\",");
        sb.AppendLine("  \"keywords\": [\"homework\", \"difficult\", \"stress\", \"assignment\", \"workload\"],");
        sb.AppendLine("  \"suggestions\": [\"Reduce homework frequency to allow more time for understanding\", \"Provide clearer instructions for assignments\", \"Consider breaking large assignments into smaller tasks\"]");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("=== ISSUE CATEGORIES (8 FIXED CODES) ===");
        sb.AppendLine("You MUST classify feedback into EXACTLY ONE of these 8 categories:");
        sb.AppendLine();
        sb.AppendLine("C1 – Teaching Clarity");
        sb.AppendLine("  Issues: unclear explanations, confusing lectures, lack of examples, hard to understand");
        sb.AppendLine("  Keywords: explain, explanation, unclear, confusing, don't understand, not clear, teaching, lecturer");
        sb.AppendLine();
        sb.AppendLine("C2 – Pacing");
        sb.AppendLine("  Issues: teaching speed too fast or too slow, cannot keep up, pace issues");
        sb.AppendLine("  Keywords: pace, speed, fast, slow, too fast, too slow, keep up, rushing");
        sb.AppendLine();
        sb.AppendLine("C3 – Engagement & Interaction");
        sb.AppendLine("  Issues: low interaction, boring sessions, few chances to ask questions or discuss");
        sb.AppendLine("  Keywords: interaction, engage, boring, ask questions, discuss, participation, interactive");
        sb.AppendLine();
        sb.AppendLine("C4 – Instructor Support");
        sb.AppendLine("  Issues: slow responses, lack of help, not answering questions, lack of guidance");
        sb.AppendLine("  Keywords: support, help, response, reply, answer, guidance, assist, respond");
        sb.AppendLine();
        sb.AppendLine("M1 – Materials & Resources Quality");
        sb.AppendLine("  Issues: slides, documents, examples, practice resources missing/low quality/hard to use");
        sb.AppendLine("  Keywords: materials, slides, documents, resources, handouts, examples, practice");
        sb.AppendLine();
        sb.AppendLine("A1 – Assessment & Workload Fairness");
        sb.AppendLine("  Issues: quizzes, exams, assignments, grading, workload, deadlines too heavy/unfair/unclear");
        sb.AppendLine("  Keywords: homework, assignment, workload, quiz, exam, grading, deadline, too much, stress");
        sb.AppendLine();
        sb.AppendLine("T1 – Technical / System Issues");
        sb.AppendLine("  Issues: LMS, platform, software, tools, links, files not working");
        sb.AppendLine("  Keywords: LMS, platform, system, software, link, file, technical, not working, broken");
        sb.AppendLine();
        sb.AppendLine("F1 – Facilities / Classroom Environment");
        sb.AppendLine("  Issues: temperature, noise, projector, audio, seating, wifi, physical classroom issues");
        sb.AppendLine("  Keywords: room, temperature, hot, cold, projector, wifi, facility, equipment, noise, seating");
        sb.AppendLine();
        sb.AppendLine("=== FEEDBACK DATA ===");
        
        // Build questions dynamically
        var questionDict = questions.ToDictionary(q => q.Id, q => q);
        var sortedAnswers = answers.OrderBy(kvp => 
        {
            var question = questionDict.GetValueOrDefault(kvp.Key);
            return question?.OrderIndex ?? int.MaxValue;
        });
        
        int questionNum = 1;
        foreach (var kvp in sortedAnswers)
        {
            var question = questionDict.GetValueOrDefault(kvp.Key);
            var questionText = question?.QuestionText ?? $"Question {kvp.Key}";
            sb.AppendLine($"Q{questionNum} ({questionText}): {kvp.Value}/4");
            questionNum++;
        }
        
        sb.AppendLine($"Satisfaction Score: {satisfactionScore:F2}/1.00");
        
        if (!string.IsNullOrWhiteSpace(freeText))
        {
            sb.AppendLine($"Free Text Comment: {freeText}");
        }
        else
        {
            sb.AppendLine("Free Text Comment: (none)");
        }
        
        sb.AppendLine();
        sb.AppendLine("=== ANALYSIS RULES ===");
        sb.AppendLine("1. Use BOTH ratings and free text to determine category_code, sentiment, and urgency.");
        sb.AppendLine("2. Sentiment rules:");
        sb.AppendLine("   - 'Negative' if satisfaction_score < 0.4 OR any answer = 1 (Not Satisfied)");
        sb.AppendLine("   - 'Positive' if satisfaction_score > 0.7 AND no negative issues in comments");
        sb.AppendLine("   - 'Neutral' otherwise");
        sb.AppendLine("3. Urgency rules:");
        sb.AppendLine("   - Low satisfaction (< 0.4) + negative text → urgency 6-8");
        sb.AppendLine("   - Very low satisfaction (< 0.25) → urgency 7-9");
        sb.AppendLine("   - Pure praise / no issue → urgency 0-1");
        sb.AppendLine("   - Critical issues → urgency 8-10");
        sb.AppendLine("4. Category selection:");
        sb.AppendLine("   - Choose the category that BEST matches the MAIN issue");
        sb.AppendLine("   - If multiple issues, pick the MOST PROMINENT one");
        sb.AppendLine("   - If satisfaction < 0.4, DO NOT classify as positive");
        sb.AppendLine("5. Reason: Provide a short 1-2 sentence explanation for the category choice.");
        sb.AppendLine("6. Keywords: Extract 3-7 key terms from the feedback.");
        sb.AppendLine("7. Suggestions: Provide 1-3 actionable improvement suggestions.");
        sb.AppendLine();
        sb.AppendLine("=== EXAMPLES ===");
        sb.AppendLine("Example 1:");
        sb.AppendLine("  Ratings: All 1/4 (Not Satisfied), Satisfaction: 0.20");
        sb.AppendLine("  Comment: \"I don't understand, homework difficult for me\"");
        sb.AppendLine("  Expected: category_code=\"A1\", sentiment=\"Negative\", urgency=7-8");
        sb.AppendLine();
        sb.AppendLine("Example 2:");
        sb.AppendLine("  Ratings: Q1=1, Q2=2, Satisfaction: 0.30");
        sb.AppendLine("  Comment: \"Teach dont understant\" (typo: don't understand)");
        sb.AppendLine("  Expected: category_code=\"C1\", sentiment=\"Negative\", urgency=6-7");
        sb.AppendLine();
        sb.AppendLine("Example 3:");
        sb.AppendLine("  Ratings: All 4/4, Satisfaction: 0.90");
        sb.AppendLine("  Comment: \"Great course, very helpful\"");
        sb.AppendLine("  Expected: category_code=\"C1\" (best fit), sentiment=\"Positive\", urgency=0-1");
        sb.AppendLine();
        sb.AppendLine("=== CRITICAL REQUIREMENTS ===");
        sb.AppendLine("1. Return ONLY valid JSON - no markdown, no code fences (```), no explanations, no additional text");
        sb.AppendLine("2. Use EXACT property names as shown in schema (snake_case: category_code, sentiment_score, main_issue, etc.)");
        sb.AppendLine("3. category_code MUST be exactly one of: C1, C2, C3, C4, M1, A1, T1, F1");
        sb.AppendLine("4. keywords MUST be a non-empty array with 3-7 strings");
        sb.AppendLine("5. suggestions MUST be a non-empty array with 1-3 actionable improvement suggestions");
        sb.AppendLine("6. reason MUST be a non-empty string (1-2 sentences)");
        sb.AppendLine("7. All numeric fields must be valid numbers (not strings)");
        sb.AppendLine("8. All string fields must be properly escaped JSON strings");
        sb.AppendLine();
        sb.AppendLine("=== VALIDATION CHECKLIST ===");
        sb.AppendLine("Before returning, verify:");
        sb.AppendLine("- JSON is valid and parseable");
        sb.AppendLine("- All required fields are present");
        sb.AppendLine("- keywords array has at least 3 items");
        sb.AppendLine("- suggestions array has at least 1 item");
        sb.AppendLine("- reason is not empty");
        sb.AppendLine("- category_code is one of the 8 valid codes");
        sb.AppendLine();
        sb.AppendLine("Now analyze the feedback above and return ONLY the JSON object (no other text):");

        return sb.ToString();
    }

    private AiAnalysisResult SanitizeResult(AiAnalysisResult result)
    {
        // Ensure values are within valid ranges
        var sentiment = result.Sentiment;
        if (sentiment != "Positive" && sentiment != "Neutral" && sentiment != "Negative")
        {
            sentiment = "Neutral";
        }

        var sentimentScore = result.SentimentScore;
        if (sentimentScore < -1.0m) sentimentScore = -1.0m;
        if (sentimentScore > 1.0m) sentimentScore = 1.0m;

        var urgency = result.Urgency;
        if (urgency < 0) urgency = 0;
        if (urgency > 10) urgency = 10;

        // Ensure keywords and suggestions are never null
        var keywords = result.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Take(10).ToList() ?? new List<string>();
        var suggestions = result.Suggestions?.Where(s => !string.IsNullOrWhiteSpace(s)).Take(3).ToList() ?? new List<string>();
        
        // Fallback: Generate keywords if empty
        if (keywords.Count == 0 && !string.IsNullOrWhiteSpace(result.MainIssue))
        {
            _logger?.LogInformation("No keywords from AI, extracting from MainIssue/Reason");
            keywords = ExtractKeywordsFromText(result.MainIssue, result.Reason);
            _logger?.LogInformation("Extracted {Count} keywords from text", keywords.Count);
        }
        
        // Fallback: Generate suggestions from keywords if AI didn't provide any
        if (suggestions.Count == 0)
        {
            _logger?.LogInformation("No suggestions from AI, generating from keywords/text");
            suggestions = GenerateSuggestionsFromKeywords(keywords, result.MainIssue, result.Reason);
            _logger?.LogInformation("Generated {Count} fallback suggestions", suggestions.Count);
        }

        var mainIssue = result.MainIssue;
        if (string.IsNullOrWhiteSpace(mainIssue))
        {
            // Use Reason if available, otherwise default
            mainIssue = result.Reason ?? (sentiment == "Positive" ? "None" : "General concern");
        }
        if (mainIssue.Length > 500)
        {
            mainIssue = mainIssue.Substring(0, 500);
        }

        // Validate and normalize category_code (new 8-category system)
        var categoryCode = result.CategoryCode;
        var categoryName = result.CategoryName;
        var issueCategory = result.IssueCategory;
        
        // Valid 8-category codes
        var validCodes = new[] { "C1", "C2", "C3", "C4", "M1", "A1", "T1", "F1" };
        
        // If category_code is provided and valid, use it
        if (!string.IsNullOrWhiteSpace(categoryCode) && 
            validCodes.Contains(categoryCode.ToUpperInvariant()))
        {
            var normalizedCode = categoryCode.ToUpperInvariant();
            issueCategory = normalizedCode; // Store code in IssueCategory field for backward compatibility
            
            // If category_name is missing, try to get it from IssueCategoryInfo
            if (string.IsNullOrWhiteSpace(categoryName))
            {
                var categoryEnum = FJAP.vn.fpt.edu.models.IssueCategoryInfo.FromCode(normalizedCode);
                if (categoryEnum != FJAP.vn.fpt.edu.models.IssueCategory.Unknown)
                {
                    categoryName = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetName(categoryEnum);
                }
            }
        }
        // If category_code is invalid or missing, try to map from old issue_category
        else if (!string.IsNullOrWhiteSpace(issueCategory))
        {
            // Try to map old category to new code (for backward compatibility)
            var mappedCode = MapOldCategoryToNewCode(issueCategory);
            if (!string.IsNullOrWhiteSpace(mappedCode))
            {
                categoryCode = mappedCode;
                issueCategory = mappedCode;
                var categoryEnum = FJAP.vn.fpt.edu.models.IssueCategoryInfo.FromCode(mappedCode);
                if (categoryEnum != FJAP.vn.fpt.edu.models.IssueCategory.Unknown)
                {
                    categoryName = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetName(categoryEnum);
                }
            }
            else
            {
                // If old category doesn't map, validate it's still a valid old category
                if (!FJAP.vn.fpt.edu.models.FeedbackIssueCategory.IsValid(issueCategory))
                {
                    issueCategory = null;
                }
            }
        }
        
        // If still no valid category, try pattern-based classification
        if (string.IsNullOrWhiteSpace(categoryCode) && string.IsNullOrWhiteSpace(issueCategory))
        {
            var patternCode = ClassifyByPattern(result.MainIssue, result.Reason);
            if (!string.IsNullOrWhiteSpace(patternCode))
            {
                categoryCode = patternCode;
                issueCategory = patternCode;
                var categoryEnum = FJAP.vn.fpt.edu.models.IssueCategoryInfo.FromCode(patternCode);
                if (categoryEnum != FJAP.vn.fpt.edu.models.IssueCategory.Unknown)
                {
                    categoryName = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetName(categoryEnum);
                }
            }
        }
        
        // Clamp confidence
        var confidence = result.Confidence;
        if (confidence.HasValue)
        {
            if (confidence.Value < 0.0m) confidence = 0.0m;
            if (confidence.Value > 1.0m) confidence = 1.0m;
        }

        return new AiAnalysisResult(
            sentiment,
            sentimentScore,
            keywords,
            suggestions,
            urgency,
            mainIssue,
            issueCategory ?? "UNK", // Default to UNK if still empty
            categoryCode,
            categoryName,
            confidence,
            result.Reason
        );
    }
    
    private string? MapOldCategoryToNewCode(string? oldCategory)
    {
        if (string.IsNullOrWhiteSpace(oldCategory)) return null;
        
        // Map old categories to new 8-category codes
        var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.TeachingQuality, "C1" },
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.AssessmentLoad, "A1" },
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.FacilityIssues, "F1" },
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.GradingFairness, "A1" }, // Assessment & Workload includes grading
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.ContentRelevance, "M1" }, // Materials & Resources
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.ContentDifficulty, "C1" }, // Teaching Clarity
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.Communication, "C4" }, // Instructor Support
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.ScheduleTiming, "C2" }, // Pacing (related to timing)
            { FJAP.vn.fpt.edu.models.FeedbackIssueCategory.ClassManagement, "C3" }, // Engagement & Interaction
        };
        
        return mapping.GetValueOrDefault(oldCategory);
    }

    private AiAnalysisResult GetDefaultAnalysis()
    {
        return new AiAnalysisResult(
            "Neutral",
            0.0m,
            new List<string>(),
            new List<string>(),
            0,
            "Analysis unavailable",
            "UNK", // Use UNK for Unknown
            "UNK",
            "Unknown",
            null,
            "AI analysis was not available"
        );
    }
    
    /// <summary>
    /// Generates fallback analysis from freeText when AI analysis fails
    /// </summary>
    private AiAnalysisResult GetFallbackAnalysis(string? freeText, decimal satisfactionScore)
    {
        _logger?.LogInformation("Generating fallback analysis from freeText. Satisfaction: {Score}", satisfactionScore);
        
        // Determine sentiment based on satisfaction score
        string sentiment = "Neutral";
        decimal sentimentScore = 0.0m;
        if (satisfactionScore < 0.4m)
        {
            sentiment = "Negative";
            sentimentScore = -0.5m - (0.4m - satisfactionScore) * 0.5m; // Scale from -0.5 to -0.9
        }
        else if (satisfactionScore > 0.7m)
        {
            sentiment = "Positive";
            sentimentScore = 0.5m + (satisfactionScore - 0.7m) * 1.67m; // Scale from 0.5 to 1.0
        }
        
        // Calculate urgency based on satisfaction
        int urgency = 0;
        if (satisfactionScore < 0.25m)
        {
            urgency = 8;
        }
        else if (satisfactionScore < 0.4m)
        {
            urgency = 6;
        }
        else if (satisfactionScore < 0.6m)
        {
            urgency = 4;
        }
        
        // Extract keywords and generate suggestions from freeText
        var keywords = ExtractKeywordsFromText(null, freeText);
        var suggestions = GenerateSuggestionsFromKeywords(keywords, null, freeText);
        
        // Generate mainIssue from freeText
        string mainIssue;
        string reason;
        if (!string.IsNullOrWhiteSpace(freeText))
        {
            mainIssue = freeText.Length > 200 ? freeText.Substring(0, 200).Trim() + "..." : freeText.Trim();
            reason = $"Analysis generated from feedback: {mainIssue}";
        }
        else
        {
            mainIssue = satisfactionScore < 0.4m ? "Low satisfaction reported" : "General feedback";
            reason = "No specific feedback text provided";
        }
        
        // Classify category from text
        var categoryCode = ClassifyByPattern(mainIssue, freeText) ?? "UNK";
        var categoryEnum = IssueCategoryInfo.FromCode(categoryCode);
        var categoryName = categoryEnum != IssueCategory.Unknown 
            ? IssueCategoryInfo.GetName(categoryEnum) 
            : "Unknown";
        
        _logger?.LogInformation("Fallback analysis generated - Sentiment: {Sentiment}, Category: {Category}, Keywords: {KeywordsCount}, Suggestions: {SuggestionsCount}", 
            sentiment, categoryCode, keywords.Count, suggestions.Count);
        
        return new AiAnalysisResult(
            sentiment,
            sentimentScore,
            keywords,
            suggestions,
            urgency,
            mainIssue,
            categoryCode,
            categoryCode,
            categoryName,
            0.5m, // Low confidence for fallback
            reason
        );
    }
    
    /// <summary>
    /// Generates suggestions from keywords if AI didn't provide suggestions
    /// </summary>
    private List<string> GenerateSuggestionsFromKeywords(List<string>? keywords, string? mainIssue, string? freeText)
    {
        var suggestions = new List<string>();
        
        if (keywords == null || keywords.Count == 0)
        {
            // Try to extract keywords from text
            keywords = ExtractKeywordsFromText(mainIssue, freeText);
        }
        
        if (keywords != null && keywords.Count > 0)
        {
            var lowerKeywords = keywords.Select(k => k.ToLowerInvariant()).ToList();
            
            // Generate suggestions based on keywords
            if (lowerKeywords.Any(k => k.Contains("homework") || k.Contains("assignment") || k.Contains("workload")))
            {
                suggestions.Add("Consider reducing assignment frequency or breaking large tasks into smaller parts");
                suggestions.Add("Provide clearer instructions and expectations for assignments");
            }
            
            if (lowerKeywords.Any(k => k.Contains("understand") || k.Contains("clear") || k.Contains("explain")))
            {
                suggestions.Add("Provide more examples and step-by-step explanations");
                suggestions.Add("Use visual aids or diagrams to enhance understanding");
            }
            
            if (lowerKeywords.Any(k => k.Contains("pace") || k.Contains("fast") || k.Contains("slow")))
            {
                suggestions.Add("Adjust teaching pace based on student feedback");
                suggestions.Add("Provide review sessions for complex topics");
            }
            
            if (lowerKeywords.Any(k => k.Contains("support") || k.Contains("help") || k.Contains("response")))
            {
                suggestions.Add("Improve response time to student questions");
                suggestions.Add("Schedule regular office hours or Q&A sessions");
            }
            
            if (lowerKeywords.Any(k => k.Contains("material") || k.Contains("slide") || k.Contains("resource")))
            {
                suggestions.Add("Enhance learning materials with more examples and practice exercises");
                suggestions.Add("Ensure all materials are accessible and well-organized");
            }
        }
        
        // If still no suggestions, add generic ones
        if (suggestions.Count == 0)
        {
            suggestions.Add("Review feedback and address the main concerns raised");
            suggestions.Add("Consider implementing improvements based on student input");
        }
        
        return suggestions.Take(3).ToList();
    }
    
    /// <summary>
    /// Extracts keywords from text for fallback suggestions
    /// </summary>
    private List<string> ExtractKeywordsFromText(string? mainIssue, string? freeText)
    {
        var keywords = new List<string>();
        var combinedText = $"{mainIssue} {freeText}".ToLowerInvariant();
        
        if (string.IsNullOrWhiteSpace(combinedText))
            return keywords;
        
        // Common keywords to look for
        var keywordPatterns = new[]
        {
            "homework", "assignment", "workload", "stress", "difficult", "hard",
            "understand", "clear", "explain", "confusing", "unclear",
            "pace", "fast", "slow", "speed",
            "support", "help", "response", "reply",
            "material", "slide", "resource", "document",
            "projector", "temperature", "facility", "equipment",
            "lms", "platform", "system", "technical"
        };
        
        foreach (var pattern in keywordPatterns)
        {
            if (combinedText.Contains(pattern) && !keywords.Contains(pattern))
            {
                keywords.Add(pattern);
            }
        }
        
        return keywords;
    }

    private string? ClassifyByPattern(string? mainIssue, string? freeText)
    {
        if (string.IsNullOrWhiteSpace(mainIssue) && string.IsNullOrWhiteSpace(freeText))
        {
            return null;
        }

        var combinedText = $"{mainIssue} {freeText}".ToLowerInvariant();

        // Pattern matching with priority order - return new 8-category codes (C1..F1)
        
        // A1 – Assessment & Workload Fairness
        if (combinedText.Contains("workload") || combinedText.Contains("too much") || 
            combinedText.Contains("homework") || combinedText.Contains("assignment") ||
            combinedText.Contains("stress") || combinedText.Contains("overwhelm") ||
            combinedText.Contains("too many") || 
            (combinedText.Contains("difficult") && 
             (combinedText.Contains("homework") || combinedText.Contains("assignment") || combinedText.Contains("workload"))) ||
            combinedText.Contains("grading") || combinedText.Contains("rubric") ||
            combinedText.Contains("policy") || combinedText.Contains("unfair") ||
            combinedText.Contains("evaluation") || combinedText.Contains("score") ||
            combinedText.Contains("mark") || combinedText.Contains("deadline"))
        {
            return "A1";
        }

        // C1 – Teaching Clarity
        if (combinedText.Contains("explain") || combinedText.Contains("explanation") ||
            combinedText.Contains("dont understand") || combinedText.Contains("don't understand") ||
            combinedText.Contains("do not understand") || combinedText.Contains("cannot understand") ||
            combinedText.Contains("can't understand") || combinedText.Contains("not understand") ||
            combinedText.Contains("not clear") || combinedText.Contains("not clear enough") ||
            combinedText.Contains("confusing") || combinedText.Contains("confused") ||
            combinedText.Contains("unclear") || combinedText.Contains("understant") || // typo
            (combinedText.Contains("teaching") || combinedText.Contains("lecturer") || combinedText.Contains("teacher")) &&
            (combinedText.Contains("not clear") || combinedText.Contains("unclear") || combinedText.Contains("confusing")))
        {
            return "C1";
        }

        // C2 – Pacing
        if (combinedText.Contains("pace") || combinedText.Contains("fast") || 
            combinedText.Contains("slow") || combinedText.Contains("speed") ||
            combinedText.Contains("too fast") || combinedText.Contains("too slow") ||
            combinedText.Contains("keep up") || combinedText.Contains("rushing") ||
            combinedText.Contains("schedule") || combinedText.Contains("time") ||
            combinedText.Contains("conflict") || combinedText.Contains("duration"))
        {
            return "C2";
        }

        // C3 – Engagement & Interaction
        if (combinedText.Contains("interaction") || combinedText.Contains("engage") ||
            combinedText.Contains("boring") || combinedText.Contains("ask questions") ||
            combinedText.Contains("discuss") || combinedText.Contains("participation") ||
            combinedText.Contains("interactive") || combinedText.Contains("no interaction"))
        {
            return "C3";
        }

        // C4 – Instructor Support
        if (combinedText.Contains("support") || combinedText.Contains("help") ||
            combinedText.Contains("response") || combinedText.Contains("reply") ||
            combinedText.Contains("answer") || combinedText.Contains("guidance") ||
            combinedText.Contains("assist") || combinedText.Contains("respond") ||
            combinedText.Contains("not answering") || combinedText.Contains("slow response") ||
            combinedText.Contains("communication"))
        {
            return "C4";
        }

        // M1 – Materials & Resources Quality
        if (combinedText.Contains("materials") || combinedText.Contains("slides") ||
            combinedText.Contains("documents") || combinedText.Contains("resources") ||
            combinedText.Contains("handouts") || combinedText.Contains("examples") ||
            combinedText.Contains("practice") || combinedText.Contains("missing") ||
            (combinedText.Contains("real") || combinedText.Contains("practical")) && 
            (combinedText.Contains("project") || combinedText.Contains("example") || combinedText.Contains("case")))
        {
            return "M1";
        }

        // T1 – Technical / System Issues
        if (combinedText.Contains("lms") || combinedText.Contains("platform") ||
            combinedText.Contains("system") || combinedText.Contains("software") ||
            combinedText.Contains("link") || combinedText.Contains("file") ||
            combinedText.Contains("technical") || combinedText.Contains("not working") ||
            combinedText.Contains("broken") || combinedText.Contains("cannot open") ||
            combinedText.Contains("can't open") || combinedText.Contains("tool"))
        {
            return "T1";
        }

        // F1 – Facilities / Classroom Environment
        if (combinedText.Contains("projector") || combinedText.Contains("temperature") ||
            combinedText.Contains("hot") || combinedText.Contains("cold") ||
            combinedText.Contains("facility") || combinedText.Contains("equipment") ||
            combinedText.Contains("wifi") || combinedText.Contains("room") ||
            combinedText.Contains("noise") || combinedText.Contains("seating") ||
            combinedText.Contains("audio") || combinedText.Contains("classroom"))
        {
            return "F1";
        }

        return null; // Return null if no pattern matches
    }

    /// <summary>
    /// Normalizes JSON property names from snake_case to camelCase for better deserialization
    /// </summary>
    private string NormalizeJsonPropertyNames(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        // Common property name mappings
        var replacements = new Dictionary<string, string>
        {
            { "\"category_code\"", "\"categoryCode\"" },
            { "\"category_name\"", "\"categoryName\"" },
            { "\"sentiment_score\"", "\"sentimentScore\"" },
            { "\"main_issue\"", "\"mainIssue\"" },
            { "\"issue_category\"", "\"issueCategory\"" }
        };

        var normalized = json;
        foreach (var kvp in replacements)
        {
            normalized = System.Text.RegularExpressions.Regex.Replace(
                normalized,
                kvp.Key,
                kvp.Value,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        }

        return normalized;
    }
}

