using Backend.Handles;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ManagersController : ControllerBase
    {
        private readonly IStudentsHandle _handle;

        public ManagersController(IStudentsHandle handle)
        {
            _handle = handle;
        }

        // GET /api/students
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var rows = await _handle.GetAllAsync();
            return Ok(rows);
        }
    }
}
