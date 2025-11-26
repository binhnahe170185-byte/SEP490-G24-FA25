using FJAP.DTOs;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class AIService : IAIService
{
    private readonly FjapDbContext _context;
    private readonly IAIProvider _aiProvider;

    public AIService(FjapDbContext context, IAIProvider aiProvider)
    {
        _context = context;
        _aiProvider = aiProvider;
    }

    public async Task<AIChatResponse> ChatWithStudentAsync(AIChatRequest request, int studentId)
    {
        string aiResponse;
        string enhancedContext = request.Context ?? "";
        
        try
        {
            // Tự động thêm context về homework và deadline nếu user hỏi về deadline/homework
            var messageLower = request.Message.ToLower();
            if (messageLower.Contains("deadline") || messageLower.Contains("hạn nộp") || 
                messageLower.Contains("homework") || messageLower.Contains("bài tập") ||
                messageLower.Contains("assignment") || messageLower.Contains("bài tập"))
            {
                var homeworkContext = await GetHomeworkContextForStudentAsync(studentId);
                if (!string.IsNullOrEmpty(homeworkContext))
                {
                    enhancedContext = string.IsNullOrEmpty(enhancedContext) 
                        ? homeworkContext 
                        : $"{enhancedContext}\n\n{homeworkContext}";
                }
            }
            
            // AI Provider (FallbackAIProvider) sẽ tự động fallback nếu OpenAI fail
            aiResponse = await _aiProvider.ChatAsync(request.Message, enhancedContext);
        }
        catch (Exception ex)
        {
            // Nếu cả primary và fallback đều fail, trả về message lỗi
            Console.WriteLine($"AI Provider error (both primary and fallback failed): {ex.Message}");
            aiResponse = "Xin lỗi, tôi đang gặp sự cố kỹ thuật. " +
                       "Vui lòng thử lại sau hoặc liên hệ với giảng viên để được hỗ trợ.\n\n" +
                       "Trong lúc chờ đợi, bạn có thể:\n" +
                       "• Xem lại tài liệu học tập\n" +
                       "• Liên hệ trực tiếp với giảng viên\n" +
                       "• Kiểm tra thông báo từ hệ thống";
        }

        var chatResponse = new AIChatResponse
        {
            Response = aiResponse,
            Timestamp = DateTime.Now
        };

        return chatResponse;
    }

    /// <summary>
    /// Lấy context về homework và deadline cho student để AI có thể trả lời
    /// </summary>
    private async Task<string> GetHomeworkContextForStudentAsync(int studentId)
    {
        try
        {
            // Lấy các class mà student đang học bằng subquery
            var now = DateTime.Now;
            var upcomingHomeworks = await _context.Homeworks
                .Include(h => h.Lesson)
                    .ThenInclude(l => l.Class)
                        .ThenInclude(c => c.Subject)
                .Where(h => _context.Students
                        .Where(s => s.StudentId == studentId)
                        .SelectMany(s => s.Classes)
                        .Select(c => c.ClassId)
                        .Contains(h.Lesson.ClassId) &&
                       h.Deadline.HasValue &&
                       h.Deadline.Value >= now)
                .OrderBy(h => h.Deadline)
                .Take(10) // Chỉ lấy 10 homework gần nhất
                .Select(h => new
                {
                    Title = h.Title,
                    Subject = h.Lesson.Class.Subject.SubjectName,
                    Deadline = h.Deadline!.Value,
                    DaysLeft = (int)(h.Deadline.Value - now).TotalDays
                })
                .ToListAsync();

            if (!upcomingHomeworks.Any())
            {
                return "Sinh viên hiện không có bài tập nào có deadline sắp tới.";
            }

            var context = "Thông tin về bài tập và deadline của sinh viên:\n\n";
            foreach (var hw in upcomingHomeworks)
            {
                var urgency = hw.DaysLeft <= 1 ? "⚠️ URGENT" : hw.DaysLeft <= 3 ? "🔴 Sớm" : "";
                context += $"- {hw.Title} ({hw.Subject})\n";
                context += $"  Deadline: {hw.Deadline:dd/MM/yyyy HH:mm} ({hw.DaysLeft} ngày còn lại) {urgency}\n\n";
            }

            return context;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting homework context: {ex.Message}");
            return "";
        }
    }
}
