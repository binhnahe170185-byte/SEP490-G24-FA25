using System;
using System.Collections.Generic;
using System.Linq;

namespace FJAP.vn.fpt.edu.models;

public static class FeedbackIssueCategory
{
    public const string TeachingQuality = "TEACHING_QUALITY";
    public const string ContentDifficulty = "CONTENT_DIFFICULTY";
    public const string ContentRelevance = "CONTENT_RELEVANCE";
    public const string AssessmentLoad = "ASSESSMENT_LOAD";
    public const string GradingFairness = "GRADING_FAIRNESS";
    public const string ScheduleTiming = "SCHEDULE_TIMING";
    public const string ClassManagement = "CLASS_MANAGEMENT";
    public const string FacilityIssues = "FACILITY_ISSUES";
    public const string Communication = "COMMUNICATION";
    public const string PositiveNoIssue = "POSITIVE_NO_ISSUE";
    public const string Other = "OTHER";

    public static readonly Dictionary<string, string> DisplayNames = new()
    {
        { TeachingQuality, "Teaching Quality" },
        { ContentDifficulty, "Content Difficulty" },
        { ContentRelevance, "Content Relevance" },
        { AssessmentLoad, "Assessment Load" },
        { GradingFairness, "Grading Fairness" },
        { ScheduleTiming, "Schedule & Timing" },
        { ClassManagement, "Class Management" },
        { FacilityIssues, "Facility Issues" },
        { Communication, "Communication & Support" },
        { PositiveNoIssue, "Positive / No Issue" },
        { Other, "Other" }
    };

    public static readonly Dictionary<string, string> Descriptions = new()
    {
        { TeachingQuality, "Issues about lecturer teaching style, explanation clarity, pace, and student support" },
        { ContentDifficulty, "Content is too difficult, too easy, or complexity level issues" },
        { ContentRelevance, "Content lacks real-world examples, outdated, or not practical enough" },
        { AssessmentLoad, "Too many homework, assignments, tests, or excessive workload" },
        { GradingFairness, "Grading rubric unclear, unfair scoring, or confusion about evaluation" },
        { ScheduleTiming, "Class schedule, timing, duration, or time conflicts" },
        { ClassManagement, "Classroom organization, attendance, or discipline issues" },
        { FacilityIssues, "Room temperature, projector, equipment, wifi, or physical environment problems" },
        { Communication, "Communication with lecturer/staff, response time, or unclear announcements" },
        { PositiveNoIssue, "Positive feedback, student is satisfied with no specific issues" },
        { Other, "Feedback that does not fit into any specific category above" }
    };

    public static readonly Dictionary<string, string[]> Keywords = new()
    {
        { TeachingQuality, new[] { "lecturer", "teaching", "teach", "teacher", "explain", "explanation", "pace", "speed", "fast", "slow", "clear", "clearly", "confusing", "confused", "support", "helpful", "help", "understand", "understanding", "dont understand", "don't understand", "do not understand", "cannot understand", "can't understand", "not understand", "not clear", "not clear enough" } },
        { ContentDifficulty, new[] { "difficult", "difficulty", "hard", "easy", "too easy", "too hard", "complex", "complicated", "simple", "challenging", "challenge" } },
        { ContentRelevance, new[] { "relevant", "relevance", "practical", "practice", "real world", "real-world", "realworld", "examples", "example", "case study", "case studies", "outdated", "useful", "useless", "applicable" } },
        { AssessmentLoad, new[] { "homework", "home work", "assignment", "assignments", "too much", "too many", "workload", "work load", "test", "tests", "exam", "exams", "quiz", "quizzes", "stress", "stressed", "overwhelming", "overwhelm" } },
        { GradingFairness, new[] { "grading", "grade", "grades", "rubric", "rubrics", "fair", "fairness", "unfair", "unfairness", "score", "scores", "scoring", "mark", "marks", "marking", "evaluation", "evaluate", "policy", "policies", "confused", "confusing", "unclear", "clear" } },
        { ScheduleTiming, new[] { "schedule", "scheduling", "time", "timing", "class time", "class time", "session", "sessions", "duration", "long", "short", "early", "late", "conflict", "conflicts" } },
        { ClassManagement, new[] { "attendance", "attend", "discipline", "disciplined", "organization", "organize", "organized", "classroom", "class room", "management", "manage", "managed", "order", "chaos", "chaotic" } },
        { FacilityIssues, new[] { "room", "rooms", "projector", "projectors", "air conditioning", "airconditioning", "ac", "temperature", "hot", "cold", "facility", "facilities", "equipment", "wifi", "wi-fi", "internet", "connection", "working", "not working", "broken", "break" } },
        { Communication, new[] { "communication", "communicate", "response", "respond", "responses", "feedback", "contact", "support", "help", "reply", "replies", "reply", "answer", "answers", "unclear", "clear", "announcement", "announcements" } },
        { PositiveNoIssue, new[] { "satisfied", "satisfaction", "good", "great", "excellent", "excellence", "happy", "happiness", "no problem", "none", "perfect", "wonderful", "amazing", "helpful", "clear", "clearly", "well", "nice" } },
        { Other, Array.Empty<string>() }
    };

    public static bool IsValid(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return false;
        return DisplayNames.ContainsKey(category);
    }

    public static string GetDisplayName(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "Not Categorized";
        return DisplayNames.GetValueOrDefault(category, category);
    }

    public static string GetDescription(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "No description available";
        return Descriptions.GetValueOrDefault(category, "No description available");
    }

