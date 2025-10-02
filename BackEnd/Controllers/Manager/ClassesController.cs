using FJAP.Handles.Manager;
using FAJP.Models;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.Manager
{
    [ApiController]
    [Route("api/manager/classes")]
    public class ClassesController : ControllerBase
    {
        private readonly IClassHandle _handle;

        public ClassesController(IClassHandle handle)
        {
            _handle = handle;
        }

        // GET /api/class
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Class>), StatusCodes.Status200OK)]
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
