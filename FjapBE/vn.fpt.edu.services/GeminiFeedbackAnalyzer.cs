using System.Net.Http;
using System.Text;
using System.Text.Json;
using FJAP.DTOs;
using FJAP.vn.fpt.edu.models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FJAP.Services.Ai;

/// <summary>
/// Dedicated analyzer that classifies feedback into the new fixed 8 categories (C1..F1)
/// and returns sentiment + urgency + short reason.
/// </summary>
public class GeminiFeedbackAnalyzer
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiFeedbackAnalyzer>? _logger;

    public GeminiFeedbackAnalyzer(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeminiFeedbackAnalyzer>? logger = null)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AiFeedbackAnalysisResult?> AnalyzeAsync(Feedback feedback, CancellationToken ct = default)
    {
        var apiKey = _configuration["Gemini:ApiKey"];
        var model = _configuration["Gemini:Model"] ?? "gemini-1.5-flash";
        var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger?.LogWarning("Gemini API key is missing, skip 8-category analysis");
            return null;
        }

        var prompt = BuildPrompt(feedback);

        var body = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            }
        };

        var httpClient = _httpClientFactory.CreateClient();
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var url = $"{baseUrl.TrimEnd('/')}/models/{model}:generateContent?key={apiKey}";

        var response = await httpClient.PostAsync(url, content, ct);
        var responseText = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger?.LogError("Gemini 8-category API error {Status}: {Body}", response.StatusCode, responseText);
            return null;
        }

        // Extract plain text from candidates
        var doc = JsonDocument.Parse(responseText);
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("candidates", out var candidates))
        {
            foreach (var cand in candidates.EnumerateArray())
            {
                if (cand.TryGetProperty("content", out var contentEl) &&
                    contentEl.TryGetProperty("parts", out var parts))
                {
                    foreach (var part in parts.EnumerateArray())
                    {
                        if (part.TryGetProperty("text", out var textEl))
                        {
                            sb.Append(textEl.GetString());
                        }
                    }
                }
            }
        }

        var message = sb.ToString();
        if (string.IsNullOrWhiteSpace(message))
        {
            _logger?.LogWarning("Gemini 8-category API returned empty message text");
            return null;
        }

        var extractedJson = ExtractJson(message);
        _logger?.LogInformation("Gemini 8-category extracted JSON: {Json}", extractedJson);

        try
        {
            using var jsonDoc = JsonDocument.Parse(extractedJson);
            var root = jsonDoc.RootElement;

            string code = root.GetProperty("category_code").GetString() ?? "UNK";
            string name = root.GetProperty("category_name").GetString() ?? "Unknown";
            var categoryEnum = IssueCategoryInfo.FromCode(code);

            double confidence = root.TryGetProperty("confidence", out var cEl) && cEl.ValueKind == JsonValueKind.Number
                ? cEl.GetDouble()
                : 0.0;

            int urgency = root.TryGetProperty("urgency", out var uEl) && uEl.ValueKind == JsonValueKind.Number
                ? uEl.GetInt32()
                : 0;

            string reason = root.TryGetProperty("reason", out var rEl)
                ? (rEl.GetString() ?? string.Empty)
                : string.Empty;

            string sentiment = root.TryGetProperty("sentiment", out var sEl)
                ? (sEl.GetString() ?? "Neutral")
                : "Neutral";

            double? sentimentScore = null;
            if (root.TryGetProperty("sentiment_score", out var ssEl) && ssEl.ValueKind == JsonValueKind.Number)
            {
                sentimentScore = ssEl.GetDouble();
            }

            return new AiFeedbackAnalysisResult(
                code,
                name,
                categoryEnum,
                confidence,
                urgency,
                reason,
                sentiment,
                sentimentScore
            );
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to parse 8-category JSON from Gemini response. Raw: {Raw}", message);
            return null;
        }
    }

    private string BuildPrompt(Feedback feedback)
    {
        var answers = feedback.GetAnswersDict() ?? new Dictionary<int, int>();

        // NOTE: Map your actual question IDs to Q1..Q5 here.
        int q1 = answers.GetValueOrDefault(2);   // Teaching Clarity
        int q2 = answers.GetValueOrDefault(3);   // Pacing
        int q3 = answers.GetValueOrDefault(13);  // Materials & Resources
        int q4 = answers.GetValueOrDefault(14);  // Assessment & Workload
        int q5 = answers.GetValueOrDefault(15);  // Instructor Support

        var sb = new StringBuilder();
        sb.AppendLine("You are an assistant that analyzes student course feedback at the CLASS level.");
        sb.AppendLine();
        sb.AppendLine("The feedback contains:");
        sb.AppendLine("- 5 rating questions with a 1-4 scale (1=Strongly Disagree, 4=Strongly Agree).");
        sb.AppendLine("- A free-text comment (possibly in Vietnamese or English).");
        sb.AppendLine($"- A precomputed satisfaction_score between 0.0 and 1.0 (current value: {feedback.SatisfactionScore:0.00}).");
        sb.AppendLine();
        sb.AppendLine("Rating questions:");
        sb.AppendLine("Q1 – Teaching Clarity");
        sb.AppendLine("Q2 – Pacing");
        sb.AppendLine("Q3 – Materials & Resources Quality");
        sb.AppendLine("Q4 – Assessment & Workload Fairness");
        sb.AppendLine("Q5 – Instructor Support");
        sb.AppendLine();
        sb.AppendLine("Issue categories (choose ONE main category):");
        sb.AppendLine("- C1 Teaching Clarity: issues about unclear explanations, confusing lectures, lack of examples.");
        sb.AppendLine("- C2 Pacing: issues about the speed of teaching being too fast or too slow.");
        sb.AppendLine("- C3 Engagement & Interaction: issues about low interaction, boring sessions, few chances to ask questions or discuss.");
        sb.AppendLine("- C4 Instructor Support: issues about slow responses, lack of help, not answering questions, lack of guidance.");
        sb.AppendLine("- M1 Materials & Resources Quality: issues about slides, handouts, documents, examples, practice resources being missing, low quality, or hard to use.");
        sb.AppendLine("- A1 Assessment & Workload Fairness: issues about quizzes, exams, assignments, grading, workload, deadlines being too heavy, unfair or unclear.");
        sb.AppendLine("- T1 Technical / System Issues: issues about LMS, platform, software, links, files, online tools not working.");
        sb.AppendLine("- F1 Facilities / Classroom Environment: issues about classroom environment such as temperature, noise, projector, audio, seating, wifi, physical space.");
        sb.AppendLine();
        sb.AppendLine("Feedback data:");
        sb.AppendLine($"Q1 (Teaching Clarity): {q1}/4");
        sb.AppendLine($"Q2 (Pacing): {q2}/4");
        sb.AppendLine($"Q3 (Materials & Resources): {q3}/4");
        sb.AppendLine($"Q4 (Assessment & Workload): {q4}/4");
        sb.AppendLine($"Q5 (Instructor Support): {q5}/4");
        sb.AppendLine($"satisfaction_score: {feedback.SatisfactionScore:0.00}");
        sb.AppendLine($"free_text: {feedback.FreeText ?? "(none)"}");
        sb.AppendLine();
        sb.AppendLine("Return ONLY a valid JSON object with this schema:");
        sb.AppendLine("{");
        sb.AppendLine("  \"category_code\": \"C1|C2|C3|C4|M1|A1|T1|F1\",");
        sb.AppendLine("  \"category_name\": \"string\",");
        sb.AppendLine("  \"confidence\": 0.0-1.0,");
        sb.AppendLine("  \"urgency\": 0-10,");
        sb.AppendLine("  \"reason\": \"string\",");
        sb.AppendLine("  \"sentiment\": \"Positive\"|\"Neutral\"|\"Negative\",");
        sb.AppendLine("  \"sentiment_score\": -1.0 to 1.0");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static string ExtractJson(string text)
    {
        var s = text;
        if (s.Contains("```json"))
        {
            var startIdx = s.IndexOf("```json", StringComparison.Ordinal) + 7;
            var endIdx = s.IndexOf("```", startIdx, StringComparison.Ordinal);
            if (endIdx > startIdx)
            {
                s = s.Substring(startIdx, endIdx - startIdx);
            }
        }
        else if (s.Contains("```"))
        {
            var startIdx = s.IndexOf("```", StringComparison.Ordinal) + 3;
            var endIdx = s.IndexOf("```", startIdx, StringComparison.Ordinal);
            if (endIdx > startIdx)
            {
                s = s.Substring(startIdx, endIdx - startIdx);
            }
        }

        var jsonStart = s.IndexOf('{');
        var jsonEnd = s.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
        {
            s = s.Substring(jsonStart, jsonEnd - jsonStart + 1);
        }

        return s.Trim();
    }
}


