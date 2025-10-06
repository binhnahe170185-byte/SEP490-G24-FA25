using FJAP.Handles.student;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.student
{
    [ApiController]
    [Route("api/students")]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentsHandle _handle;

        public StudentsController(IStudentsHandle handle)
        {
            _handle = handle;
        }

        // GET /api/students
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var rows = await _handle.GetAllAsync();

                // Nếu không có dữ liệu có thể trả về mảng rỗng
                return Ok(new
                {
                    code = StatusCodes.Status200OK,
                    message = "Success áaa",
                    data = rows
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    code = StatusCodes.Status500InternalServerError,
                    message = "Internal Server Error",
                    detail = ex.Message
                });
            }
        }

    }
}
