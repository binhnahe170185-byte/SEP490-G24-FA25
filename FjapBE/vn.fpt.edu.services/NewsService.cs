using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class NewsService : INewsService
{
    private readonly INewsRepository _newsRepository;
    private readonly FjapDbContext _context;

    public NewsService(INewsRepository newsRepository, FjapDbContext context)
    {
        _newsRepository = newsRepository;
        _context = context;
    }

    public async Task<NewsDto> CreateAsync(CreateNewsRequest request, int userId)
    {
        var news = new News
        {
            Title = request.Title.Trim(),
            Content = request.Content?.Trim(),
            NewsImage = request.NewsImage?.Trim(),
            Status = "draft",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
        news.NewsImage = request.NewsImage?.Trim();
        news.UpdatedBy = userId;
        news.UpdatedAt = DateTime.UtcNow;

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
        news.UpdatedAt = DateTime.UtcNow;

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
        news.ApprovedAt = DateTime.UtcNow;
        news.UpdatedBy = headUserId;
        news.UpdatedAt = DateTime.UtcNow;

        _newsRepository.Update(news);
        await _newsRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectAsync(int id, string reviewComment, int headUserId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Chỉ được từ chối khi status là pending
        if (news.Status != "pending")
            throw new InvalidOperationException("News can only be rejected when status is 'pending'");

        if (string.IsNullOrWhiteSpace(reviewComment))
            throw new ArgumentException("Review comment is required when rejecting");

        news.Status = "rejected";
        news.ReviewComment = reviewComment.Trim();
        news.UpdatedBy = headUserId;
        news.UpdatedAt = DateTime.UtcNow;

        _newsRepository.Update(news);
        await _newsRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, int userId, int? roleId)
    {
        var news = await _newsRepository.GetByIdAsync(id);
        if (news == null) return false;

        // Head (roleId 2) có thể xóa bất kỳ status nào
        // Staff (roleId 6) chỉ xóa được khi status là draft, pending, published hoặc rejected và phải là người tạo
        if (roleId != 2) // Không phải Head
        {
            if (news.Status != "draft" && news.Status != "pending" && news.Status != "published" && news.Status != "rejected")
                throw new InvalidOperationException("News can only be deleted when status is 'draft', 'pending', 'published' or 'rejected'");

            if (news.CreatedBy != userId)
                throw new UnauthorizedAccessException("You can only delete your own news");
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
        // Head (roleId == 2) - xem tất cả, không filter

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
}

