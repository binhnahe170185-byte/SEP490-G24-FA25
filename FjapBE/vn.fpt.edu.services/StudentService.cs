using System.Collections.Generic;
using System.IO;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.Globalization;
using System.Text.RegularExpressions;

namespace FJAP.Services;

public class StudentService : IStudentService
{
    private readonly IStudentRepository _studentRepository;
    private readonly FjapDbContext _db;

    public StudentService(IStudentRepository studentRepository, FjapDbContext db)
    {
        _studentRepository = studentRepository;
        _db = db;
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int id)
        => await _studentRepository.GetLessonsByStudentIdAsync(id);

    public async Task<IEnumerable<Student>> GetAllAsync()
        => await _studentRepository.GetAllAsync(orderBy: q => q.OrderBy(s => s.StudentId));

    public Task<Student?> GetByIdAsync(int id) => _studentRepository.GetByIdAsync(id);

    public Task<Student?> GetWithClassesAsync(int id) => _studentRepository.GetWithClassesAsync(id);

    public async Task<Student> CreateAsync(Student student)
    {
        await _studentRepository.AddAsync(student);
        await _studentRepository.SaveChangesAsync();
        return student;
    }

    public async Task<bool> UpdateAsync(Student student)
    {
        var existing = await _studentRepository.GetByIdAsync(student.StudentId);
        if (existing == null) return false;
        _studentRepository.Update(student);
        await _studentRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _studentRepository.GetByIdAsync(id);
        if (existing == null) return false;
        _studentRepository.Remove(existing);
        await _studentRepository.SaveChangesAsync();
        return true;
    }

    public Task<List<Student>> GetEligibleForClassAsync(int classId)
        => _studentRepository.GetEligibleForClassAsync(classId);

    public Task AddStudentsToClassAsync(int classId, IEnumerable<int> studentIds)
        => _studentRepository.AddStudentsToClassAsync(classId, studentIds);

    public async Task<IEnumerable<StudentSemesterDto>> GetStudentSemestersAsync(int studentId)
        => await _studentRepository.GetStudentSemestersAsync(studentId);

    public async Task<IEnumerable<StudentCourseGradeDto>> GetStudentCoursesBySemesterAsync(int studentId, int semesterId)
        => await _studentRepository.GetStudentCoursesBySemesterAsync(studentId, semesterId);

    public async Task<StudentGradeDetailDto?> GetStudentGradeDetailsAsync(int studentId, int classId)
        => await _studentRepository.GetStudentGradeDetailsAsync(studentId, classId);

    public async Task<SemesterGPADto> GetStudentSemesterGPAAsync(int studentId, int semesterId)
        => await _studentRepository.GetStudentSemesterGPAAsync(studentId, semesterId);
    public async Task<AcademicTranscriptDto> GetAcademicTranscriptAsync(int studentId)
        => await _studentRepository.GetAcademicTranscriptAsync(studentId);
    // Import methods
    public async Task<ImportStudentPreviewResponse> PreviewImportAsync(Stream excelStream, int enrollmentSemesterId, int levelId)
    {
        var response = new ImportStudentPreviewResponse();
        var previewRows = new List<ImportStudentPreviewRow>();

        // Get enrollment semester and level
        var enrollmentSemester = await _db.Semesters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SemesterId == enrollmentSemesterId);
        if (enrollmentSemester == null)
            throw new ArgumentException("Enrollment semester not found");

        var level = await _db.Levels.AsNoTracking()
            .FirstOrDefaultAsync(l => l.LevelId == levelId);
        if (level == null)
            throw new ArgumentException("Level not found");

        // Determine target semester (current semester)
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var targetSemester = await DetermineTargetSemesterAsync(enrollmentSemester, today);

        // Extract level code and semester code for student code generation
        var levelCode = ExtractLevelCode(level.LevelName);
        var semesterCode = enrollmentSemester.SemesterCode ?? "";

        // Read Excel file
        using var wb = new XLWorkbook(excelStream);
        var ws = wb.Worksheets.First();

        bool isHeader = true;
        int rowNum = 0;
        int sequenceNumber = await GetNextSequenceNumberAsync(semesterCode, levelCode);

        foreach (var row in ws.RowsUsed())
        {
            rowNum++;
            if (isHeader)
            {
                isHeader = false;
                continue;
            }

            var previewRow = new ImportStudentPreviewRow
            {
                RowNumber = rowNum,
                Errors = new List<string>()
            };

            // Read columns (FirstName, LastName, Email, Gender, Dob, Address, PhoneNumber)
            previewRow.FirstName = row.Cell(1).GetString().Trim();
            previewRow.LastName = row.Cell(2).GetString().Trim();
            previewRow.Email = row.Cell(3).GetString().Trim().ToLower();
            previewRow.Gender = row.Cell(4).GetString().Trim();
            var dobStr = row.Cell(5).GetString().Trim();
            previewRow.Address = row.Cell(6).GetString().Trim();
            previewRow.PhoneNumber = row.Cell(7).GetString().Trim();

            // Validate and parse
            ValidateStudentRow(previewRow, dobStr, sequenceNumber);

            // Generate student code if valid
            if (previewRow.IsValid && !string.IsNullOrWhiteSpace(semesterCode) && !string.IsNullOrWhiteSpace(levelCode))
            {
                previewRow.StudentCode = $"{semesterCode}{levelCode}{sequenceNumber.ToString().PadLeft(3, '0')}";
                sequenceNumber++;
            }

            previewRow.TargetSemesterId = targetSemester?.SemesterId;
            previewRow.TargetSemesterName = targetSemester?.Name;

            previewRows.Add(previewRow);
        }

