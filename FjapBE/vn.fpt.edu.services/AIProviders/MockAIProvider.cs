using FJAP.Services.Interfaces;

namespace FJAP.Services.AIProviders;

public class MockAIProvider : IAIProvider
{
    public Task<string> ChatAsync(string message, string? context = null)
    {
        var response = message.ToLower();

        string aiResponse;
        if (response.Contains("deadline") || response.Contains("hạn nộp") || response.Contains("homework"))
        {
            aiResponse = "You have 2 assignments coming up:\n" +
                        "1. Japanese N5 - Assignment 1: Due in 2 days\n" +
                        "2. Japanese N4 - Quiz 1: Due in 5 days\n" +
                        "Would you like me to remind you?";
        }
        else if (response.Contains("khó") || response.Contains("difficult") || response.Contains("help"))
        {
            aiResponse = "I understand you're having difficulties. Please let me know specifically about:\n" +
                        "- What part are you struggling with?\n" +
                        "- What methods have you tried?\n\n" +
                        "I can suggest study materials or recommend that you contact your lecturer.";
        }
        else if (response.Contains("tài liệu") || response.Contains("material") || response.Contains("document"))
        {
            aiResponse = "Here are some study materials you can refer to:\n" +
                        "1. Japanese N5 Textbook (PDF)\n" +
                        "2. Grammar Exercises\n" +
                        "3. Vocabulary List\n\n" +
                        "Would you like me to send you the download links?";
        }
        else if (response.Contains("chào") || response.Contains("hello") || response.Contains("xin chào"))
        {
            aiResponse = "Hello! Nice to meet you. I am AI Study Companion, always ready to support you in your studies.\n\n" +
                        "Do you have any questions about lessons, need deadline reminders, want to find materials, or need study advice? Just ask! 😊";
        }
        else
        {
            aiResponse = "Thank you for contacting me. I'm learning to support you better.\n" +
                        "Currently, I can help you with:\n" +
                        "- Information about homework deadlines\n" +
                        "- Study material suggestions\n" +
                        "- Basic study advice\n\n" +
                        "You can ask me about these topics!";
        }

        return Task.FromResult(aiResponse);
    }
}



