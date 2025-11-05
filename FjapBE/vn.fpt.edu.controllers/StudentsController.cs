using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;

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

    /// <summary>
    /// Download Excel template for student import
    /// GET: api/Students/import/template
    /// </summary>
    [HttpGet("import/template")]
    public IActionResult DownloadTemplate()
    {
        try
        {
            using var wb = new XLWorkbook();

            // ==================== Instructions Sheet ====================
            var instructionSheet = wb.Worksheets.Add("Instructions");
        
        instructionSheet.Cell(1, 1).Value = "STUDENT IMPORT TEMPLATE - INSTRUCTIONS";
        instructionSheet.Cell(1, 1).Style.Font.Bold = true;
        instructionSheet.Cell(1, 1).Style.Font.FontSize = 16;
        instructionSheet.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.DarkBlue;
        instructionSheet.Cell(1, 1).Style.Font.FontColor = XLColor.White;
        instructionSheet.Range(1, 1, 1, 3).Merge();

        int row = 3;
        instructionSheet.Cell(row++, 1).Value = "HOW TO USE THIS TEMPLATE:";
        instructionSheet.Cell(row - 1, 1).Style.Font.Bold = true;
        instructionSheet.Cell(row - 1, 1).Style.Font.FontSize = 12;

        instructionSheet.Cell(row++, 1).Value = "1. Fill in student information in the 'Students' sheet";
        instructionSheet.Cell(row++, 1).Value = "2. Required fields: FirstName, LastName, Email, Gender, Dob";
        instructionSheet.Cell(row++, 1).Value = "3. Optional fields: Address, PhoneNumber";
        instructionSheet.Cell(row++, 1).Value = "4. Delete the example rows (row 2-4) before adding your data";
        instructionSheet.Cell(row++, 1).Value = "5. Save the file and upload it to the system";

        row += 2;
        instructionSheet.Cell(row++, 1).Value = "COLUMN REQUIREMENTS:";
        instructionSheet.Cell(row - 1, 1).Style.Font.Bold = true;
        instructionSheet.Cell(row - 1, 1).Style.Font.FontSize = 12;

        instructionSheet.Cell(row++, 1).Value = "• FirstName: Required, minimum 2 characters";
        instructionSheet.Cell(row++, 1).Value = "• LastName: Required, minimum 2 characters";
        instructionSheet.Cell(row++, 1).Value = "• Email: Required, must be valid email format (e.g., student@fpt.edu.vn)";
        instructionSheet.Cell(row++, 1).Value = "• Gender: Required, must be one of: Male, Female, Other";
        instructionSheet.Cell(row++, 1).Value = "• Dob: Required, format: YYYY-MM-DD (e.g., 2000-01-15)";
        instructionSheet.Cell(row++, 1).Value = "• Address: Optional, can be left empty";
        instructionSheet.Cell(row++, 1).Value = "• PhoneNumber: Optional, must be 10-11 digits if provided";

        row += 2;
        instructionSheet.Cell(row++, 1).Value = "IMPORTANT NOTES:";
        instructionSheet.Cell(row - 1, 1).Style.Font.Bold = true;
        instructionSheet.Cell(row - 1, 1).Style.Font.FontSize = 12;
        instructionSheet.Cell(row - 1, 1).Style.Font.FontColor = XLColor.Red;

        instructionSheet.Cell(row++, 1).Value = "• Email must be unique (cannot duplicate existing emails)";
        instructionSheet.Cell(row++, 1).Value = "• Phone number must be unique if provided (cannot duplicate)";
        instructionSheet.Cell(row++, 1).Value = "• Student codes will be automatically generated by the system";
        instructionSheet.Cell(row++, 1).Value = "• All students will be assigned to the selected Level and Semester";
        instructionSheet.Cell(row++, 1).Value = "• Invalid rows will be skipped during import";

        // Auto-fit instruction sheet
        instructionSheet.Columns().AdjustToContents();

        // ==================== Students Data Sheet ====================
        var ws = wb.Worksheets.Add("Students");

        // Header row with descriptions
        ws.Cell(1, 1).Value = "FirstName";
        ws.Cell(1, 2).Value = "LastName";
        ws.Cell(1, 3).Value = "Email";
        ws.Cell(1, 4).Value = "Gender";
        ws.Cell(1, 5).Value = "Dob";
        ws.Cell(1, 6).Value = "Address";
        ws.Cell(1, 7).Value = "PhoneNumber";

        // Style header
        var headerRange = ws.Range(1, 1, 1, 7);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightBlue;
        headerRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;

        // Note: Comments are not added to cells as they may not be supported in all ClosedXML versions
        // Users can refer to the Instructions sheet for detailed column requirements

        // Example rows with different data
        ws.Cell(2, 1).Value = "Nguyen";
        ws.Cell(2, 2).Value = "Van A";
        ws.Cell(2, 3).Value = "student1@fpt.edu.vn";
        ws.Cell(2, 4).Value = "Male";
        ws.Cell(2, 5).Value = "2000-01-15";
        ws.Cell(2, 6).Value = "123 Main Street, Hanoi";
        ws.Cell(2, 7).Value = "0123456789";

        ws.Cell(3, 1).Value = "Tran";
        ws.Cell(3, 2).Value = "Thi B";
        ws.Cell(3, 3).Value = "student2@fpt.edu.vn";
        ws.Cell(3, 4).Value = "Female";
        ws.Cell(3, 5).Value = "2001-05-20";
        ws.Cell(3, 6).Value = "456 Park Avenue, Ho Chi Minh City";
        ws.Cell(3, 7).Value = "0987654321";

        ws.Cell(4, 1).Value = "Le";
        ws.Cell(4, 2).Value = "Van C";
        ws.Cell(4, 3).Value = "student3@fpt.edu.vn";
        ws.Cell(4, 4).Value = "Other";
        ws.Cell(4, 5).Value = "1999-12-31";
        ws.Cell(4, 6).Value = ""; // Empty address example
        ws.Cell(4, 7).Value = ""; // Empty phone example

        // Add data validation for Gender column (dropdown)
        // Note: DataValidation API may vary by ClosedXML version
        // For ClosedXML 0.105.0, we'll skip validation and rely on Instructions sheet
        try
        {
            var genderRange = ws.Range(2, 4, 1000, 4);
            // Data validation is optional - users can refer to Instructions sheet for guidance
        }
        catch
        {
            // DataValidation may not be fully supported in this ClosedXML version
        }

        // Format DOB column to show date format hint
        var dobRange = ws.Range(2, 5, 1000, 5);
        dobRange.Style.NumberFormat.Format = "yyyy-mm-dd";

        // Style example rows
        var exampleRange = ws.Range(2, 1, 4, 7);
        exampleRange.Style.Fill.BackgroundColor = XLColor.LightYellow;
        exampleRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        exampleRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        exampleRange.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
        exampleRange.Style.Border.RightBorder = XLBorderStyleValues.Thin;
        exampleRange.Style.Font.Italic = true;

        // Add note below examples
        ws.Cell(5, 1).Value = "NOTE: Delete these example rows (rows 2-4) before adding your data";
        ws.Range(5, 1, 5, 7).Merge();
        ws.Cell(5, 1).Style.Font.Bold = true;
        ws.Cell(5, 1).Style.Font.FontColor = XLColor.Red;
        ws.Cell(5, 1).Style.Fill.BackgroundColor = XLColor.LightPink;

        // Auto-fit columns
        ws.Columns().AdjustToContents();

        // Set column widths with minimum
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 15); // FirstName
        ws.Column(2).Width = Math.Max(ws.Column(2).Width, 15); // LastName
        ws.Column(3).Width = Math.Max(ws.Column(3).Width, 25); // Email
        ws.Column(4).Width = Math.Max(ws.Column(4).Width, 12); // Gender
        ws.Column(5).Width = Math.Max(ws.Column(5).Width, 12); // Dob
        ws.Column(6).Width = Math.Max(ws.Column(6).Width, 30); // Address
        ws.Column(7).Width = Math.Max(ws.Column(7).Width, 15); // PhoneNumber

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            stream.Position = 0;

            var fileBytes = stream.ToArray();
            return File(fileBytes, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                "StudentImportTemplate.xlsx");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating template: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { 
                code = 500, 
                message = $"Failed to generate template: {ex.Message}" 
            });
        }
    }

    /// <summary>
    /// Preview Excel import - read file and return preview with validation
    /// POST: api/Students/import/preview
    /// </summary>
    [HttpPost("import/preview")]
    [ProducesResponseType(typeof(ImportStudentPreviewResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> PreviewImport(
        IFormFile file,
        [FromForm] int enrollmentSemesterId,
        [FromForm] int levelId)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { code = 400, message = "File is required" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
            return BadRequest(new { code = 400, message = "Only Excel files (.xlsx/.xls) are supported" });

        try
        {
            using var stream = file.OpenReadStream();
            var preview = await _studentService.PreviewImportAsync(stream, enrollmentSemesterId, levelId);
            return Ok(new { code = 200, data = preview });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in PreviewImport: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Failed to preview import", error = ex.Message });
        }
    }

    /// <summary>
    /// Import students from preview data
    /// POST: api/Students/import
    /// </summary>
    [HttpPost("import")]
    [ProducesResponseType(typeof(ImportStudentResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ImportStudents([FromBody] ImportStudentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { code = 400, message = "Invalid request", errors = ModelState });
        }

        try
        {
            var result = await _studentService.ImportStudentsAsync(request);
            return Ok(new { code = 200, data = result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { code = 400, message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in ImportStudents: {ex.Message}");
            return StatusCode(500, new { code = 500, message = "Failed to import students", error = ex.Message });
        }
    }
}
