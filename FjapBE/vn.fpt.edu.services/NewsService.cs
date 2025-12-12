using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using Microsoft.Extensions.DependencyInjection;

namespace FJAP.Services;

public class NewsService : INewsService
{
    private readonly INewsRepository _newsRepository;
    private readonly FjapDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly INotificationService _notificationService;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public NewsService(INewsRepository newsRepository, FjapDbContext context, IHttpClientFactory httpClientFactory, INotificationService notificationService, IServiceScopeFactory serviceScopeFactory)
    {
        _newsRepository = newsRepository;
        _context = context;
        _httpClientFactory = httpClientFactory;
        _notificationService = notificationService;
        _serviceScopeFactory = serviceScopeFactory;
    }


    public async Task<NewsDto> CreateAsync(CreateNewsRequest request, int userId)
    {
        // Validate image URL - reject shortened URLs
        string? imageUrl = null;
        if (!string.IsNullOrWhiteSpace(request.NewsImage))
        {
            var trimmedUrl = request.NewsImage.Trim();
            if (IsShortenedUrl(trimmedUrl))
            {
                throw new ArgumentException("Shortened URLs are not supported. Please use a direct image URL (must end with .jpg, .jpeg, .png, .gif, .webp or be a data:image/ URL).");
            }
            imageUrl = trimmedUrl;
        }

        var news = new News
        {
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            NewsImage = imageUrl,
            Status = "draft",
            CreatedBy = userId,
            CreatedAt = DateTime.Now,
            
        };

        await _newsRepository.AddAsync(news);
        await _newsRepository.SaveChangesAsync();

        return MapToDto(news);
    }

