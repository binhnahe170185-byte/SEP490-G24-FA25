using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Ai;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace FJAP.Services;

public class DailyFeedbackService : IDailyFeedbackService
{
    private readonly IDailyFeedbackRepository _repository;
    private readonly IClassRepository _classRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DailyFeedbackService>? _logger;

    public DailyFeedbackService(
        IDailyFeedbackRepository repository,
        IClassRepository classRepository,
        ILessonRepository lessonRepository,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<DailyFeedbackService>? logger = null)
    {
        _repository = repository;
        _classRepository = classRepository;
        _lessonRepository = lessonRepository;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<DailyFeedbackDto> CreateDailyFeedbackAsync(CreateDailyFeedbackRequest request)
    {
        // Validate required fields
        if (request.SubjectId <= 0)
        {
            throw new ArgumentException($"Invalid SubjectId: {request.SubjectId}. SubjectId must be greater than 0.");
        }

        // Validate lesson exists
        var lesson = await _lessonRepository.GetByIdAsync(request.LessonId);
        if (lesson == null)
        {
            throw new KeyNotFoundException($"Lesson with id {request.LessonId} not found");
        }

        // Validate class exists
        var classEntity = await _classRepository.GetByIdAsync(request.ClassId);
        if (classEntity == null)
        {
            throw new KeyNotFoundException($"Class with id {request.ClassId} not found");
        }

        // Validate subject exists (if we have access to subject repository)
        // Note: We'll rely on foreign key constraint for now, but validate SubjectId matches class
        if (classEntity.SubjectId > 0 && classEntity.SubjectId != request.SubjectId)
        {
            _logger?.LogWarning($"SubjectId mismatch: request.SubjectId={request.SubjectId}, class.SubjectId={classEntity.SubjectId}. Using class.SubjectId.");
            // Use class's SubjectId instead of request's to ensure consistency
            request = request with { SubjectId = classEntity.SubjectId };
        }

        // Check if student already submitted feedback for this lesson
        var existing = await _repository.GetByStudentAndLessonAsync(request.StudentId, request.LessonId);
        if (existing != null)
        {
            throw new InvalidOperationException("You have already submitted feedback for this lesson");
        }

        // Create new daily feedback
        var dailyFeedback = new DailyFeedback
        {
            StudentId = request.StudentId,
            LessonId = request.LessonId,
            ClassId = request.ClassId,
            SubjectId = request.SubjectId,
            FeedbackText = request.FeedbackText,
            FeedbackTextTranscript = request.FeedbackTextTranscript,
            Sentiment = "Neutral",
            Urgency = 0,
            Status = "New",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Analyze text with AI
        try
        {
            await AnalyzeTextAsync(dailyFeedback);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during AI analysis, continuing with default values");
            // Continue with default sentiment/urgency if AI analysis fails
            dailyFeedback.Sentiment = "Neutral";
            dailyFeedback.Urgency = 0;
        }

        try
        {
            await _repository.AddAsync(dailyFeedback);
            await _repository.SaveChangesAsync();
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
        {
            _logger?.LogError(dbEx, "Database error while saving daily feedback. StudentId={StudentId}, LessonId={LessonId}, ClassId={ClassId}, SubjectId={SubjectId}",
                request.StudentId, request.LessonId, request.ClassId, request.SubjectId);
            
            // Check inner exception for more details
            if (dbEx.InnerException != null)
            {
                _logger?.LogError("Inner exception: {InnerException}", dbEx.InnerException.Message);
                throw new InvalidOperationException($"Database error: {dbEx.InnerException.Message}", dbEx);
            }
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Unexpected error while saving daily feedback");
            throw;
        }

        // Reload with navigation properties for mapping
        var savedFeedback = await _repository.GetByIdWithDetailsAsync(dailyFeedback.Id);
        return MapToDto(savedFeedback ?? dailyFeedback);
    }

    public async Task<(IEnumerable<DailyFeedbackDto> Items, int Total)> GetStudentDailyFeedbacksAsync(int studentId, DailyFeedbackFilterRequest filter)
    {
        var feedbacks = await _repository.GetByStudentAsync(
            studentId,
            filter.ClassId,
            filter.DateFrom,
            filter.DateTo
        );

        var feedbackList = feedbacks.ToList();

        // Apply additional filters
        if (!string.IsNullOrWhiteSpace(filter.Sentiment))
        {
            feedbackList = feedbackList.Where(f => f.Sentiment == filter.Sentiment).ToList();
        }

        if (filter.Urgency.HasValue)
        {
            feedbackList = feedbackList.Where(f => f.Urgency >= filter.Urgency.Value).ToList();
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            feedbackList = feedbackList.Where(f => f.Status == filter.Status).ToList();
        }

        // Pagination
        var total = feedbackList.Count;
        var items = feedbackList
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(MapToDto);

        return (items, total);
    }

    public async Task<(IEnumerable<DailyFeedbackDto> Items, int Total)> GetClassDailyFeedbacksAsync(int classId, DailyFeedbackFilterRequest filter)
    {
        var feedbacks = await _repository.GetByClassAsync(
            classId,
            filter.LessonId,
            filter.DateFrom,
            filter.DateTo,
            filter.Sentiment,
            filter.Urgency,
            filter.Status
        );

        var feedbackList = feedbacks.ToList();

        // Pagination
        var total = feedbackList.Count;
        var items = feedbackList
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(MapToDto);

        return (items, total);
    }

    public async Task<(IEnumerable<DailyFeedbackDto> Items, int Total)> GetAllDailyFeedbacksAsync(DailyFeedbackFilterRequest filter)
    {
        var feedbacks = await _repository.GetAllAsync(
            filter.ClassId,
            filter.LessonId,
            filter.DateFrom,
            filter.DateTo,
            filter.Sentiment,
            filter.Urgency,
            filter.Status
        );

        var feedbackList = feedbacks.ToList();

        // Pagination
        var total = feedbackList.Count;
        var items = feedbackList
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(MapToDto);

        return (items, total);
    }

    public async Task<DailyFeedbackDto?> GetDailyFeedbackByIdAsync(int id)
    {
        var feedback = await _repository.GetByIdWithDetailsAsync(id);
        return feedback != null ? MapToDto(feedback) : null;
    }

    public async Task<bool> UpdateStatusAsync(int id, UpdateDailyFeedbackStatusRequest request)
    {
        var feedback = await _repository.GetByIdAsync(id);
        if (feedback == null)
        {
            return false;
        }

        feedback.Status = request.Status;
        feedback.UpdatedAt = DateTime.UtcNow;

        _repository.Update(feedback);
        await _repository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> HasFeedbackForLessonAsync(int studentId, int lessonId)
    {
        return await _repository.HasFeedbackForLessonAsync(studentId, lessonId);
    }

    private async Task AnalyzeTextAsync(DailyFeedback feedback)
    {
        try
        {
            var text = !string.IsNullOrWhiteSpace(feedback.FeedbackText)
                ? feedback.FeedbackText
                : feedback.FeedbackTextTranscript ?? "";

            if (string.IsNullOrWhiteSpace(text))
            {
                feedback.Sentiment = "Neutral";
                feedback.Urgency = 0;
                return;
            }

            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";
            var baseUrl = _configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger?.LogWarning("Gemini API key is missing, using default sentiment/urgency");
                feedback.Sentiment = "Neutral";
                feedback.Urgency = 0;
                return;
            }

            var prompt = $@"Analyze the following daily feedback text and return ONLY a JSON object with this exact structure:
{{
  ""sentiment"": ""Positive"" | ""Neutral"" | ""Negative"",
  ""urgency"": 0-10 (integer, where 0 = no urgency, 10 = critical)
}}

Feedback text: {text}

Return only the JSON object, no other text.";

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

            var response = await httpClient.PostAsync(url, content);
            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogError("Gemini API error {Status}: {Body}", response.StatusCode, responseText);
                feedback.Sentiment = "Neutral";
                feedback.Urgency = 0;
                return;
            }

            // Parse response
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
                _logger?.LogWarning("Gemini API returned empty message");
                feedback.Sentiment = "Neutral";
                feedback.Urgency = 0;
                return;
            }

            // Extract JSON from response (might have markdown code blocks)
            var jsonStart = message.IndexOf('{');
            var jsonEnd = message.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                message = message.Substring(jsonStart, jsonEnd - jsonStart + 1);
            }

            var resultDoc = JsonDocument.Parse(message);
            if (resultDoc.RootElement.TryGetProperty("sentiment", out var sentimentEl))
            {
                feedback.Sentiment = sentimentEl.GetString() ?? "Neutral";
            }

            if (resultDoc.RootElement.TryGetProperty("urgency", out var urgencyEl))
            {
                feedback.Urgency = urgencyEl.GetInt32();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error analyzing daily feedback text");
            feedback.Sentiment = "Neutral";
            feedback.Urgency = 0;
        }
    }

    private DailyFeedbackDto MapToDto(DailyFeedback feedback)
    {
        // Safely access navigation properties (they might be null if not loaded)
        var studentName = feedback.Student?.User != null
            ? $"{feedback.Student.User.FirstName} {feedback.Student.User.LastName}"
            : null;
        var studentCode = feedback.Student?.StudentCode;
        
        string? lessonDate = null;
        try
        {
            lessonDate = feedback.Lesson?.Date.ToString("yyyy-MM-dd");
        }
        catch
        {
            // Lesson might not be loaded
        }

        return new DailyFeedbackDto(
            feedback.Id,
            feedback.StudentId,
            studentName,
            studentCode,
            feedback.LessonId,
            lessonDate,
            feedback.ClassId,
            feedback.Class?.ClassName,
            feedback.SubjectId,
            feedback.Subject?.SubjectCode,
            feedback.Subject?.SubjectName,
            feedback.FeedbackText,
            feedback.FeedbackTextTranscript,
            feedback.Sentiment,
            feedback.Urgency,
            feedback.Status,
            feedback.CreatedAt,
            feedback.UpdatedAt
        );
    }
}

