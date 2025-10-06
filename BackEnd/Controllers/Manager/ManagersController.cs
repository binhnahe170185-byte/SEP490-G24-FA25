using FJAP.Handles.Manager;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.Manager
{
    [ApiController]
    [Route("api/class")]
    public class ManagersController : ControllerBase
    {
        private readonly IClassHandle _handle;

        public ManagersController(IClassHandle handle)
        {
            _handle = handle;
        }

        // GET /api/managers
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var rows = await _handle.GetAllAsync();
            return Ok(rows);
        }
    }
}
