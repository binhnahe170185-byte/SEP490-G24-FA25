using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace FJAP.vn.fpt.edu.models;

public partial class Feedback
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int ClassId { get; set; }

    public int SubjectId { get; set; }

    public string? Answers { get; set; }

    public bool WantsOneToOne { get; set; }

    public string? FreeText { get; set; }

    public string? FreeTextTranscript { get; set; }

    public decimal SatisfactionScore { get; set; }

    public string Sentiment { get; set; } = "Neutral";

    public decimal? SentimentScore { get; set; }

    public string? Keywords { get; set; }

    public string? AiSuggestions { get; set; }

    public int Urgency { get; set; }

    public string? MainIssue { get; set; }

    public string? IssueCategory { get; set; }

    public string Status { get; set; } = "New";

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Student Student { get; set; } = null!;

    public virtual Class Class { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;

    public List<string>? GetKeywordsList()
    {
        if (string.IsNullOrWhiteSpace(Keywords))
            return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(Keywords);
        }
        catch
        {
            return null;
        }
    }

    public void SetKeywordsList(List<string>? keywords)
    {
        Keywords = keywords == null ? null : JsonSerializer.Serialize(keywords);
    }

    public List<string>? GetAiSuggestionsList()
    {
        if (string.IsNullOrWhiteSpace(AiSuggestions))
            return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(AiSuggestions);
        }
        catch
        {
            return null;
        }
    }

    public void SetAiSuggestionsList(List<string>? suggestions)
    {
        AiSuggestions = suggestions == null ? null : JsonSerializer.Serialize(suggestions);
    }

    public Dictionary<int, int>? GetAnswersDict()
    {
        if (string.IsNullOrWhiteSpace(Answers))
            return null;
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, int>>(Answers);
            if (dict == null) return null;
            
            return dict.ToDictionary(
                kvp => int.Parse(kvp.Key),
                kvp => kvp.Value
            );
        }
        catch
        {
            return null;
        }
    }

    public void SetAnswersDict(Dictionary<int, int>? answers)
    {
        if (answers == null)
        {
            Answers = null;
            return;
        }
        
        var stringDict = answers.ToDictionary(
            kvp => kvp.Key.ToString(),
            kvp => kvp.Value
        );
        Answers = JsonSerializer.Serialize(stringDict);
    }
}