    public async Task<bool> UpdateAsync(int id, UpdateNewsRequest request, int userId, int? roleId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Head (roleId 2) có thể sửa bất kỳ status nào
        // Staff (roleId 6) chỉ được sửa khi status là draft, pending hoặc rejected (không cần là người tạo)
        if (roleId != 2) // Không phải Head
        {
            if (news.Status != "draft" && news.Status != "pending" && news.Status != "rejected")
                throw new InvalidOperationException("News can only be updated when status is 'draft', 'pending' or 'rejected'");
        }

        news.Title = request.Title.Trim();
        news.Content = request.Content?.Trim();
        
        // Validate image URL - reject shortened URLs
        if (!string.IsNullOrWhiteSpace(request.NewsImage))
        {
            var trimmedUrl = request.NewsImage.Trim();
            if (IsShortenedUrl(trimmedUrl))
            {
                throw new ArgumentException("Shortened URLs are not supported. Please use a direct image URL (must end with .jpg, .jpeg, .png, .gif, .webp or be a data:image/ URL).");
            }
            news.NewsImage = trimmedUrl;
        }
        else
        {
            news.NewsImage = null;
        }
        
        news.UpdatedBy = userId;
        news.UpdatedAt = DateTime.Now;

        _newsRepository.Update(news);
        await _newsRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SubmitForReviewAsync(int id, int userId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Chỉ được gửi duyệt khi status là draft và phải là người tạo
        if (news.Status != "draft")
            throw new InvalidOperationException("News can only be submitted when status is 'draft'");

        if (news.CreatedBy != userId)
            throw new UnauthorizedAccessException("You can only submit your own news");

        news.Status = "pending";
        news.UpdatedBy = userId;
        news.UpdatedAt = DateTime.Now;

        _newsRepository.Update(news);
        await _newsRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ApproveAsync(int id, int headUserId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Chỉ được duyệt khi status là pending
        if (news.Status != "pending")
            throw new InvalidOperationException("News can only be approved when status is 'pending'");

        news.Status = "published";
        news.ApprovedBy = headUserId;
        news.ApprovedAt = DateTime.Now;
        news.UpdatedBy = headUserId;
        news.UpdatedAt = DateTime.Now;

        _newsRepository.Update(news);
        await _newsRepository.SaveChangesAsync();

        // Gửi notification ở background (fire-and-forget) để không block response
        // Sử dụng service scope factory để tạo scope mới cho background task
        var newsId = news.Id;
        var newsTitle = news.Title;
        var newsContent = news.Content;
        var approvedBy = news.ApprovedBy;
        
        _ = Task.Run(async () =>
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            try
            {
                var scopedNotificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var scopedContext = scope.ServiceProvider.GetRequiredService<FjapDbContext>();
                
                // Reload news trong scope mới để đảm bảo có đầy đủ thông tin
                var scopedNews = await scopedContext.News.FirstOrDefaultAsync(n => n.Id == newsId);
                if (scopedNews != null)
                {
                    await SendNewsPublishedNotificationsAsync(scopedNews, scopedNotificationService, scopedContext);
                }
            }
            catch (Exception ex)
            {
                // Log error nhưng không throw để không ảnh hưởng đến flow chính
                Console.WriteLine($"Error sending notifications: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        });

        return true;
    }

    private async Task SendNewsPublishedNotificationsAsync(News news, INotificationService notificationService, FjapDbContext context)
    {
        try
        {
            // Lấy tất cả users có role là Student (roleId = 4) hoặc Lecturer (roleId = 3)
            var targetUsers = await context.Users
                .Where(u => u.RoleId == 3 || u.RoleId == 4) // Lecturer hoặc Student
                .Select(u => u.UserId)
                .ToListAsync();

            if (targetUsers.Count == 0) return;

            var notifications = targetUsers.Select(userId => new CreateNotificationRequest(
                userId,
                $"New News: {news.Title}",
                news.Content?.Length > 200 ? news.Content.Substring(0, 200) + "..." : news.Content,
                "News",
                news.ApprovedBy,
                news.Id
            )).ToList();

            // Tạo notifications và broadcast
            var createdNotifications = new List<NotificationDto>();
            foreach (var notificationRequest in notifications)
            {
                var notification = await notificationService.CreateAsync(notificationRequest, broadcast: false);
                createdNotifications.Add(notification);
            }

            // Broadcast tất cả notifications cùng lúc
            await notificationService.BroadcastAsync(createdNotifications);
        }
        catch (Exception ex)
        {
            // Log error nhưng không throw để không ảnh hưởng đến flow chính
            Console.WriteLine($"Error sending notifications: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }
    }

    public async Task<bool> RejectAsync(int id, string reviewComment, int headUserId)
    {
        // Sử dụng _context.News trực tiếp để đảm bảo entity được track đúng cách
        var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
        if (news == null) return false;

        // Chỉ được từ chối khi status là pending
        if (news.Status != "pending")
            throw new InvalidOperationException("News can only be rejected when status is 'pending'");

        if (string.IsNullOrWhiteSpace(reviewComment))
            throw new ArgumentException("Review comment is required when rejecting");

        // Set properties - entity đã được track nên không cần mark IsModified
        news.Status = "rejected";
        news.ReviewComment = reviewComment.Trim();
        news.ApprovedBy = headUserId; // Set ApprovedBy khi reject (người đã review)
        news.ApprovedAt = DateTime.Now; // Set ApprovedAt khi reject (thời gian review)
        news.UpdatedBy = headUserId;
        news.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, int userId, int? roleId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Head (roleId 2) có thể xóa pending, published, rejected (không được xóa draft)
        if (roleId == 2)
        {
            if (news.Status == "draft")
                throw new InvalidOperationException("Head cannot delete draft news");
            // Head có thể xóa pending, published, rejected
        }
        // Staff (roleId 6) chỉ xóa được draft, pending, published, rejected
        else if (roleId == 6)
        {
            // Staff chỉ xóa được khi status là draft, pending, published hoặc rejected (không cần là người tạo)
            if (news.Status != "draft" && news.Status != "pending" && news.Status != "published" && news.Status != "rejected")
                throw new InvalidOperationException("News can only be deleted when status is 'draft', 'pending', 'published' or 'rejected'");
        }
        else
        {
            throw new UnauthorizedAccessException("Only Head or Staff can delete news");
        }

        _newsRepository.Remove(news);
        await _newsRepository.SaveChangesAsync();
        return true;
    }

    public async Task<(IEnumerable<NewsListDto> Items, int Total)> GetAllAsync(int? userId, int? roleId, string? status = null, int page = 1, int pageSize = 20)
    {
        IQueryable<News> query = _context.News.AsNoTracking();

        // Phân quyền filter
        // Staff (roleId 6) và Head (roleId 2) - xem tất cả tin
        if (roleId == 3 || roleId == 4) // Lecturer hoặc Student - chỉ xem published
        {
            query = query.Where(n => n.Status == "published");
        }
        // Head (roleId == 2) - xem tất cả trừ draft
        else if (roleId == 2)
        {
            query = query.Where(n => n.Status != "draft");
        }

        // Filter by status nếu có
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(n => n.Status == status);
        }

        var total = await query.CountAsync();
        var newsList = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(n => n.CreatedByNavigation)
            .ToListAsync();

        var items = newsList.Select(n => new NewsListDto
        {
            Id = n.Id,
            Title = n.Title,
            Content = n.Content,
            NewsImage = n.NewsImage,
            Status = n.Status,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt,
            CreatedBy = n.CreatedBy,
            CreatorName = n.CreatedByNavigation != null 
                ? $"{n.CreatedByNavigation.FirstName} {n.CreatedByNavigation.LastName}" 
                : null,
            CreatorEmail = n.CreatedByNavigation?.Email ?? null
        });

        return (items, total);
    }

    public async Task<NewsDto?> GetByIdAsync(int id, int? userId, int? roleId)
    {
        var news = await _newsRepository.FirstOrDefaultAsync(
            n => n.Id == id,
            includeProperties: "CreatedByNavigation,ApprovedByNavigation,UpdatedByNavigation",
            noTracking: true);

        if (news == null) return null;

        // Phân quyền check
        // Staff (roleId 6) và Head (roleId 2) - xem tất cả tin
        if (roleId == 3 || roleId == 4) // Lecturer hoặc Student - chỉ xem published
        {
            if (news.Status != "published")
                throw new UnauthorizedAccessException("You can only view published news");
        }
        // Head (roleId == 2) - xem tất cả, không check

        return MapToDto(news);
    }

    private NewsDto MapToDto(News news)
    {
        return new NewsDto
        {
            Id = news.Id,
            Title = news.Title,
            Content = news.Content,
            NewsImage = news.NewsImage,
            Status = news.Status,
            ReviewComment = news.ReviewComment,
            CreatedBy = news.CreatedBy,
            UpdatedBy = news.UpdatedBy,
            ApprovedBy = news.ApprovedBy,
            ApprovedAt = news.ApprovedAt,
            CreatedAt = news.CreatedAt,
            UpdatedAt = news.UpdatedAt,
            CreatedByNavigation = news.CreatedByNavigation != null
                ? new { news.CreatedByNavigation.UserId, news.CreatedByNavigation.FirstName, news.CreatedByNavigation.LastName, news.CreatedByNavigation.Email }
                : null,
            ApprovedByNavigation = news.ApprovedByNavigation != null
                ? new { news.ApprovedByNavigation.UserId, news.ApprovedByNavigation.FirstName, news.ApprovedByNavigation.LastName, news.ApprovedByNavigation.Email }
                : null,
            UpdatedByNavigation = news.UpdatedByNavigation != null
                ? new { news.UpdatedByNavigation.UserId, news.UpdatedByNavigation.FirstName, news.UpdatedByNavigation.LastName, news.UpdatedByNavigation.Email }
                : null
        };
    }

    /// <summary>
    /// Checks if a URL is a shortened URL that should be rejected
    /// </summary>
    private bool IsShortenedUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        // Data URLs are always valid
        if (url.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            return false;

        // Check if URL matches known shortened URL patterns
        var shortenedUrlPatterns = new[]
        {
            "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
            "short.link", "is.gd", "v.gd", "rebrand.ly", "cutt.ly",
            "byvn.net", "tiny.cc", "shorturl.at", "rebrandly.com", "short.cm",
            "adf.ly", "bc.vc", "bit.do", "clicky.me", "soo.gd", "s.id"
        };

        var isShortenedUrl = shortenedUrlPatterns.Any(pattern => 
            url.Contains(pattern, StringComparison.OrdinalIgnoreCase));

        if (isShortenedUrl)
            return true;

        // Check if URL is suspiciously short and doesn't have image extension
        var hasImageExtension = url.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".jpg", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".png", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".gif", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".webp", StringComparison.OrdinalIgnoreCase);

        // If URL is short (< 50 chars), doesn't have image extension, and is an HTTP(S) URL, likely shortened
        var isSuspiciouslyShort = url.Length < 50 && !hasImageExtension && 
                                  (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
                                   url.StartsWith("https://", StringComparison.OrdinalIgnoreCase));

        return isSuspiciouslyShort;
    }

    /// <summary>
    /// Resolves shortened URLs (bit.ly, tinyurl, etc.) to their final destination URL
    /// DEPRECATED: No longer used, shortened URLs are now rejected
    /// </summary>
    private async Task<string?> ResolveShortenedUrlAsync(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        // If it's already a direct image URL or data URL, return as is
        if (url.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            return url;

        // Check if URL looks like a shortened URL (common patterns)
        var shortenedUrlPatterns = new[]
        {
            "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
            "short.link", "is.gd", "v.gd", "rebrand.ly", "cutt.ly",
            "byvn.net", "tiny.cc", "shorturl.at", "rebrandly.com", "short.cm",
            "adf.ly", "bc.vc", "bit.do", "clicky.me", "soo.gd", "s.id"
        };

        // Check if URL matches known shortened URL patterns
        var isShortenedUrl = shortenedUrlPatterns.Any(pattern => 
            url.Contains(pattern, StringComparison.OrdinalIgnoreCase));

        // Also check if URL is suspiciously short and doesn't have image extension
        // Shortened URLs are typically short and don't end with image extensions
        var hasImageExtension = url.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ||
                               url.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".jpg", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".png", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".gif", StringComparison.OrdinalIgnoreCase) ||
                               url.Contains(".webp", StringComparison.OrdinalIgnoreCase);

        // If URL is short (< 50 chars), doesn't have image extension, and looks like a link, try to resolve it
        var isSuspiciouslyShort = url.Length < 50 && !hasImageExtension && 
                                  (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
                                   url.StartsWith("https://", StringComparison.OrdinalIgnoreCase));

        // If it doesn't look like a shortened URL and isn't suspiciously short, return as is
        if (!isShortenedUrl && !isSuspiciouslyShort)
            return url;

        try
        {
            // Create HttpClient with redirect following enabled
            using var httpClientHandler = new System.Net.Http.HttpClientHandler
            {
                AllowAutoRedirect = true,
                MaxAutomaticRedirections = 10
            };
            using var httpClient = new System.Net.Http.HttpClient(httpClientHandler);
            httpClient.Timeout = TimeSpan.FromSeconds(15);
            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            // Try HEAD request first (more efficient)
            try
            {
                using var headRequest = new HttpRequestMessage(HttpMethod.Head, url);
                using var headResponse = await httpClient.SendAsync(headRequest, HttpCompletionOption.ResponseHeadersRead);
                
                // Get the final URL after redirects - response.RequestMessage.RequestUri contains final URL
                var finalUrl = headResponse.RequestMessage?.RequestUri?.ToString();
                
                // If we got redirected and the final URL is different, return it
                if (!string.IsNullOrWhiteSpace(finalUrl) && finalUrl != url)
                {
                    return finalUrl;
                }
            }
            catch
            {
                // If HEAD fails, try GET request (some servers don't support HEAD)
                try
                {
                    using var getRequest = new HttpRequestMessage(HttpMethod.Get, url);
                    // Only read headers, not the full content
                    using var getResponse = await httpClient.SendAsync(getRequest, HttpCompletionOption.ResponseHeadersRead);
                    
                    // Get the final URL after redirects
                    var finalUrl = getResponse.RequestMessage?.RequestUri?.ToString();
                    
                    // If we got redirected and the final URL is different, return it
                    if (!string.IsNullOrWhiteSpace(finalUrl) && finalUrl != url)
                    {
                        return finalUrl;
                    }
                }
                catch
                {
                    // If both fail, return original URL
                }
            }
            
            // If no redirect or error, return original URL
            return url;
        }
        catch (Exception ex)
        {
            // Log error but don't fail - return original URL
            Console.WriteLine($"Error resolving shortened URL {url}: {ex.Message}");
            return url;
        }
    }
}

