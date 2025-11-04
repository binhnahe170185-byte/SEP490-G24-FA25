using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface INewsService
{
    Task<NewsDto> CreateAsync(CreateNewsRequest request, int userId);
    Task<bool> UpdateAsync(int id, UpdateNewsRequest request, int userId, int? roleId);
    Task<bool> SubmitForReviewAsync(int id, int userId);
    Task<bool> ApproveAsync(int id, int headUserId);
    Task<bool> RejectAsync(int id, string reviewComment, int headUserId);
    Task<bool> DeleteAsync(int id, int userId, int? roleId);
    Task<(IEnumerable<NewsListDto> Items, int Total)> GetAllAsync(int? userId, int? roleId, string? status = null, int page = 1, int pageSize = 20);
    Task<NewsDto?> GetByIdAsync(int id, int? userId, int? roleId);
}

