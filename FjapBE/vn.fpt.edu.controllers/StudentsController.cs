using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;

    public StudentsController(IStudentService studentService)
    {
        _studentService = studentService;
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
}
