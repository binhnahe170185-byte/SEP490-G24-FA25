using System;
using FJAP.vn.fpt.edu.models;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers.Manager
{
    [ApiController]
    [Route("api/manager/subjects")]
    public class SubjectController : ControllerBase
    {
        private readonly ISubjectService _subjectService;

        public SubjectController(ISubjectService subjectService)
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
            try
            {
                var created = await _subjectService.CreateAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = created.SubjectId },
                    new { code = 201, data = created });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { code = 400, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { code = 400, message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, UpdateSubjectRequest request)
        {
            try
            {
                var ok = await _subjectService.UpdateAsync(id, request);
                if (!ok) return NotFound(new { code = 404, message = "Subject not found" });
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { code = 400, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { code = 400, message = ex.Message });
            }
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

        [HttpGet("options")]
        public async Task<IActionResult> GetFormOptions()
        {
            var options = await _subjectService.GetFormOptionsAsync();
            return Ok(new { code = 200, data = options });
        }

        [HttpGet("dropdown")]
        public async Task<IActionResult> GetDropdownOptions()
        {
            var subjects = await _subjectService.GetDropdownOptionsAsync();
            return Ok(new { code = 200, data = subjects });
        }
        
        // GET: /api/manager/subjectsActive
        [HttpGet("subjectsActive")]
        public async Task<IActionResult> GetActiveSubjects()
        {
            // Tận dụng sẵn phương thức dropdown chỉ trả về các subject Active
            var subjects = await _subjectService.GetDropdownOptionsAsync();
            return Ok(new { code = 200, data = subjects });
        }
    }

    public class UpdateStatusRequest
    {
        public bool Status { get; set; }
    }
}