    public static string GuessCategory(string? text) =>
        GuessCategoryFromTexts(text);

    public static string GuessCategoryFromTexts(params string?[] texts)
    {
        if (texts == null || texts.Length == 0)
        {
            return Other;
        }

        // Combine all texts into one string for better matching
        var combinedText = string.Join(" ", texts.Where(t => !string.IsNullOrWhiteSpace(t))).ToLowerInvariant();
        
        if (string.IsNullOrWhiteSpace(combinedText))
        {
            return Other;
        }

        var scores = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var category in DisplayNames.Keys)
        {
            scores[category] = 0;
        }

        // Score each category based on keyword matches
        foreach (var kvp in Keywords)
        {
            var category = kvp.Key;
            var keywords = kvp.Value;
            if (keywords == null || keywords.Length == 0) continue;

            foreach (var keyword in keywords)
            {
                if (string.IsNullOrWhiteSpace(keyword)) continue;
                var lowerKeyword = keyword.ToLowerInvariant();
                
                // Exact word match (higher score)
                if (combinedText.Contains(" " + lowerKeyword + " ") || 
                    combinedText.StartsWith(lowerKeyword + " ") ||
                    combinedText.EndsWith(" " + lowerKeyword) ||
                    combinedText == lowerKeyword)
                {
                    scores[category] += 3; // Higher weight for exact word match
                }
                // Substring match (lower score)
                else if (combinedText.Contains(lowerKeyword))
                {
                    scores[category] += 1;
                }
            }
        }

        // Additional pattern matching for common phrases
        // Assessment Load patterns
        if (combinedText.Contains("workload") || combinedText.Contains("work load") ||
            combinedText.Contains("too much") || combinedText.Contains("too many") ||
            combinedText.Contains("homework") || combinedText.Contains("home work") ||
            combinedText.Contains("assignment") || combinedText.Contains("stress") ||
            combinedText.Contains("overwhelm") || combinedText.Contains("overwhelming"))
        {
            scores[AssessmentLoad] += 5;
        }

        // Teaching Quality patterns
        if (combinedText.Contains("pace") || combinedText.Contains("speed") ||
            combinedText.Contains("too fast") || combinedText.Contains("too slow") ||
            combinedText.Contains("explain") || combinedText.Contains("explanation") ||
            combinedText.Contains("teaching") || combinedText.Contains("lecturer") ||
            combinedText.Contains("teacher") || combinedText.Contains("confusing") ||
            combinedText.Contains("dont understand") || combinedText.Contains("don't understand") ||
            combinedText.Contains("do not understand") || combinedText.Contains("cannot understand") ||
            combinedText.Contains("can't understand") || combinedText.Contains("not understand") ||
            combinedText.Contains("not clear") || combinedText.Contains("not clear enough"))
        {
            scores[TeachingQuality] += 5;
        }

        // Facility Issues patterns
        if (combinedText.Contains("projector") || combinedText.Contains("temperature") ||
            combinedText.Contains("hot") || combinedText.Contains("cold") ||
            combinedText.Contains("facility") || combinedText.Contains("equipment") ||
            combinedText.Contains("wifi") || combinedText.Contains("room") ||
            combinedText.Contains("not working") || combinedText.Contains("broken"))
        {
            scores[FacilityIssues] += 5;
        }

        // Grading Fairness patterns
        if (combinedText.Contains("grading") || combinedText.Contains("grade") ||
            combinedText.Contains("rubric") || combinedText.Contains("policy") ||
            combinedText.Contains("unfair") || combinedText.Contains("fairness") ||
            combinedText.Contains("evaluation") || combinedText.Contains("score"))
        {
            scores[GradingFairness] += 5;
        }

        // Content Relevance patterns
        if ((combinedText.Contains("real") || combinedText.Contains("practical")) &&
            (combinedText.Contains("project") || combinedText.Contains("example") || combinedText.Contains("case")))
        {
            scores[ContentRelevance] += 5;
        }

        // Content Difficulty patterns
        if (combinedText.Contains("difficult") || combinedText.Contains("hard") ||
            combinedText.Contains("too easy") || combinedText.Contains("too hard") ||
            combinedText.Contains("complex") || combinedText.Contains("challenging") ||
            (combinedText.Contains("dont understand") || combinedText.Contains("don't understand") ||
             combinedText.Contains("do not understand") || combinedText.Contains("cannot understand") ||
             combinedText.Contains("can't understand") || combinedText.Contains("not understand")) &&
            (combinedText.Contains("lesson") || combinedText.Contains("content") || combinedText.Contains("material") ||
             combinedText.Contains("topic") || combinedText.Contains("subject") || combinedText.Contains("class")))
        {
            scores[ContentDifficulty] += 5;
        }

        // Schedule Timing patterns
        if (combinedText.Contains("schedule") || combinedText.Contains("time") ||
            combinedText.Contains("conflict") || combinedText.Contains("duration") ||
            combinedText.Contains("timing"))
        {
            scores[ScheduleTiming] += 5;
        }

        // Positive patterns
        if (combinedText.Contains("satisfied") || combinedText.Contains("good") ||
            combinedText.Contains("excellent") || combinedText.Contains("helpful") ||
            (combinedText.Contains("positive") && !combinedText.Contains("not")))
        {
            scores[PositiveNoIssue] += 5;
        }

        // Find the best match
        var best = scores
            .Where(x => x.Value > 0)
            .OrderByDescending(x => x.Value)
            .FirstOrDefault();

        return best.Value > 0 ? best.Key : Other;
    }
}