        response.Students = previewRows;
        response.TotalRows = previewRows.Count;
        response.ValidRows = previewRows.Count(r => r.IsValid);
        response.InvalidRows = previewRows.Count(r => !r.IsValid);

        return response;
    }

    public async Task<ImportStudentResponse> ImportStudentsAsync(ImportStudentRequest request)
    {
        var response = new ImportStudentResponse
        {
            Results = new List<ImportStudentResultRow>()
        };

        // Get enrollment semester and level
        var enrollmentSemester = await _db.Semesters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SemesterId == request.EnrollmentSemesterId);
        if (enrollmentSemester == null)
            throw new ArgumentException("Enrollment semester not found");

        var level = await _db.Levels.AsNoTracking()
            .FirstOrDefaultAsync(l => l.LevelId == request.LevelId);
        if (level == null)
            throw new ArgumentException("Level not found");

        // Determine target semester
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var targetSemester = await DetermineTargetSemesterAsync(enrollmentSemester, today);

        // Extract codes
        var levelCode = ExtractLevelCode(level.LevelName);
        var semesterCode = enrollmentSemester.SemesterCode ?? "";

        // Get starting sequence number
        int sequenceNumber = await GetNextSequenceNumberAsync(semesterCode, levelCode);

        // Get existing emails and phones for duplicate check
        var existingEmails = await _db.Users.AsNoTracking()
            .Select(u => u.Email.ToLower())
            .ToListAsync();
        var existingPhones = await _db.Users.AsNoTracking()
            .Where(u => !string.IsNullOrWhiteSpace(u.PhoneNumber))
            .Select(u => u.PhoneNumber!.Trim())
            .ToListAsync();

        foreach (var studentRow in request.Students)
        {
            var result = new ImportStudentResultRow
            {
                Email = studentRow.Email,
                Success = false
            };

            try
            {
                // Validate email uniqueness
                if (existingEmails.Contains(studentRow.Email.ToLower()))
                {
                    result.ErrorMessage = "Email already exists";
                    response.Results.Add(result);
                    response.ErrorCount++;
                    continue;
                }

                // Validate phone uniqueness (if provided)
                if (!string.IsNullOrWhiteSpace(studentRow.PhoneNumber))
                {
                    var phoneNormalized = studentRow.PhoneNumber.Trim();
                    if (existingPhones.Contains(phoneNormalized))
                    {
                        result.ErrorMessage = "Phone number already exists";
                        response.Results.Add(result);
                        response.ErrorCount++;
                        continue;
                    }
                }

                // Generate student code if not provided
                var studentCode = studentRow.StudentCode;
                if (string.IsNullOrWhiteSpace(studentCode) && !string.IsNullOrWhiteSpace(semesterCode) && !string.IsNullOrWhiteSpace(levelCode))
                {
                    studentCode = $"{semesterCode}{levelCode}{sequenceNumber.ToString().PadLeft(3, '0')}";
                    sequenceNumber++;
                }

                // Normalize gender
                var gender = new[] { "Male", "Female", "Other" }.Contains(studentRow.Gender) 
                    ? studentRow.Gender 
                    : "Other";

                // Create User
                var user = new User
                {
                    FirstName = studentRow.FirstName.Trim(),
                    LastName = studentRow.LastName.Trim(),
                    Email = studentRow.Email.Trim().ToLower(),
                    PhoneNumber = string.IsNullOrWhiteSpace(studentRow.PhoneNumber) ? "" : studentRow.PhoneNumber.Trim(),
                    Gender = gender,
                    Dob = studentRow.Dob,
                    Address = string.IsNullOrWhiteSpace(studentRow.Address) ? "" : studentRow.Address.Trim(),
                    Avatar = null,
                    RoleId = 4, // Student
                    DepartmentId = null,
                    Status = "Active"
                };

                await _db.Users.AddAsync(user);
                await _db.SaveChangesAsync();

                // Create Student
                var student = new Student
                {
                    UserId = user.UserId,
                    LevelId = request.LevelId,
                    SemesterId = targetSemester?.SemesterId,
                    StudentCode = string.IsNullOrWhiteSpace(studentCode) ? null : studentCode,
                    Status = "Active",
                    EnrollmentDate = DateOnly.FromDateTime(DateTime.UtcNow.Date)
                };

                await _db.Students.AddAsync(student);
                await _db.SaveChangesAsync();

                result.Success = true;
                result.StudentCode = student.StudentCode;
                result.StudentId = student.StudentId;
                response.SuccessCount++;

                // Update existing lists for duplicate check
                existingEmails.Add(user.Email);
                if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
                    existingPhones.Add(user.PhoneNumber);
            }
            catch (Exception ex)
            {
                result.ErrorMessage = ex.Message;
                response.ErrorCount++;
            }

            response.Results.Add(result);
        }

        return response;
    }

    private void ValidateStudentRow(ImportStudentPreviewRow row, string dobStr, int sequenceNumber)
    {
        // Validate FirstName
        if (string.IsNullOrWhiteSpace(row.FirstName))
            row.Errors.Add("First name is required");
        else if (row.FirstName.Trim().Length < 2)
            row.Errors.Add("First name must be at least 2 characters");

        // Validate LastName
        if (string.IsNullOrWhiteSpace(row.LastName))
            row.Errors.Add("Last name is required");
        else if (row.LastName.Trim().Length < 2)
            row.Errors.Add("Last name must be at least 2 characters");

        // Validate Email
        if (string.IsNullOrWhiteSpace(row.Email))
            row.Errors.Add("Email is required");
        else
        {
            var emailRegex = new Regex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");
            if (!emailRegex.IsMatch(row.Email))
                row.Errors.Add("Invalid email format");
        }

        // Validate Gender
        var validGenders = new[] { "Male", "Female", "Other" };
        if (string.IsNullOrWhiteSpace(row.Gender))
            row.Gender = "Other";
        else if (!validGenders.Contains(row.Gender, StringComparer.OrdinalIgnoreCase))
            row.Errors.Add("Gender must be Male, Female, or Other");

        // Parse DOB
        if (string.IsNullOrWhiteSpace(dobStr))
            row.Errors.Add("Date of birth is required");
        else
        {
            if (DateTime.TryParse(dobStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                row.Dob = DateOnly.FromDateTime(dt);
            else if (double.TryParse(dobStr, out var oa)) // Excel DateNumber
                row.Dob = DateOnly.FromDateTime(DateTime.FromOADate(oa));
            else
                row.Errors.Add("Invalid date of birth format");
        }

        // Validate Phone (if provided)
        if (!string.IsNullOrWhiteSpace(row.PhoneNumber))
        {
            var phoneNormalized = row.PhoneNumber.Replace(" ", "").Replace("-", "");
            if (!Regex.IsMatch(phoneNormalized, @"^[0-9]{10,11}$"))
                row.Errors.Add("Phone number must have 10-11 digits");
        }

        row.IsValid = row.Errors.Count == 0;
    }

    private async Task<Semester?> DetermineTargetSemesterAsync(Semester enrollmentSemester, DateOnly today)
    {
        // If today is before enrollment semester start date, use enrollment semester
        if (today < enrollmentSemester.StartDate)
            return enrollmentSemester;

        // Otherwise, find the next semester after enrollment semester
        var nextSemester = await _db.Semesters.AsNoTracking()
            .Where(s => s.StartDate > enrollmentSemester.StartDate)
            .OrderBy(s => s.StartDate)
            .FirstOrDefaultAsync();

        return nextSemester ?? enrollmentSemester;
    }

    private static string ExtractLevelCode(string levelName)
    {
        if (string.IsNullOrWhiteSpace(levelName)) return string.Empty;
        var match = Regex.Match(levelName, @"N\d+", RegexOptions.IgnoreCase);
        if (match.Success) return match.Value.ToUpper();
        var cleaned = Regex.Replace(levelName, @"^level\s*", string.Empty, RegexOptions.IgnoreCase).Trim();
        return cleaned.ToUpper();
    }

    private async Task<int> GetNextSequenceNumberAsync(string semesterCode, string levelCode)
    {
        if (string.IsNullOrWhiteSpace(semesterCode) || string.IsNullOrWhiteSpace(levelCode))
            return 1;

        var prefix = $"{semesterCode}{levelCode}".ToUpper();
        var students = await _db.Students.AsNoTracking()
            .Where(s => s.StudentCode != null && s.StudentCode.ToUpper().StartsWith(prefix))
            .Select(s => s.StudentCode)
            .ToListAsync();

        var maxSequence = 0;
        foreach (var code in students)
        {
            if (code != null && code.ToUpper().StartsWith(prefix))
            {
                var numStr = code.ToUpper().Substring(prefix.Length);
                if (int.TryParse(numStr, out int num) && num > maxSequence)
                    maxSequence = num;
            }
        }

        return maxSequence + 1;
    }
    public async Task<(IEnumerable<CurriculumSubjectDto> Items, int TotalCount)> GetCurriculumSubjectsAsync(string? search, int page, int pageSize)
        => await _studentRepository.GetCurriculumSubjectsAsync(search, page, pageSize);
}
