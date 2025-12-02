// using System;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;
// using FJAP.DTOs;
// using FJAP.Repositories.Interfaces;
// using FJAP.Services.Interfaces;
// using FJAP.vn.fpt.edu.models;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.Extensions.Logging;

// namespace FJAP.Services;

// public class FeedbackCheckService : IFeedbackCheckService
// {
//     private readonly FjapDbContext _context;
//     private readonly IFeedbackRepository _feedbackRepository;
//     private readonly ILogger<FeedbackCheckService>? _logger;

//     public FeedbackCheckService(
//         FjapDbContext context,
//         IFeedbackRepository feedbackRepository,
//         ILogger<FeedbackCheckService>? logger = null)
//     {
//         _context = context;
//         _feedbackRepository = feedbackRepository;
//         _logger = logger;
//     }

//     public async Task<IEnumerable<PendingFeedbackClassDto>> GetPendingFeedbackClassesAsync(int studentId)
//     {
//         try
//         {
//             var today = DateOnly.FromDateTime(DateTime.UtcNow);
//             var thresholdDate = today.AddDays(7);

//             // Get classes where student is enrolled, semester end date is within 7 days, and class is active
//             var classesNeedingFeedback = await _context.Classes
//                 .AsNoTracking()
//                 .Include(c => c.Semester)
//                 .Include(c => c.Students)
//                 .Include(c => c.Subject)
//                 .Where(c => c.Students.Any(s => s.StudentId == studentId)
//                     && c.Semester.EndDate <= thresholdDate
//                     && c.Semester.EndDate >= today
//                     && c.Status == "Active")
//                 .ToListAsync();

//             var pendingClasses = new List<PendingFeedbackClassDto>();

//             foreach (var cls in classesNeedingFeedback)
//             {
//                 // Check if feedback already submitted
//                 var hasFeedback = await _feedbackRepository.GetByStudentAndClassAsync(studentId, cls.ClassId);
//                 if (hasFeedback == null)
//                 {
//                     var daysUntilEnd = (cls.Semester.EndDate.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow).Days;
//                     pendingClasses.Add(new PendingFeedbackClassDto(
//                         cls.ClassId,
//                         cls.ClassName,
//                         cls.Subject?.SubjectName ?? "Unknown Subject",
//                         cls.Subject?.SubjectCode,
//                         daysUntilEnd
//                     ));
//                 }
//             }

//             return pendingClasses.OrderBy(c => c.DaysUntilEnd);
//         }
//         catch (Exception ex)
//         {
//             _logger?.LogError(ex, "Error getting pending feedback classes for student {StudentId}", studentId);
//             return new List<PendingFeedbackClassDto>();
//         }
//     }

//     public async Task<bool> HasPendingFeedbackAsync(int studentId)
//     {
//         var pending = await GetPendingFeedbackClassesAsync(studentId);
//         return pending.Any();
//     }
// }

