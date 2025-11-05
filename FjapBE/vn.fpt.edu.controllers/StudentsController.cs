using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly FjapDbContext _db;

    public StudentsController(IStudentService studentService, FjapDbContext db)
    {
        _studentService = studentService;
        _db = db;
    }

    [HttpGet("{id:int}/lesson")]
    [ProducesResponseType(typeof(IEnumerable<LessonDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAllLessonByStudentId(int id)
    {
        var LessonDto = await _studentService.GetLessonsByStudentIdAsync(id);
        if (LessonDto == null) return NotFound();
        return Ok(new { code = 200, data = LessonDto });
    }

    /// <summary>
    /// Lấy danh sách semester mà sinh viên đã học
    /// GET: api/Students/{id}/semesters
    /// </summary>
    [HttpGet("{id:int}/semesters")]
    [ProducesResponseType(typeof(IEnumerable<StudentSemesterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudentSemesters(int id)
    {
        var semesters = await _studentService.GetStudentSemestersAsync(id);
        return Ok(new { code = 200, data = semesters });
    }

    /// <summary>
    /// Lấy danh sách môn học và điểm của sinh viên trong một semester
    /// GET: api/Students/{id}/semesters/{semesterId}/courses
    /// </summary>
    [HttpGet("{id:int}/semesters/{semesterId:int}/courses")]
    [ProducesResponseType(typeof(IEnumerable<StudentCourseGradeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudentCoursesBySemester(int id, int semesterId)
    {
        var courses = await _studentService.GetStudentCoursesBySemesterAsync(id, semesterId);
        return Ok(new { code = 200, data = courses });
    }

    /// <summary>
    /// Lấy chi tiết điểm của sinh viên cho một môn học
    /// GET: api/Students/{id}/courses/{classId}
    /// </summary>
    [HttpGet("{id:int}/courses/{classId:int}")]
    [ProducesResponseType(typeof(StudentGradeDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStudentGradeDetails(int id, int classId)
    {
        var gradeDetails = await _studentService.GetStudentGradeDetailsAsync(id, classId);
        if (gradeDetails == null) return NotFound(new { code = 404, message = "Grade details not found" });
        return Ok(new { code = 200, data = gradeDetails });
    }

    /// <summary>
    /// Lấy GPA của sinh viên trong một semester
    /// GET: api/Students/{id}/semesters/{semesterId}/gpa
    /// </summary>
    [HttpGet("{id:int}/semesters/{semesterId:int}/gpa")]
    [ProducesResponseType(typeof(SemesterGPADto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudentSemesterGPA(int id, int semesterId)
    {
        var gpa = await _studentService.GetStudentSemesterGPAAsync(id, semesterId);
        return Ok(new { code = 200, data = gpa });
    }

    /// <summary>
    /// Lấy danh sách tất cả môn học active trong curriculum với search và pagination
    /// GET: api/Students/curriculum-subjects?search=&page=1&pageSize=20
    /// </summary>
    [HttpGet("curriculum-subjects")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurriculumSubjects(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (subjects, totalCount) = await _studentService.GetCurriculumSubjectsAsync(search, page, pageSize);
        return Ok(new
        {
            code = 200,
            data = subjects,
            total = totalCount,
            page = page,
            pageSize = pageSize
        });
    }
   
   
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Student>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var students = await _studentService.GetAllAsync();
        return Ok(new { code = 200, data = students });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Student), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var student = await _studentService.GetByIdAsync(id);
        if (student == null) return NotFound();
        return Ok(new { code = 200, data = student });
    }

    [HttpGet("{id:int}/classes")]
    [ProducesResponseType(typeof(Student), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWithClasses(int id)
    {
        var student = await _studentService.GetWithClassesAsync(id);
        if (student == null) return NotFound();
        return Ok(new { code = 200, data = student });
    }

    [HttpPost]
    [ProducesResponseType(typeof(Student), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(Student request)
    {
        var created = await _studentService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.StudentId }, new { code = 201, data = created });
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, Student request)
    {
        if (id != request.StudentId) return BadRequest();
        var ok = await _studentService.UpdateAsync(request);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _studentService.DeleteAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Get next sequence number for student code generation
    /// GET: api/Students/next-sequence?semesterCode=SP26&levelCode=N2
    /// </summary>
    [HttpGet("next-sequence")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNextSequence([FromQuery] string semesterCode, [FromQuery] string levelCode)
    {
        if (string.IsNullOrWhiteSpace(semesterCode) || string.IsNullOrWhiteSpace(levelCode))
        {
            return BadRequest(new { code = 400, message = "semesterCode and levelCode are required" });
        }

        try
        {
            // Pattern: {semesterCode}{levelCode}{number}
            var prefix = $"{semesterCode}{levelCode}".ToUpper();
            
            // Get all students with matching student code prefix
            var students = await _db.Students
                .AsNoTracking()
                .Where(s => s.StudentCode != null && s.StudentCode.ToUpper().StartsWith(prefix))
                .Select(s => s.StudentCode)
                .ToListAsync();

            var maxSequence = 0;
            foreach (var code in students)
            {
                // Extract number from end of student code
                if (code != null && code.ToUpper().StartsWith(prefix))
                {
                    var numStr = code.ToUpper().Substring(prefix.Length);
                    if (int.TryParse(numStr, out int num))
                    {
                        if (num > maxSequence)
                            maxSequence = num;
                    }
                }
            }

            // Return next sequence (maxSequence + 1, or 1 if no matches)
            var nextSequence = maxSequence + 1;
            return Ok(new { code = 200, data = nextSequence });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetNextSequence: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Failed to get next sequence", error = ex.Message });
        }
    }
}
