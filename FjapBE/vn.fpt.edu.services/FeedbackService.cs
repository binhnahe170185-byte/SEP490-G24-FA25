using System.Collections.Generic;
using System.Linq;
using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Ai;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FJAP.Services;

public class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IFeedbackQuestionService _questionService;
    private readonly IAiAnalysisService _aiAnalysisService;
    private readonly INotificationService _notificationService;
    private readonly IClassRepository _classRepository;
    private readonly FjapDbContext _context;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly GeminiFeedbackAnalyzer _geminiFeedbackAnalyzer;
    private readonly IFeedbackTextAnalysisService _textAnalysisService;
    private readonly ILogger<FeedbackService>? _logger;

    public FeedbackService(
        IFeedbackRepository feedbackRepository,
        IFeedbackQuestionService questionService,
        IAiAnalysisService aiAnalysisService,
        INotificationService notificationService,
        IClassRepository classRepository,
        FjapDbContext context,
        IServiceScopeFactory serviceScopeFactory,
        GeminiFeedbackAnalyzer geminiFeedbackAnalyzer,
        IFeedbackTextAnalysisService textAnalysisService,
        ILogger<FeedbackService>? logger = null)
    {
        _feedbackRepository = feedbackRepository;
        _questionService = questionService;
        _aiAnalysisService = aiAnalysisService;
        _notificationService = notificationService;
        _classRepository = classRepository;
        _context = context;
        _serviceScopeFactory = serviceScopeFactory;
        _geminiFeedbackAnalyzer = geminiFeedbackAnalyzer;
        _textAnalysisService = textAnalysisService;
        _logger = logger;
    }

    public async Task<FeedbackDto> CreateFeedbackAsync(CreateFeedbackRequest request)
    {
        // Load class info to resolve subject automatically (avoid relying on client payload)
        var classEntity = await _classRepository.GetByIdAsync(request.ClassId);
        if (classEntity == null)
        {
            throw new KeyNotFoundException($"Class with id {request.ClassId} not found");
        }

        if (classEntity.SubjectId <= 0)
        {
            throw new InvalidOperationException($"Class {request.ClassId} is missing subject information");
        }

        var resolvedSubjectId = classEntity.SubjectId;

        // Load active questions (general only, no subject filter)
        var activeQuestions = await _questionService.GetActiveQuestionsAsync(null);
        var questionList = activeQuestions.ToList();
        
        if (!questionList.Any())
        {
            throw new InvalidOperationException("No active feedback questions found");
        }

        // Validate answers
        if (request.Answers == null || !request.Answers.Any())
        {
            throw new ArgumentException("Answers cannot be null or empty");
        }

        // Validate all active questions are answered
        var questionIds = questionList.Select(q => q.Id).ToHashSet();
        var answerKeys = request.Answers.Keys.ToHashSet();
        
        if (!questionIds.SetEquals(answerKeys))
        {
            var missing = questionIds.Except(answerKeys).ToList();
            var extra = answerKeys.Except(questionIds).ToList();
            var errors = new List<string>();
            if (missing.Any())
                errors.Add($"Missing answers for questions: {string.Join(", ", missing)}");
            if (extra.Any())
                errors.Add($"Extra answers for non-existent questions: {string.Join(", ", extra)}");
            throw new ArgumentException($"Invalid answers: {string.Join("; ", errors)}");
        }

        // Validate all answer values are in range 1-4
        if (request.Answers.Values.Any(a => a < 1 || a > 4))
        {
            throw new ArgumentException("All answers must be between 1 and 4");
        }

        // Validate free text length
        if (!string.IsNullOrWhiteSpace(request.FreeText) && request.FreeText.Length > 1200)
        {
            throw new ArgumentException("Free text must not exceed 1200 characters");
        }

        // Check if student already submitted feedback for this class
        var existing = await _feedbackRepository.GetByStudentAndClassAsync(request.StudentId, request.ClassId);
        if (existing != null)
        {
            throw new InvalidOperationException("Feedback already submitted for this class");
        }

        // Calculate satisfaction score: normalize 1-4 scale to 0-1 using (raw - 1) / 3
        var rawAverage = (decimal)request.Answers.Values.Sum() / request.Answers.Count;
        var satisfactionScore = (rawAverage - 1.0m) / 3.0m;
        if (satisfactionScore < 0m) satisfactionScore = 0m;
        if (satisfactionScore > 1m) satisfactionScore = 1m;

        // Create feedback entity
        var feedback = new Feedback
        {
            StudentId = request.StudentId,
            ClassId = request.ClassId,
            SubjectId = resolvedSubjectId,
            WantsOneToOne = request.WantsOneToOne,
            FreeText = request.FreeText?.Trim(),
            FreeTextTranscript = request.FreeTextTranscript?.Trim(),
            SatisfactionScore = satisfactionScore,
            Status = "New",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Lưu map câu trả lời xuống cột JSON
        feedback.SetAnswersDict(request.Answers);

        await _feedbackRepository.AddAsync(feedback);
        await _feedbackRepository.SaveChangesAsync();

        // Perform AI analysis asynchronously (fire-and-forget) using new scope
        var feedbackId = feedback.Id;
        _logger?.LogInformation("Starting background AI analysis for feedback {FeedbackId}", feedbackId);
        _ = Task.Run(async () =>
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            try
            {
                var scopedRepository = scope.ServiceProvider.GetRequiredService<IFeedbackRepository>();
                var scopedQuestionService = scope.ServiceProvider.GetRequiredService<IFeedbackQuestionService>();
                var scopedAiService = scope.ServiceProvider.GetRequiredService<IAiAnalysisService>();
                var scopedGeminiAnalyzer = scope.ServiceProvider.GetRequiredService<GeminiFeedbackAnalyzer>();
                var scopedNotificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var scopedContext = scope.ServiceProvider.GetRequiredService<FjapDbContext>();
                var scopedLogger = scope.ServiceProvider.GetService<ILogger<FeedbackService>>();

                scopedLogger?.LogInformation("Background AI analysis started for feedback {FeedbackId}", feedbackId);
                
                await AnalyzeAndUpdateFeedbackAsync(
                    feedbackId,
                    scopedRepository, 
                    scopedQuestionService, 
                    scopedAiService, 
                    scopedNotificationService, 
                    scopedContext, 
                    scopedLogger,
                    scopedGeminiAnalyzer);
                
                scopedLogger?.LogInformation("Background AI analysis completed successfully for feedback {FeedbackId}", feedbackId);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in background AI analysis for feedback {FeedbackId}. Error: {ErrorMessage}", feedbackId, ex.Message);
                _logger?.LogError(ex, "Stack trace: {StackTrace}", ex.StackTrace);
            }
        });

        // Return DTO immediately (before AI analysis completes)
        return await MapToDtoAsync(feedback);
    }

    private async Task AnalyzeAndUpdateFeedbackAsync(
        int feedbackId,
        IFeedbackRepository repository,
        IFeedbackQuestionService questionService,
        IAiAnalysisService aiService,
        INotificationService notificationService,
        FjapDbContext context,
        ILogger<FeedbackService>? logger,
        GeminiFeedbackAnalyzer geminiAnalyzer)
    {
        var feedback = await repository.GetByIdAsync(feedbackId);
        if (feedback == null)
        {
            logger?.LogWarning("Feedback {FeedbackId} not found for AI analysis", feedbackId);
            return;
        }

        try
        {
            // Load questions and answers
            var questions = await questionService.GetActiveQuestionsAsync(null);
            var answers = feedback.GetAnswersDict() ?? new Dictionary<int, int>();
            
            if (answers == null || !answers.Any())
            {
                logger?.LogWarning("Feedback {FeedbackId} has no answers for AI analysis. Setting default category.", feedbackId);
                // Set default category even if no answers
                feedback.IssueCategory = FJAP.vn.fpt.edu.models.FeedbackIssueCategory.Other;
                feedback.UpdatedAt = DateTime.UtcNow;
                repository.Update(feedback);
                await repository.SaveChangesAsync();
                return;
            }

            // Call AI analysis (existing service for keywords/suggestions)
            var analysisResult = await aiService.AnalyzeFeedbackAsync(
                answers,
                questions.ToList(),
                feedback.SatisfactionScore,
                feedback.FreeText
            );

            // New: call 8-category analyzer (C1..F1). If it succeeds, we will prefer its category.
            AiFeedbackAnalysisResult? fixedCategoryResult = null;
            try
            {
                fixedCategoryResult = await geminiAnalyzer.AnalyzeAsync(feedback);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "Error running GeminiFeedbackAnalyzer for feedback {FeedbackId}", feedback.Id);
            }

            // Update feedback with AI results - with validation and logging
            logger?.LogInformation("=== Updating Feedback {FeedbackId} with AI Results ===", feedback.Id);
            
            // Validate and set sentiment
            var sentiment = analysisResult.Sentiment ?? "Neutral";
            if (sentiment != "Positive" && sentiment != "Neutral" && sentiment != "Negative")
            {
                logger?.LogWarning("Invalid sentiment '{Sentiment}', defaulting to Neutral", sentiment);
                sentiment = "Neutral";
            }
            feedback.Sentiment = sentiment;
            feedback.SentimentScore = analysisResult.SentimentScore;
            feedback.AiReason = analysisResult.Reason;
            
            // Calculate and adjust urgency based on satisfaction score and sentiment
            var calculatedUrgency = CalculateUrgency(
                analysisResult.Urgency,
                feedback.SatisfactionScore,
                analysisResult.Sentiment,
                feedback.FreeText,
                feedback.FreeTextTranscript,
                logger);
            feedback.Urgency = calculatedUrgency;
            
            // Use Reason from analysisResult if MainIssue is empty or "None"
            var mainIssue = analysisResult.MainIssue;
            if (string.IsNullOrWhiteSpace(mainIssue) || string.Equals(mainIssue, "None", StringComparison.OrdinalIgnoreCase))
            {
                mainIssue = analysisResult.Reason;
            }
            // If still empty, generate a summary instead of copying FreeText
            if (string.IsNullOrWhiteSpace(mainIssue))
            {
                // Try to create a summary based on category if available
                if (!string.IsNullOrWhiteSpace(feedback.CategoryCode) && feedback.CategoryCode != "UNK")
                {
                    var categoryName = feedback.CategoryName ?? FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDisplayName(feedback.CategoryCode);
                    mainIssue = $"{categoryName} concerns reported";
                }
                else if (!string.IsNullOrWhiteSpace(feedback.FreeText))
                {
                    // Create a generic summary instead of copying text
                    var feedbackSentiment = feedback.Sentiment ?? "general";
                    mainIssue = feedbackSentiment == "Negative" 
                        ? "Student reported concerns about the course"
                        : feedbackSentiment == "Positive"
                        ? "Student provided positive feedback"
                        : "Student feedback received";
                }
                else
                {
                    mainIssue = "General feedback";
                }
                logger?.LogWarning("MainIssue was empty, generated summary: {MainIssue}", mainIssue);
            }
            feedback.MainIssue = mainIssue;
            logger?.LogInformation("MainIssue set to: {MainIssue}", mainIssue);

            logger?.LogInformation("=== AI Analysis Result for Feedback {FeedbackId} ===", feedback.Id);
            logger?.LogInformation("Satisfaction Score: {Score}", feedback.SatisfactionScore);
            logger?.LogInformation("AI returned CategoryCode: {CategoryCode}, IssueCategory: {IssueCategory}", 
                analysisResult.CategoryCode, analysisResult.IssueCategory);
            logger?.LogInformation("AI returned sentiment: {Sentiment}", analysisResult.Sentiment);
            logger?.LogInformation("MainIssue: {MainIssue}, Reason: {Reason}", mainIssue, analysisResult.Reason);
            logger?.LogInformation("FreeText: {FreeText}", feedback.FreeText);
            logger?.LogInformation("FreeTextTranscript: {FreeTextTranscript}", feedback.FreeTextTranscript);
            
            // Priority 1: If new fixed 8-category result is available, use it
            if (fixedCategoryResult != null)
            {
                var code = fixedCategoryResult.CategoryCode;
                // Đảm bảo code không null/empty, nếu có thì fallback về UNK
                if (string.IsNullOrWhiteSpace(code))
                {
                    logger?.LogWarning("fixedCategoryResult.CategoryCode is null/empty, defaulting to UNK");
                    code = "UNK";
                }
                
                feedback.IssueCategory = code; // Store C1..F1 in IssueCategory column
                feedback.CategoryCode = code;
                feedback.CategoryName = !string.IsNullOrWhiteSpace(fixedCategoryResult.CategoryName)
                    ? fixedCategoryResult.CategoryName
                    : FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDisplayName(code);
                feedback.CategoryConfidence = (decimal?)fixedCategoryResult.Confidence;
                feedback.AiReason = fixedCategoryResult.Reason;

                // Sync sentiment / urgency / main issue when useful
                feedback.Sentiment = fixedCategoryResult.Sentiment;
                if (fixedCategoryResult.SentimentScore.HasValue)
                {
                    feedback.SentimentScore = (decimal?)fixedCategoryResult.SentimentScore.Value;
                }

                feedback.Urgency = fixedCategoryResult.Urgency;

                if (string.IsNullOrWhiteSpace(feedback.MainIssue) ||
                    string.Equals(feedback.MainIssue, "None", StringComparison.OrdinalIgnoreCase))
                {
                    feedback.MainIssue = fixedCategoryResult.Reason;
                }

                logger?.LogInformation("8-category AI result for feedback {FeedbackId}: Code={Code}, Name={Name}, Urgency={Urgency}",
                    feedback.Id, fixedCategoryResult.CategoryCode, fixedCategoryResult.CategoryName, fixedCategoryResult.Urgency);
            }
            // Priority 2: Use CategoryCode from refactored AiAnalysisService (C1..F1)
            else if (!string.IsNullOrWhiteSpace(analysisResult.CategoryCode))
            {
                var validCodes = new[] { "C1", "C2", "C3", "C4", "M1", "A1", "T1", "F1" };
                var categoryCode = analysisResult.CategoryCode.ToUpperInvariant();
                
                if (validCodes.Contains(categoryCode))
                {
                    feedback.IssueCategory = categoryCode;
                    feedback.CategoryCode = categoryCode;
                    feedback.CategoryName = !string.IsNullOrWhiteSpace(analysisResult.CategoryName)
                        ? analysisResult.CategoryName
                        : FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDisplayName(categoryCode);
                    feedback.CategoryConfidence = analysisResult.Confidence;
                    logger?.LogInformation("Using CategoryCode from AiAnalysisService: {Code}", categoryCode);
                    
                    // Use Reason as MainIssue if available
                    if (!string.IsNullOrWhiteSpace(analysisResult.Reason) && 
                        (string.IsNullOrWhiteSpace(feedback.MainIssue) || 
                         string.Equals(feedback.MainIssue, "None", StringComparison.OrdinalIgnoreCase)))
                    {
                        feedback.MainIssue = analysisResult.Reason;
                    }
                }
                else
                {
                    logger?.LogWarning("Invalid CategoryCode from AiAnalysisService: {Code}, falling back to pattern classification", categoryCode);
                    // Fall through to pattern-based classification in Priority 3
                    // Treat as if CategoryCode was null
                }
            }
            
            // Priority 3: If no valid CategoryCode was set, try to map from old IssueCategory or use pattern-based classification
            if (string.IsNullOrWhiteSpace(feedback.CategoryCode))
            {
                string? finalCategoryCode = null;
                var allAnswersLow = answers != null && answers.Values.All(a => a == 1);
                var satisfactionScoreLow = feedback.SatisfactionScore < 0.4m;
                
                logger?.LogInformation("No CategoryCode available. All answers low: {AllLow}, Satisfaction score low: {ScoreLow}", 
                    allAnswersLow, satisfactionScoreLow);
                
                // Try to map from old IssueCategory to new code
                var oldIssueCategory = analysisResult.IssueCategory;
                if (!string.IsNullOrWhiteSpace(oldIssueCategory))
                {
                    finalCategoryCode = MapOldCategoryToNewCode(oldIssueCategory);
                    if (!string.IsNullOrWhiteSpace(finalCategoryCode))
                    {
                        logger?.LogInformation("Mapped old category {OldCategory} to new code {NewCode}", oldIssueCategory, finalCategoryCode);
                    }
                }
                
                // If still no code, use pattern-based classification with new codes
                if (string.IsNullOrWhiteSpace(finalCategoryCode))
                {
                    logger?.LogWarning("Attempting pattern-based classification with new 8-category codes...");
                    var combinedText = $"{mainIssue} {feedback.FreeText} {feedback.FreeTextTranscript}".Trim();
                    
                    if (!string.IsNullOrWhiteSpace(combinedText))
                    {
                        finalCategoryCode = ClassifyByPatternNewCodes(combinedText);
                        if (!string.IsNullOrWhiteSpace(finalCategoryCode))
                        {
                            logger?.LogInformation("Pattern-based classification result: {Code}", finalCategoryCode);
                        }
                    }
                }
                
                // If still no code, use default based on sentiment and satisfaction
                if (string.IsNullOrWhiteSpace(finalCategoryCode))
                {
                    // Never use positive category if satisfaction is low or has negative keywords
                    var hasNegativeKeywords = HasNegativeKeywords(feedback.FreeText, feedback.FreeTextTranscript);
                    
                    if (satisfactionScoreLow || allAnswersLow || hasNegativeKeywords)
                    {
                        finalCategoryCode = "UNK"; // Unknown instead of Other
                        logger?.LogWarning("Could not classify. Using UNK (satisfaction low: {ScoreLow}, all low: {AllLow}, negative keywords: {HasNegative})", 
                            satisfactionScoreLow, allAnswersLow, hasNegativeKeywords);
                    }
                    else if (analysisResult.Sentiment == "Positive" && feedback.SatisfactionScore >= 0.7m)
                    {
                        // For positive feedback, use C1 as default (best fit)
                        finalCategoryCode = "C1";
                        logger?.LogInformation("Positive feedback with high satisfaction, using C1 as default");
                    }
                    else
                    {
                        finalCategoryCode = "UNK";
                        logger?.LogWarning("Falling back to UNK category");
                    }
                }
                
                // Đảm bảo finalCategoryCode không null - luôn có giá trị ít nhất là UNK
                if (string.IsNullOrWhiteSpace(finalCategoryCode))
                {
                    finalCategoryCode = "UNK";
                    logger?.LogWarning("FinalCategoryCode was null/empty, defaulting to UNK for feedback {FeedbackId}", feedback.Id);
                }
                
                feedback.IssueCategory = finalCategoryCode;
                feedback.CategoryCode = finalCategoryCode;
                feedback.CategoryName = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDisplayName(finalCategoryCode);
                feedback.CategoryConfidence ??= analysisResult.Confidence;
                logger?.LogInformation("Final category code for feedback {FeedbackId}: {Code}", feedback.Id, finalCategoryCode);
            }
            
            // Final safety check: Đảm bảo luôn có category, ít nhất là UNK
            if (string.IsNullOrWhiteSpace(feedback.CategoryCode))
            {
                logger?.LogWarning("CategoryCode is still null after all processing, defaulting to UNK for feedback {FeedbackId}", feedback.Id);
                feedback.IssueCategory = "UNK";
                feedback.CategoryCode = "UNK";
                feedback.CategoryName = "Unknown";
                if (feedback.CategoryConfidence == null)
                {
                    feedback.CategoryConfidence = 0.0m;
                }
            }
            
            feedback.AnalyzedAt = DateTime.UtcNow;
            feedback.UpdatedAt = DateTime.UtcNow;

            logger?.LogInformation("Updating feedback {FeedbackId} with category: {Category}", feedback.Id, feedback.IssueCategory);
            
            // Log all fields before save
            logger?.LogInformation("=== Feedback Data Before Save ===");
            logger?.LogInformation("Sentiment: {Sentiment}, SentimentScore: {SentimentScore}", feedback.Sentiment, feedback.SentimentScore);
            logger?.LogInformation("Urgency: {Urgency}, MainIssue: {MainIssue}", feedback.Urgency, feedback.MainIssue);
            logger?.LogInformation("IssueCategory: {Category}", feedback.IssueCategory);

            repository.Update(feedback);
            var saved = await repository.SaveChangesAsync();
            
            logger?.LogInformation("Feedback {FeedbackId} saved. Changes: {Saved}", feedback.Id, saved);
            
            // Verify the data was actually saved
            await context.Entry(feedback).ReloadAsync();
            logger?.LogInformation("=== Feedback Data After Save (Reloaded) ===");
            logger?.LogInformation("Sentiment: {Sentiment}, SentimentScore: {SentimentScore}", feedback.Sentiment, feedback.SentimentScore);
            logger?.LogInformation("Urgency: {Urgency}, MainIssue: {MainIssue}", feedback.Urgency, feedback.MainIssue);
            logger?.LogInformation("IssueCategory: {Category}", feedback.IssueCategory);

            // Send notification if urgency >= 7
            if (analysisResult.Urgency >= 7)
            {
                await SendUrgentNotificationAsync(feedback, notificationService, context, logger);
            }
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Error analyzing feedback {FeedbackId}", feedback.Id);
            // Set default values on error, including category (use new code system)
            feedback.Sentiment = "Neutral";
            feedback.SentimentScore = 0;
            feedback.Urgency = 0;
            feedback.IssueCategory = "UNK"; // Use UNK instead of Other for new system
            feedback.MainIssue = "Analysis error occurred";
            feedback.UpdatedAt = DateTime.UtcNow;
            repository.Update(feedback);
            await repository.SaveChangesAsync();
            logger?.LogInformation("Feedback {FeedbackId} set to default category: {Category}", feedback.Id, feedback.IssueCategory);
        }
    }

    private bool HasNegativeKeywords(string? freeText, string? freeTextTranscript)
    {
        if (string.IsNullOrWhiteSpace(freeText) && string.IsNullOrWhiteSpace(freeTextTranscript))
        {
            return false;
        }

        var combinedText = $"{freeText} {freeTextTranscript}".ToLowerInvariant();
        
        // Normalize common typos and variations
        // Replace common misspellings with correct forms for better matching
        var normalizedText = combinedText
            .Replace("understant", "understand")  // Common typo: "dont understant" -> "dont understand"
            .Replace("understnd", "understand")
            .Replace("undestand", "understand")
            .Replace("understad", "understand")
            .Replace("dont", "don't")  // Normalize "dont" to "don't"
            .Replace("cant", "can't")
            .Replace("wont", "won't")
            .Replace("isnt", "isn't")
            .Replace("arent", "aren't");
        
        // Negative patterns that indicate problems/issues
        // Group 1: Understanding/Clarity issues (including common typos)
        var understandingPatterns = new[]
        {
            "dont understand", "don't understand", "do not understand", "cannot understand", "can't understand",
            "not understand", "understant", "understnd", "undestand", "understad",  // Common typos
            "not clear", "unclear", "confusing", "confused",
            "not clear enough", "hard to understand", "difficult to understand"
        };
        
        // Group 2: Satisfaction/Dissatisfaction
        var satisfactionPatterns = new[]
        {
            "not satisfied", "not happy", "not good", "not great", "not excellent",
            "disappointed", "disappointing", "unsatisfied", "unhappy",
            "bad", "poor", "worst", "terrible", "awful", "horrible"
        };
        
        // Group 3: Difficulty/Complexity
        var difficultyPatterns = new[]
        {
            "too difficult", "too hard", "too easy", "too complex", "too complicated",
            "difficult", "hard", "challenging", "complex", "complicated",
            "cant do", "can't do", "cannot do", "unable to"
        };
        
        // Group 4: Quantity/Workload
        var quantityPatterns = new[]
        {
            "too much", "too many", "overwhelming", "overwhelm",
            "excessive", "excess", "overload", "overloaded"
        };
        
        // Group 5: Problems/Issues
        var problemPatterns = new[]
        {
            "problem", "problems", "issue", "issues", "trouble", "troubles",
            "error", "errors", "mistake", "mistakes", "wrong", "incorrect"
        };
        
        // Group 6: Functionality/Working
        var functionalityPatterns = new[]
        {
            "not working", "broken", "broken down", "doesn't work", "does not work",
            "not functioning", "malfunction", "defective"
        };
        
        // Group 7: Stress/Concern
        var stressPatterns = new[]
        {
            "stress", "stressed", "stressing", "worried", "concerned", "anxious",
            "frustrated", "frustrating", "frustration"
        };
        
        // Group 8: Missing/Lacking
        var missingPatterns = new[]
        {
            "lack", "lacking", "missing", "need", "needs", "should", "must", "have to",
            "wish", "wish there was", "would like", "want more", "need more"
        };
        
        // Group 9: Negative teaching/learning
        var teachingPatterns = new[]
        {
            "teacher", "lecturer", "teaching", "teach", "lesson", "lessons",
            "class", "course", "subject"
        };
        
        // Combine all patterns
        var allPatterns = understandingPatterns
            .Concat(satisfactionPatterns)
            .Concat(difficultyPatterns)
            .Concat(quantityPatterns)
            .Concat(problemPatterns)
            .Concat(functionalityPatterns)
            .Concat(stressPatterns)
            .Concat(missingPatterns)
            .ToArray();

        // Check normalized text first (handles typos)
        foreach (var pattern in allPatterns)
        {
            if (normalizedText.Contains(pattern))
            {
                return true;
            }
        }
        
        // Also check original text (in case normalization didn't catch it)
        foreach (var pattern in allPatterns)
        {
            if (combinedText.Contains(pattern))
            {
                return true;
            }
        }
        
        // Special check: If text contains teaching-related words with negative context
        // e.g., "teach dont understant" -> should match
        if (teachingPatterns.Any(tp => combinedText.Contains(tp)) && 
            (understandingPatterns.Any(up => combinedText.Contains(up)) || 
             combinedText.Contains("dont") || combinedText.Contains("not")))
        {
            return true;
        }

        return false;
    }

    private int CalculateUrgency(
        int aiUrgency,
        decimal satisfactionScore,
        string? sentiment,
        string? freeText,
        string? freeTextTranscript,
        ILogger<FeedbackService>? logger)
    {
        var calculatedUrgency = aiUrgency;
        
        // Adjust urgency based on satisfaction score
        // If satisfaction score is very low, urgency should be higher
        if (satisfactionScore < 0.25m)
        {
            // Very low satisfaction (< 25%) -> high urgency
            calculatedUrgency = Math.Max(calculatedUrgency, 7);
            logger?.LogInformation("Satisfaction score {Score} < 0.25, setting minimum urgency to 7", satisfactionScore);
        }
        else if (satisfactionScore < 0.4m)
        {
            // Low satisfaction (< 40%) -> medium-high urgency
            calculatedUrgency = Math.Max(calculatedUrgency, 5);
            logger?.LogInformation("Satisfaction score {Score} < 0.4, setting minimum urgency to 5", satisfactionScore);
        }
        else if (satisfactionScore < 0.6m)
        {
            // Medium satisfaction -> medium urgency
            calculatedUrgency = Math.Max(calculatedUrgency, 3);
            logger?.LogInformation("Satisfaction score {Score} < 0.6, setting minimum urgency to 3", satisfactionScore);
        }
        
        // Adjust based on sentiment
        if (sentiment == "Negative")
        {
            calculatedUrgency = Math.Max(calculatedUrgency, 4);
            logger?.LogInformation("Negative sentiment detected, setting minimum urgency to 4");
        }
        else if (sentiment == "Positive" && satisfactionScore >= 0.7m)
        {
            // Positive sentiment with high satisfaction -> low urgency
            calculatedUrgency = Math.Min(calculatedUrgency, 2);
            logger?.LogInformation("Positive sentiment with high satisfaction, capping urgency at 2");
        }
        
        // Check for negative keywords in free text (indicates problems)
        var hasNegativeKeywords = HasNegativeKeywords(freeText, freeTextTranscript);
        if (hasNegativeKeywords && calculatedUrgency < 5)
        {
            calculatedUrgency = Math.Max(calculatedUrgency, 5);
            logger?.LogInformation("Negative keywords found in free text, setting minimum urgency to 5");
        }
        
        // Ensure urgency is within valid range (0-10)
        calculatedUrgency = Math.Max(0, Math.Min(10, calculatedUrgency));
        
        if (calculatedUrgency != aiUrgency)
        {
            logger?.LogInformation("Adjusted urgency from {AiUrgency} to {CalculatedUrgency} based on satisfaction score {Score} and sentiment {Sentiment}", 
                aiUrgency, calculatedUrgency, satisfactionScore, sentiment);
        }
        
        return calculatedUrgency;
    }

    private async Task SendUrgentNotificationAsync(
        Feedback feedback,
        INotificationService notificationService,
        FjapDbContext context,
        ILogger<FeedbackService>? logger)
    {
        try
        {
            // Get lecturer UserId from Class -> Lessons -> Lecture -> User
            var lecturerUserId = await context.Lessons
                .AsNoTracking()
                .Include(l => l.Lecture)
                .Where(l => l.ClassId == feedback.ClassId)
                .Select(l => (int?)l.Lecture.UserId)
                .FirstOrDefaultAsync();

            if (!lecturerUserId.HasValue)
            {
                logger?.LogWarning("No lecturer found for class {ClassId}", feedback.ClassId);
                return;
            }

            // Get student and class names
            var student = await context.Students
                .AsNoTracking()
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.StudentId == feedback.StudentId);

            var classEntity = await context.Classes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClassId == feedback.ClassId);

            var studentName = student?.User != null 
                ? $"{student.User.FirstName} {student.User.LastName}" 
                : "Student";
            var className = classEntity?.ClassName ?? "Class";

            // Create notification
            var notificationRequest = new CreateNotificationRequest(
                lecturerUserId.Value,
                "[Feedback Urgent]",
                $"Feedback from {studentName} for {className} has high urgency ({feedback.Urgency}). Please review immediately.",
                "Feedback",
                null,
                feedback.Id
            );

            await notificationService.CreateAsync(notificationRequest, broadcast: true);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Error sending urgent notification for feedback {FeedbackId}", feedback.Id);
        }
    }

    public async Task<(IEnumerable<FeedbackDto> Items, int Total)> GetFeedbacksAsync(FeedbackFilterRequest filter)
    {
        IEnumerable<Feedback> feedbacks;

        if (filter.ClassId.HasValue)
        {
            var sentiment = filter.Sentiment switch
            {
                "Positive" => 1,
                "Negative" => -1,
                "Neutral" => 0,
                _ => (int?)null
            };
            feedbacks = await _feedbackRepository.GetByClassAsync(
                filter.ClassId.Value,
                sentiment,
                filter.Urgency,
                filter.Status
            );
        }
        else if (filter.SubjectId.HasValue)
        {
            var sentiment = filter.Sentiment switch
            {
                "Positive" => 1,
                "Negative" => -1,
                "Neutral" => 0,
                _ => (int?)null
            };
            feedbacks = await _feedbackRepository.GetBySubjectAsync(
                filter.SubjectId.Value,
                sentiment,
                filter.Urgency,
                filter.Status
            );
        }
        else
        {
            // Get all feedbacks with filters
            var query = _context.Feedbacks
                .AsNoTracking()
                .Include(f => f.Student)
                    .ThenInclude(s => s.User)
                .Include(f => f.Class)
                .Include(f => f.Subject)
                .AsQueryable();

            // Filter by lecturer classes if provided (for lecturer role)
            if (filter.LecturerClassIds != null && filter.LecturerClassIds.Any())
            {
                query = query.Where(f => filter.LecturerClassIds.Contains(f.ClassId));
            }

            if (!string.IsNullOrWhiteSpace(filter.Sentiment))
            {
                query = query.Where(f => f.Sentiment == filter.Sentiment);
            }

            if (filter.Urgency.HasValue)
            {
                query = query.Where(f => f.Urgency >= filter.Urgency.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(f => f.Status == filter.Status);
            }

            feedbacks = await query
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        var total = feedbacks.Count();
        var pagedFeedbacks = feedbacks
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize);

        var items = new List<FeedbackDto>();
        foreach (var feedback in pagedFeedbacks)
        {
            items.Add(await MapToDtoAsync(feedback));
        }

        return (items, total);
    }

    public async Task<FeedbackDto?> GetFeedbackByIdAsync(int id)
    {
        var feedback = await _feedbackRepository.GetByIdWithDetailsAsync(id);
        if (feedback == null) return null;

        return await MapToDtoAsync(feedback);
    }

    public async Task<bool> UpdateStatusAsync(int id, UpdateFeedbackStatusRequest request)
    {
        var feedback = await _feedbackRepository.GetByIdAsync(id);
        if (feedback == null) return false;

        if (request.Status != "New" && request.Status != "Reviewed" && request.Status != "Actioned")
        {
            throw new ArgumentException("Invalid status. Must be New, Reviewed, or Actioned");
        }

        feedback.Status = request.Status;
        feedback.UpdatedAt = DateTime.UtcNow;

        _feedbackRepository.Update(feedback);
        await _feedbackRepository.SaveChangesAsync();

        return true;
    }

    public async Task<FeedbackDto> ReAnalyzeFeedbackAsync(int id)
    {
        var feedback = await _feedbackRepository.GetByIdAsync(id);
        if (feedback == null)
        {
            throw new KeyNotFoundException($"Feedback with id {id} not found");
        }

        await AnalyzeAndUpdateFeedbackAsync(
            id,
            _feedbackRepository,
            _questionService,
            _aiAnalysisService,
            _notificationService,
            _context,
            _logger,
            _geminiFeedbackAnalyzer);

        // Reload with details
        var updatedFeedback = await _feedbackRepository.GetByIdWithDetailsAsync(id);
        if (updatedFeedback == null)
        {
            throw new InvalidOperationException("Feedback was deleted during re-analysis");
        }

        return await MapToDtoAsync(updatedFeedback);
    }

    public async Task<IEnumerable<FeedbackIssueParetoItemDto>> GetIssueParetoAsync(int? classId, DateTime? from, DateTime? to, string? groupBy = "category")
    {
        List<(string Issue, int Count)> issueCounts;
        bool useCategoryGrouping = false;
        
        if (groupBy == "category")
        {
            try
            {
                issueCounts = await _feedbackRepository.GetIssueCategoryCountsAsync(classId, from, to);
                // If no data with categories, fallback to main_issue grouping
                if (issueCounts == null || issueCounts.Count == 0)
                {
                    _logger?.LogWarning("No feedback with categories found, falling back to main_issue grouping");
                    issueCounts = await _feedbackRepository.GetIssueCountsAsync(classId, from, to);
                    useCategoryGrouping = false; // Use issue display logic
                }
                else
                {
                    useCategoryGrouping = true; // Use category display logic
                }
            }
            catch (Exception ex)
            {
                // If column doesn't exist or other DB error, fallback to main_issue
                _logger?.LogWarning(ex, "Error querying by category, falling back to main_issue grouping");
                issueCounts = await _feedbackRepository.GetIssueCountsAsync(classId, from, to);
                useCategoryGrouping = false;
            }
        }
        else
        {
            // Legacy: group by main_issue
            issueCounts = await _feedbackRepository.GetIssueCountsAsync(classId, from, to);
            useCategoryGrouping = false;
        }

        if (issueCounts == null || issueCounts.Count == 0)
        {
            return Enumerable.Empty<FeedbackIssueParetoItemDto>();
        }

        var total = issueCounts.Sum(x => x.Count);
        if (total == 0)
        {
            return Enumerable.Empty<FeedbackIssueParetoItemDto>();
        }

        var result = new List<FeedbackIssueParetoItemDto>();
        decimal cumulative = 0;

        foreach (var (issue, count) in issueCounts)
        {
            var percent = Math.Round((decimal)count / total * 100m, 2);
            cumulative += percent;
            if (cumulative > 100m) cumulative = 100m;

            // If grouping by category, convert code to display name and get description
            string displayIssue = issue;
            string? description = null;
            if (useCategoryGrouping)
            {
                // Check if it's a new category code (C1..F1) or old category name
                var validNewCodes = new[] { "C1", "C2", "C3", "C4", "M1", "A1", "T1", "F1", "UNK" };
                var isNewCategoryCode = !string.IsNullOrWhiteSpace(issue) && 
                                       validNewCodes.Contains(issue.ToUpperInvariant());
                
                if (isNewCategoryCode)
                {
                    // Use new 8-category system
                    displayIssue = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDisplayNameWithCode(issue);
                    description = FJAP.vn.fpt.edu.models.IssueCategoryInfo.GetDescription(issue);
                }
                else
                {
                    // Fallback to old category system
                    displayIssue = FJAP.vn.fpt.edu.models.FeedbackIssueCategory.GetDisplayName(issue);
                    description = FJAP.vn.fpt.edu.models.FeedbackIssueCategory.GetDescription(issue);
                }
            }
            else if (string.IsNullOrWhiteSpace(displayIssue))
            {
                displayIssue = "Unknown Issue";
                description = "No specific issue identified";
            }

            result.Add(new FeedbackIssueParetoItemDto(
                displayIssue,
                count,
                percent,
                cumulative,
                description
            ));
        }

        _logger?.LogInformation("Pareto analysis: {Count} items returned, total feedback: {Total}", result.Count, total);
        return result;
    }

    public async Task<IEnumerable<FeedbackQuestionParetoItemDto>> GetQuestionParetoAsync(int? classId, int? semesterId, DateTime? from, DateTime? to)
    {
        var questionScores = await _feedbackRepository.GetQuestionAverageScoresAsync(classId, semesterId, from, to);
        
        if (!questionScores.Any())
        {
            return Enumerable.Empty<FeedbackQuestionParetoItemDto>();
        }

        // Load active questions
        var activeQuestions = await _questionService.GetActiveQuestionsAsync(null);
        var questionDict = activeQuestions.ToDictionary(q => q.Id, q => q);

        var result = new List<FeedbackQuestionParetoItemDto>();
        foreach (var (questionId, averageScore, responseCount) in questionScores)
        {
            if (questionDict.TryGetValue(questionId, out var question))
            {
                // Calculate percentage: (averageScore / 10) * 100
                var percentage = Math.Round((averageScore / 10m) * 100m, 2);
                if (percentage < 0) percentage = 0;
                if (percentage > 100) percentage = 100;

                result.Add(new FeedbackQuestionParetoItemDto(
                    questionId,
                    question.QuestionText,
                    question.EvaluationLabel,
                    averageScore,
                    responseCount,
                    question.OrderIndex,
                    percentage
                ));
            }
        }

        // Sort by OrderIndex
        return result.OrderBy(x => x.OrderIndex).ToList();
    }

    public async Task<FeedbackTextSummaryDto> GetTextSummaryAsync(int? classId, int? semesterId, DateTime? from, DateTime? to)
    {
        return await _textAnalysisService.AnalyzeTextFeedbackAsync(classId, semesterId, from, to);
    }

    /// <summary>
    /// Lấy danh sách lớp mà giảng viên đang dạy (truyền vào danh sách classId)
    /// kèm số lượng feedback cuối khóa của từng lớp. KHÔNG trả về thông tin sinh viên.
    /// </summary>
    public async Task<IEnumerable<LecturerFeedbackClassDto>> GetLecturerClassesWithFeedbackAsync(List<int> lecturerClassIds)
    {
        if (lecturerClassIds == null || lecturerClassIds.Count == 0)
        {
            return Enumerable.Empty<LecturerFeedbackClassDto>();
        }

        var classes = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Subject)
            .Include(c => c.Semester)
            .Where(c => lecturerClassIds.Contains(c.ClassId))
            .ToListAsync();

        var feedbackCounts = await _context.Feedbacks
            .AsNoTracking()
            .Where(f => lecturerClassIds.Contains(f.ClassId))
            .GroupBy(f => f.ClassId)
            .Select(g => new
            {
                ClassId = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        var countDict = feedbackCounts.ToDictionary(x => x.ClassId, x => x.Count);

        return classes.Select(c => new LecturerFeedbackClassDto(
            c.ClassId,
            c.ClassName,
            c.Subject?.SubjectName ?? string.Empty,
            c.Subject?.SubjectCode,
            c.Semester != null ? (c.Semester.Name ?? c.Semester.SemesterCode) : string.Empty,
            countDict.TryGetValue(c.ClassId, out var cnt) ? cnt : 0
        ));
    }

    /// <summary>
    /// Lấy danh sách feedback cuối khóa theo classId cho giảng viên.
    /// Đầu vào gồm classId và danh sách class mà giảng viên này được phép xem.
    /// Đảm bảo KHÔNG trả về bất kỳ thông tin định danh sinh viên nào.
    /// </summary>
    public async Task<IEnumerable<LecturerClassFeedbackItemDto>> GetClassFeedbacksForLecturerAsync(
        int classId,
        List<int> lecturerClassIds)
    {
        if (lecturerClassIds == null || !lecturerClassIds.Contains(classId))
        {
            throw new UnauthorizedAccessException("You can only view feedback for classes you teach.");
        }

        var feedbacks = await _context.Feedbacks
            .AsNoTracking()
            .Include(f => f.Class)
            .Include(f => f.Subject)
            .Where(f => f.ClassId == classId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return feedbacks.Select(f => new LecturerClassFeedbackItemDto(
            f.Id,
            f.ClassId,
            f.Class?.ClassName,
            f.SubjectId,
            f.Subject?.SubjectCode,
            f.Subject?.SubjectName,
            f.GetAnswersDict(),
            f.WantsOneToOne,
            f.FreeText,
            f.FreeTextTranscript,
            f.SatisfactionScore,
            f.Sentiment,
            f.SentimentScore,
            f.Urgency,
            f.MainIssue,
            f.IssueCategory,
            f.CategoryCode,
            f.CategoryName,
            f.CategoryConfidence,
            f.AiReason,
            f.AnalyzedAt,
            f.CreatedAt
        ));
    }

    public async Task<(int Total, int Processed, int Succeeded, int Failed)> ReAnalyzeAllWithoutCategoryAsync(int? limit = null)
    {
        return await ReAnalyzeAllFeedbacksAsync(limit, force: false);
    }

    public async Task<(int Total, int Processed, int Succeeded, int Failed)> ReAnalyzeAllFeedbacksAsync(int? limit = null, bool force = false)
    {
        // Get all feedbacks - if force=true, get all; otherwise only those without category
        var query = force
            ? _context.Feedbacks.OrderBy(f => f.CreatedAt)
            : _context.Feedbacks
                .Where(f => f.IssueCategory == null || string.IsNullOrEmpty(f.IssueCategory))
                .OrderBy(f => f.CreatedAt);

        var total = await query.CountAsync();
        _logger?.LogInformation("Found {Total} feedbacks without category", total);

        if (limit.HasValue && limit.Value > 0)
        {
            query = (IOrderedQueryable<Feedback>)query.Take(limit.Value);
        }

        var feedbacksList = await query.ToListAsync();
        _logger?.LogInformation("Processing {Count} feedbacks for re-analysis", feedbacksList.Count);

        int processed = 0;
        int succeeded = 0;
        int failed = 0;

        foreach (var feedback in feedbacksList)
        {
            try
            {
                processed++;
                _logger?.LogInformation("Re-analyzing feedback {FeedbackId} ({Processed}/{Total})", feedback.Id, processed, feedbacksList.Count);
                
                await AnalyzeAndUpdateFeedbackAsync(
                    feedback.Id,
                    _feedbackRepository,
                    _questionService,
                    _aiAnalysisService,
                    _notificationService,
                    _context,
                    _logger,
                    _geminiFeedbackAnalyzer);
                
                // Verify category was set
                await _context.Entry(feedback).ReloadAsync();
                if (!string.IsNullOrEmpty(feedback.IssueCategory))
                {
                    succeeded++;
                    _logger?.LogInformation("Feedback {FeedbackId} successfully categorized as {Category}", feedback.Id, feedback.IssueCategory);
                }
                else
                {
                    failed++;
                    _logger?.LogWarning("Feedback {FeedbackId} re-analyzed but category is still empty", feedback.Id);
                }
            }
            catch (Exception ex)
            {
                failed++;
                _logger?.LogError(ex, "Failed to re-analyze feedback {FeedbackId}", feedback.Id);
            }
        }

        _logger?.LogInformation("Re-analysis completed: {Processed} processed, {Succeeded} succeeded, {Failed} failed", processed, succeeded, failed);
        return (total, processed, succeeded, failed);
    }

    private async Task<FeedbackDto> MapToDtoAsync(Feedback feedback)
    {
        // Ensure navigation properties are loaded
        if (feedback.Student == null)
        {
            feedback = await _feedbackRepository.GetByIdWithDetailsAsync(feedback.Id) ?? feedback;
        }

        var studentName = feedback.Student?.User != null
            ? $"{feedback.Student.User.FirstName} {feedback.Student.User.LastName}"
            : null;
        var studentCode = feedback.Student?.StudentCode;

        // Load questions for DTO
        var questions = await _questionService.GetActiveQuestionsAsync(null);

        // Đọc answers đã lưu (có thể null)
        var answersDict = feedback.GetAnswersDict() ?? new Dictionary<int, int>();
        
        return new FeedbackDto(
            feedback.Id,
            feedback.StudentId,
            studentName,
            studentCode,
            feedback.ClassId,
            feedback.Class?.ClassName,
            feedback.SubjectId,
            feedback.Subject?.SubjectCode,
            feedback.Subject?.SubjectName,
            answersDict,
            questions.ToList(),
            feedback.WantsOneToOne,
            feedback.FreeText,
            feedback.FreeTextTranscript,
            feedback.SatisfactionScore,
            feedback.Sentiment,
            feedback.SentimentScore,
            feedback.Urgency,
            feedback.MainIssue,
            feedback.IssueCategory,
            feedback.CategoryCode,
            feedback.CategoryName,
            feedback.CategoryConfidence,
            feedback.AiReason,
            feedback.AnalyzedAt,
            feedback.Status,
            feedback.CreatedAt,
            feedback.UpdatedAt
        );
    }

    /// <summary>
    /// Maps old category strings to new 8-category codes (C1..F1)
    /// </summary>
    private string? MapOldCategoryToNewCode(string? oldCategory)
    {
        if (string.IsNullOrWhiteSpace(oldCategory)) return null;
        
        var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { FeedbackIssueCategory.TeachingQuality, "C1" },
            { FeedbackIssueCategory.AssessmentLoad, "A1" },
            { FeedbackIssueCategory.FacilityIssues, "F1" },
            { FeedbackIssueCategory.GradingFairness, "A1" }, // Assessment & Workload includes grading
            { FeedbackIssueCategory.ContentRelevance, "M1" }, // Materials & Resources
            { FeedbackIssueCategory.ContentDifficulty, "C1" }, // Teaching Clarity
            { FeedbackIssueCategory.Communication, "C4" }, // Instructor Support
            { FeedbackIssueCategory.ScheduleTiming, "C2" }, // Pacing (related to timing)
            { FeedbackIssueCategory.ClassManagement, "C3" }, // Engagement & Interaction
            { FeedbackIssueCategory.PositiveNoIssue, "C1" }, // Default to C1 for positive (best fit)
            { FeedbackIssueCategory.Other, "UNK" }
        };
        
        return mapping.GetValueOrDefault(oldCategory);
    }

    /// <summary>
    /// Classifies text into new 8-category codes (C1..F1) using pattern matching
    /// </summary>
    private string? ClassifyByPatternNewCodes(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var combinedText = text.ToLowerInvariant();

        // A1 – Assessment & Workload Fairness
        if (combinedText.Contains("workload") || combinedText.Contains("too much") || 
            combinedText.Contains("homework") || combinedText.Contains("assignment") ||
            combinedText.Contains("stress") || combinedText.Contains("overwhelm") ||
            combinedText.Contains("too many") || combinedText.Contains("grading") ||
            combinedText.Contains("rubric") || combinedText.Contains("deadline") ||
            (combinedText.Contains("difficult") && 
             (combinedText.Contains("homework") || combinedText.Contains("assignment") || combinedText.Contains("workload"))))
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

        return null;
    }
}

