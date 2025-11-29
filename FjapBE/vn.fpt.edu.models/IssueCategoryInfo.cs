using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

/// <summary>
/// Helper mappings between IssueCategory enum, code (C1..F1) and display name.
/// </summary>
public static class IssueCategoryInfo
{
    private static readonly Dictionary<IssueCategory, (string Code, string Name)> Map =
        new()
        {
            { IssueCategory.C1_TeachingClarity, ("C1", "Teaching Clarity") },
            { IssueCategory.C2_Pacing, ("C2", "Pacing") },
            { IssueCategory.C3_EngagementInteraction, ("C3", "Engagement & Interaction") },
            { IssueCategory.C4_InstructorSupport, ("C4", "Instructor Support") },
            { IssueCategory.M1_MaterialsResources, ("M1", "Materials & Resources Quality") },
            { IssueCategory.A1_AssessmentWorkload, ("A1", "Assessment & Workload Fairness") },
            { IssueCategory.T1_TechnicalSystem, ("T1", "Technical / System Issues") },
            { IssueCategory.F1_FacilitiesEnvironment, ("F1", "Facilities / Classroom Environment") },
            { IssueCategory.Unknown, ("UNK", "Unknown") }
        };

    public static string GetCode(IssueCategory category)
    {
        return Map[category].Code;
    }

    public static string GetName(IssueCategory category)
    {
        return Map[category].Name;
    }

    public static IssueCategory FromCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return IssueCategory.Unknown;
        }

        foreach (var kvp in Map)
        {
            if (string.Equals(kvp.Value.Code, code, StringComparison.OrdinalIgnoreCase))
            {
                return kvp.Key;
            }
        }

        return IssueCategory.Unknown;
    }
    
    /// <summary>
    /// Gets display name for a category code (C1..F1)
    /// </summary>
    public static string GetDisplayName(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return "Unknown";
        }
        
        var category = FromCode(code);
        return GetName(category);
    }
    
    /// <summary>
    /// Gets full display name with code (e.g., "C1 - Teaching Clarity")
    /// </summary>
    public static string GetDisplayNameWithCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return "UNK - Unknown";
        }
        
        var category = FromCode(code);
        var name = GetName(category);
        var actualCode = GetCode(category);
        return $"{actualCode} - {name}";
    }
    
    /// <summary>
    /// Gets description for a category code (C1..F1)
    /// </summary>
    public static string GetDescription(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return "No description available";
        }
        
        var category = FromCode(code);
        return category switch
        {
            IssueCategory.C1_TeachingClarity => "Issues about unclear explanations, confusing lectures, lack of examples, or difficulty understanding the teaching content.",
            IssueCategory.C2_Pacing => "Issues about teaching speed being too fast or too slow, difficulty keeping up with the pace, or rushing through material.",
            IssueCategory.C3_EngagementInteraction => "Issues about low interaction, boring sessions, few chances to ask questions or discuss, lack of engagement.",
            IssueCategory.C4_InstructorSupport => "Issues about slow responses from instructor, lack of help, not answering questions, or lack of guidance and support.",
            IssueCategory.M1_MaterialsResources => "Issues about slides, documents, examples, practice resources being missing, low quality, or hard to use.",
            IssueCategory.A1_AssessmentWorkload => "Issues about quizzes, exams, assignments, grading, workload, deadlines being too heavy, unfair, or unclear.",
            IssueCategory.T1_TechnicalSystem => "Issues about LMS, platform, software, links, files, online tools not working or technical problems.",
            IssueCategory.F1_FacilitiesEnvironment => "Issues about classroom environment such as temperature, noise, projector, audio, seating, wifi, or physical space problems.",
            IssueCategory.Unknown => "Category could not be determined or feedback does not fit into any specific category.",
            _ => "No description available"
        };
    }
}


