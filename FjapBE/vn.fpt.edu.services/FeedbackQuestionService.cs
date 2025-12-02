using System.Linq;
using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace FJAP.Services;

public class FeedbackQuestionService : IFeedbackQuestionService
{
    private readonly IFeedbackQuestionRepository _questionRepository;
    private readonly ILogger<FeedbackQuestionService>? _logger;

    public FeedbackQuestionService(
        IFeedbackQuestionRepository questionRepository,
        ILogger<FeedbackQuestionService>? logger = null)
    {
        _questionRepository = questionRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<FeedbackQuestionDto>> GetActiveQuestionsAsync(int? subjectId = null)
    {
        var questions = await _questionRepository.GetActiveQuestionsAsync(subjectId);
        return questions.Select(MapToDto);
    }

    public async Task<IEnumerable<FeedbackQuestionDto>> GetAllQuestionsAsync()
    {
        var questions = await _questionRepository.GetAllQuestionsAsync();
        return questions.Select(MapToDto);
    }

    public async Task<FeedbackQuestionDto> CreateQuestionAsync(CreateFeedbackQuestionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.QuestionText))
        {
            throw new ArgumentException("Question text is required");
        }

        if (request.QuestionText.Length > 500)
        {
            throw new ArgumentException("Question text must not exceed 500 characters");
        }

        // Auto-calculate OrderIndex: max(OrderIndex) + 1, or 1 if no questions exist
        var allQuestions = await _questionRepository.GetAllQuestionsAsync();
        var maxOrderIndex = allQuestions.Any() ? Math.Max(0, allQuestions.Max(q => q.OrderIndex)) : 0;
        var newOrderIndex = maxOrderIndex + 1;
        
        // Ensure OrderIndex starts from 1, not 0
        if (newOrderIndex < 1)
        {
            newOrderIndex = 1;
        }

        // Set default answer options if not provided
        List<AnswerOptionDto> answerOptions = request.AnswerOptions ?? GetDefaultAnswerOptions();

        // Validate answer options
        ValidateAnswerOptions(answerOptions);

        var question = new FeedbackQuestion
        {
            QuestionText = request.QuestionText.Trim(),
            EvaluationLabel = string.IsNullOrWhiteSpace(request.EvaluationLabel) ? null : request.EvaluationLabel.Trim(),
            OrderIndex = newOrderIndex,
            SubjectId = null, // Always null - questions are shared across all subjects
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        // TODO: SetAnswerOptionsList - extension method not implemented
        // question.SetAnswerOptionsList(answerOptions);

        await _questionRepository.AddAsync(question);
        await _questionRepository.SaveChangesAsync();

        // Reload to get fresh data
        var reloaded = await _questionRepository.GetAllQuestionsAsync();
        var created = reloaded.FirstOrDefault(q => q.Id == question.Id);
        
        return created != null ? MapToDto(created) : MapToDto(question);
    }

    public async Task<FeedbackQuestionDto?> UpdateQuestionAsync(int id, UpdateFeedbackQuestionRequest request)
    {
        var question = await _questionRepository.GetByIdAsync(id);
        if (question == null) return null;

        if (request.QuestionText != null)
        {
            if (string.IsNullOrWhiteSpace(request.QuestionText))
            {
                throw new ArgumentException("Question text cannot be empty");
            }
            if (request.QuestionText.Length > 500)
            {
                throw new ArgumentException("Question text must not exceed 500 characters");
            }
            question.QuestionText = request.QuestionText.Trim();
        }

        if (request.EvaluationLabel != null)
        {
            if (request.EvaluationLabel.Length > 200)
            {
                throw new ArgumentException("Evaluation label must not exceed 200 characters");
            }
            question.EvaluationLabel = string.IsNullOrWhiteSpace(request.EvaluationLabel) ? null : request.EvaluationLabel.Trim();
        }

        // OrderIndex is auto-managed, don't allow manual update
        // SubjectId is always null, don't allow update

        if (request.IsActive.HasValue)
        {
            question.IsActive = request.IsActive.Value;
        }

        // Update answer options if provided
        if (request.AnswerOptions != null)
        {
            ValidateAnswerOptions(request.AnswerOptions);
            // TODO: SetAnswerOptionsList - extension method not implemented
            // question.SetAnswerOptionsList(request.AnswerOptions);
        }

        // Always keep SubjectId as null
        question.SubjectId = null;

        question.UpdatedAt = DateTime.UtcNow;

        _questionRepository.Update(question);
        await _questionRepository.SaveChangesAsync();

        // Reload to get fresh data
        var reloaded = await _questionRepository.GetAllQuestionsAsync();
        var updated = reloaded.FirstOrDefault(q => q.Id == id);
        
        return updated != null ? MapToDto(updated) : MapToDto(question);
    }

    public async Task<bool> DeleteQuestionAsync(int id)
    {
        var question = await _questionRepository.GetByIdAsync(id);
        if (question == null) return false;

        // Hard delete: remove from database
        _questionRepository.Remove(question);
        await _questionRepository.SaveChangesAsync();

        return true;
    }

    private FeedbackQuestionDto MapToDto(FeedbackQuestion question)
    {
        return new FeedbackQuestionDto(
            question.Id,
            question.QuestionText,
            question.EvaluationLabel,
            question.OrderIndex,
            question.IsActive ?? false,
            question.SubjectId,
            question.Subject?.SubjectCode,
            question.Subject?.SubjectName,
            // TODO: GetAnswerOptionsList - extension method not implemented
            new List<AnswerOptionDto>(),
            question.CreatedAt,
            question.UpdatedAt
        );
    }

    private List<AnswerOptionDto> GetDefaultAnswerOptions()
    {
        return new List<AnswerOptionDto>
        {
            new AnswerOptionDto(1, "Not Satisfied", "FrownOutlined", "#ff4d4f"),
            new AnswerOptionDto(2, "Neutral", "MehOutlined", "#faad14"),
            new AnswerOptionDto(3, "Satisfied", "SmileOutlined", "#52c41a"),
            new AnswerOptionDto(4, "Very Satisfied", "HeartOutlined", "#1890ff")
        };
    }

    private void ValidateAnswerOptions(List<AnswerOptionDto> options)
    {
        if (options == null || !options.Any())
        {
            throw new ArgumentException("Answer options cannot be empty");
        }

        foreach (var option in options)
        {
            if (option.Value < 1)
            {
                throw new ArgumentException($"Answer option value must be >= 1, got {option.Value}");
            }
            if (string.IsNullOrWhiteSpace(option.Label))
            {
                throw new ArgumentException("Answer option label is required");
            }
            if (string.IsNullOrWhiteSpace(option.Icon))
            {
                throw new ArgumentException("Answer option icon is required");
            }
            if (string.IsNullOrWhiteSpace(option.Color))
            {
                throw new ArgumentException("Answer option color is required");
            }
        }

        // Check for duplicate values
        var values = options.Select(o => o.Value).ToList();
        if (values.Count != values.Distinct().Count())
        {
            throw new ArgumentException("Answer option values must be unique");
        }
    }
}

