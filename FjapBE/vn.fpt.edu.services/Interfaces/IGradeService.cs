using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using System.Threading.Tasks;

namespace FJAP.Services.Interfaces
{
    public interface IGradeService
    {
        /// <summary>
        /// Lấy danh sách grades với filter và phân trang
        /// </summary>
        Task<PagedResult<GradeListDto>> GetGradesAsync(GradeFilterRequest filter);

        /// <summary>
        /// Lấy chi tiết grade theo ID
        /// </summary>
        Task<GradeDetailDto?> GetGradeByIdAsync(int gradeId);

        /// <summary>
        /// Lấy options cho filter dropdown
        /// </summary>
        Task<GradeFilterOptions> GetFilterOptionsAsync();

        /// <summary>
        /// Cập nhật trạng thái grade
        /// </summary>
        Task<bool> UpdateGradeStatusAsync(int gradeId, string status);

        /// <summary>
        /// Lấy thống kê về điểm
        /// </summary>
        Task<GradeStatisticsDto> GetStatisticsAsync(GradeFilterRequest? filter = null);

        /// <summary>
        /// Tính toán lại final score cho một grade
        /// </summary>
        Task RecalculateFinalScoreAsync(int gradeId);

        /// <summary>
        /// Export danh sách grades ra Excel/CSV
        /// </summary>
        Task<byte[]> ExportGradesToExcelAsync(GradeFilterRequest filter);

        /// <summary>
        /// Cập nhật điểm thành phần của grade
        /// </summary>
        Task<bool> UpdateGradeComponentsAsync(UpdateGradeComponentsRequest request);
        Task<DashboardChartDataDto> GetDashboardChartsAsync(GradeFilterRequest filter);
        
    }
}