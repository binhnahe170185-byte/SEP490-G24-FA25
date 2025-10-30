using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.Manager
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _subjectService;

        public SubjectsController(ISubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _subjectService.GetAllAsync();
            return Ok(new { code = 200, data });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _subjectService.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(new { code = 200, data = item });
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateSubjectRequest request)
        {
            var created = await _subjectService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = created.SubjectId },
                new { code = 201, data = created });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, UpdateSubjectRequest request)
        {
            var ok = await _subjectService.UpdateAsync(id, request);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _subjectService.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            await _subjectService.UpdateStatusAsync(id, request.Status);
            return Ok(new { code = 200, message = "Subject status updated" });
        }

        [HttpGet("dropdown")]
        public async Task<IActionResult> GetDropdownOptions()
        {
            var subjects = await _subjectService.GetDropdownOptionsAsync();
            return Ok(new { code = 200, data = subjects });
        }
    }

    public class UpdateStatusRequest
    {
        public bool Status { get; set; }
    }
}