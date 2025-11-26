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
            aiResponse = "Bạn có 2 bài tập sắp đến hạn:\n" +
                        "1. Japanese N5 - Assignment 1: Due in 2 days\n" +
                        "2. Japanese N4 - Quiz 1: Due in 5 days\n" +
                        "Bạn có muốn tôi nhắc nhở bạn không?";
        }
        else if (response.Contains("khó") || response.Contains("difficult") || response.Contains("help"))
        {
            aiResponse = "Tôi hiểu bạn đang gặp khó khăn. Hãy cho tôi biết cụ thể về:\n" +
                        "- Bạn đang gặp vấn đề ở phần nào?\n" +
                        "- Bạn đã thử những cách nào rồi?\n\n" +
                        "Tôi có thể gợi ý tài liệu học tập hoặc đề xuất bạn liên hệ với giảng viên.";
        }
        else if (response.Contains("tài liệu") || response.Contains("material") || response.Contains("document"))
        {
            aiResponse = "Dưới đây là các tài liệu học tập bạn có thể tham khảo:\n" +
                        "1. Japanese N5 Textbook (PDF)\n" +
                        "2. Grammar Exercises\n" +
                        "3. Vocabulary List\n\n" +
                        "Bạn có muốn tôi gửi link tải xuống không?";
        }
        else if (response.Contains("chào") || response.Contains("hello") || response.Contains("xin chào"))
        {
            aiResponse = "Xin chào! Tôi là AI Study Companion của bạn. Tôi có thể giúp bạn:\n" +
                        "📚 Trả lời câu hỏi về bài học\n" +
                        "📝 Nhắc nhở deadline bài tập\n" +
                        "💡 Gợi ý tài liệu học tập\n" +
                        "🎯 Tư vấn cách học hiệu quả\n\n" +
                        "Bạn cần hỗ trợ gì hôm nay?";
        }
        else
        {
            aiResponse = "Cảm ơn bạn đã liên hệ. Tôi đang học hỏi để hỗ trợ bạn tốt hơn.\n" +
                        "Hiện tại tôi có thể giúp bạn với:\n" +
                        "- Thông tin về deadline bài tập\n" +
                        "- Gợi ý tài liệu học tập\n" +
                        "- Tư vấn học tập cơ bản\n\n" +
                        "Bạn có thể hỏi tôi về những chủ đề này!";
        }

        return Task.FromResult(aiResponse);
    }
}



