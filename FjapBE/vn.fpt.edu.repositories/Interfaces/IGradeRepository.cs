using FJAP.vn.fpt.edu.models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FJAP.Repositories.Interfaces
{
    public interface IGradeRepository : IGenericRepository<Grade>
    {
        /// <summary>
        /// Lấy danh sách grade với filter và phân trang
        /// </summary>
        Task<PagedResult<GradeListDto>> GetGradesWithFilterAsync(GradeFilterRequest filter);

        /// <summary>
        /// Lấy chi tiết grade của 1 sinh viên trong 1 môn học
        /// </summary>
        Task<GradeDetailDto?> GetGradeDetailAsync(int gradeId);

        /// <summary>
        /// Lấy options cho filter (subjects, levels, semesters)
        /// </summary>
        Task<GradeFilterOptions> GetFilterOptionsAsync();

        /// <summary>
        /// Cập nhật trạng thái của grade
        /// </summary>
        Task UpdateGradeStatusAsync(int gradeId, string status);

        /// <summary>
        /// Lấy thống kê tổng quan về điểm
        /// </summary>
        Task<GradeStatisticsDto> GetGradeStatisticsAsync(GradeFilterRequest? filter = null);

        /// <summary>
        /// Kiểm tra xem grade có tồn tại không
        /// </summary>
        Task<bool> GradeExistsAsync(int studentId, int subjectId);
    }
}