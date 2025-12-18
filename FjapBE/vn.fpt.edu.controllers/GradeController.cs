using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.Security.Claims;

namespace FJAP.Controllers.Manager
{
    [ApiController]
    [Route("api/manager/grades")]
    public class GradeController : ControllerBase
    {
        private readonly IGradeService _gradeService;

        public GradeController(IGradeService gradeService)
        {
            _gradeService = gradeService;
        }

        /// <summary>
        /// Lấy danh sách grades với filter và phân trang
        /// GET: api/manager/grades
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetGrades([FromQuery] GradeFilterRequest filter)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    filter.UserId = userId;
                }

                var result = await _gradeService.GetGradesAsync(filter);
                return Ok(new
                {
                    code = 200,
                    message = "Success",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Lấy chi tiết grade theo ID
        /// GET: api/manager/grades/{id}
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetGradeById(int id)
        {
            try
            {
                var grade = await _gradeService.GetGradeByIdAsync(id);
                if (grade == null)
                {
                    return NotFound(new
                    {
                        code = 404,
                        message = $"Grade with ID {id} not found"
                    });
                }

                return Ok(new
                {
                    code = 200,
                    message = "Success",
                    data = grade
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Lấy options cho filter dropdown
        /// GET: api/manager/grades/filter-options
        /// </summary>
        [HttpGet("filter-options")]
        public async Task<IActionResult> GetFilterOptions()
        {
            try
            {
                var options = await _gradeService.GetFilterOptionsAsync();
                return Ok(new
                {
                    code = 200,
                    message = "Success",
                    data = options
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Cập nhật trạng thái của grade
        /// PATCH: api/manager/grades/{id}/status
        /// </summary>
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateGradeStatus(int id, [FromBody] UpdateGradeStatusRequest request)
        {
            try
            {
                var success = await _gradeService.UpdateGradeStatusAsync(id, request.Status);
                if (!success)
                {
                    return NotFound(new
                    {
                        code = 404,
                        message = $"Grade with ID {id} not found"
                    });
                }

                return Ok(new
                {
                    code = 200,
                    message = "Grade status updated successfully"
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    code = 500,
                    message = $"Internal server error: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Lấy thống kê về điểm
        /// GET: api/manager/grades/statistics
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics([FromQuery] GradeFilterRequest? filter = null)
        {
            try
            {
                var stats = await _gradeService.GetStatisticsAsync(filter);
                return Ok(new
                {
                    code = 200,
                    message = "Success",
                    data = stats
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Tính lại điểm tổng kết cho một grade
        /// POST: api/manager/grades/{id}/recalculate
        /// </summary>
        [HttpPost("{id:int}/recalculate")]
        public async Task<IActionResult> RecalculateFinalScore(int id)
        {
            try
            {
                await _gradeService.RecalculateFinalScoreAsync(id);
                return Ok(new
                {
                    code = 200,
                    message = "Final score recalculated successfully"
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    code = 404,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    code = 500,
                    message = $"Internal server error: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Export danh sách grades ra Excel
        /// GET: api/manager/grades/export
        /// </summary>
        [HttpGet("export")]
        public async Task<IActionResult> ExportToExcel([FromQuery] GradeFilterRequest filter)
        {
            try
            {
                var fileBytes = await _gradeService.ExportGradesToExcelAsync(filter);
                var fileName = $"Grades_Export_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (NotImplementedException ex)
            {
                return StatusCode(501, new
                {
                    code = 501,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    code = 500,
                    message = $"Internal server error: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Cập nhật điểm thành phần của grade
        /// PUT: api/manager/grades/components
        /// </summary>
        [HttpPut("components")]
        public async Task<IActionResult> UpdateGradeComponents([FromBody] UpdateGradeComponentsRequest request)
        {
            try
            {
                var success = await _gradeService.UpdateGradeComponentsAsync(request);
                if (!success)
                {
                    return NotFound(new
                    {
                        code = 404,
                        message = $"Grade with ID {request.GradeId} not found"
                    });
                }

                return Ok(new
                {
                    code = 200,
                    message = "Grade components updated successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    code = 500,
                    message = $"Internal server error: {ex.Message}"
                });
            }
        }
        [HttpGet("dashboard-charts")]
        public async Task<IActionResult> GetDashboardCharts()
        {
            try
            {
                var charts = await _gradeService.GetDashboardChartsAsync();
                return Ok(new
                {
                    code = 200,
                    message = "Success",
                    data = charts
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    code = 400,
                    message = ex.Message
                });
            }
        }
    }
}