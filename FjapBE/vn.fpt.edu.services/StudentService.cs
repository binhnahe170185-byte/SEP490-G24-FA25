using System.Collections.Generic;
using System.IO;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Net.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;

namespace FJAP.Services;

public class StudentService : IStudentService
{
    private readonly IStudentRepository _studentRepository;
    private readonly FjapDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public StudentService(IStudentRepository studentRepository, FjapDbContext db, IHttpClientFactory httpClientFactory)
    {
        _studentRepository = studentRepository;
        _db = db;
        _httpClientFactory = httpClientFactory;
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

        // Read Excel file - get "Students" sheet, must find it explicitly
        using var wb = new XLWorkbook(excelStream);
        
        // List all sheet names for debugging
        var allSheetNames = wb.Worksheets.Select(w => w.Name).ToList();
        Console.WriteLine($"Available sheets in Excel file: {string.Join(", ", allSheetNames)}");
        
        // Try to find "Students" sheet (case-insensitive)
        var ws = wb.Worksheets.FirstOrDefault(w => 
            w.Name.Equals("Students", StringComparison.OrdinalIgnoreCase));
        
        // If not found, try "Student" (singular)
        if (ws == null)
        {
            ws = wb.Worksheets.FirstOrDefault(w => 
                w.Name.Equals("Student", StringComparison.OrdinalIgnoreCase));
        }
        
        // If still not found, throw error with helpful message
        if (ws == null)
        {
            throw new ArgumentException(
                $"Sheet 'Students' not found in Excel file. Available sheets: {string.Join(", ", allSheetNames)}. " +
                "Please ensure your Excel file contains a sheet named 'Students' with student data.");
        }
        
        Console.WriteLine($"Using sheet: '{ws.Name}'");

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

            // Read columns (FirstName, LastName, Email, Gender, Dob, Address, PhoneNumber, Avatar)
            // Column order: 1=FirstName, 2=LastName, 3=Email, 4=Gender, 5=Dob, 6=Address, 7=PhoneNumber, 8=Avatar
            previewRow.FirstName = row.Cell(1).GetString().Trim();
            previewRow.LastName = row.Cell(2).GetString().Trim();
            previewRow.Email = row.Cell(3).GetString().Trim().ToLower();
            previewRow.Gender = row.Cell(4).GetString().Trim();
            var dobStr = row.Cell(5).GetString().Trim();
            previewRow.Address = row.Cell(6).GetString().Trim();
            previewRow.PhoneNumber = row.Cell(7).GetString().Trim();
            previewRow.AvatarUrl = row.Cell(8).GetString().Trim(); // Avatar column - Google Drive link

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

                // Process avatar from URL if provided
                string? avatarBase64 = null;
                if (!string.IsNullOrWhiteSpace(studentRow.AvatarUrl))
                {
                    try
                    {
                        avatarBase64 = await ProcessAvatarFromUrlAsync(studentRow.AvatarUrl);
                    }
                    catch (Exception ex)
                    {
                        // Log error but don't fail the import - avatar is optional
                        Console.WriteLine($"Warning: Failed to process avatar for {studentRow.Email}: {ex.Message}");
                    }
                }

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
                    Avatar = avatarBase64,
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

    /// <summary>
    /// Download image from URL (Google Drive or other), resize and convert to base64
    /// </summary>
    private async Task<string?> ProcessAvatarFromUrlAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return null;

        try
        {
            // Create HttpClient with timeout
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            // Convert Google Drive sharing link to direct download link
            string downloadUrl = ConvertGoogleDriveLinkToDirectDownload(imageUrl);

            // Download image (follow redirects for Google Drive)
            var response = await httpClient.GetAsync(downloadUrl);
            
            // Handle Google Drive virus scan warning page (file > 100MB or suspicious)
            // Google Drive returns HTML page instead of file, need to extract actual download link
            if (response.Content.Headers.ContentType?.MediaType?.Contains("text/html") == true)
            {
                // Try to get the actual download link from the warning page
                var htmlContent = await response.Content.ReadAsStringAsync();
                
                // Extract file ID first
                var fileIdMatch = Regex.Match(downloadUrl, @"[?&]id=([a-zA-Z0-9_-]+)");
                string? fileId = null;
                if (fileIdMatch.Success)
                {
                    fileId = fileIdMatch.Groups[1].Value;
                }
                
                // Try multiple methods to get the actual download link
                var actualDownloadLink = ExtractGoogleDriveDownloadLink(htmlContent, downloadUrl);
                if (!string.IsNullOrEmpty(actualDownloadLink))
                {
                    response = await httpClient.GetAsync(actualDownloadLink);
                }
                else
                {
                    // Method 1: Try uc?export=view&id=FILE_ID (for viewing images)
                    if (!string.IsNullOrEmpty(fileId))
                    {
                        var viewUrl = $"https://drive.google.com/uc?export=view&id={fileId}";
                        response = await httpClient.GetAsync(viewUrl);
                        
                        // If still HTML, try Method 2
                        if (response.Content.Headers.ContentType?.MediaType?.Contains("text/html") == true)
                        {
                            // Method 2: Try thumbnail URL (smaller size but should work)
                            var thumbnailUrl = $"https://drive.google.com/thumbnail?id={fileId}&sz=w2000";
                            response = await httpClient.GetAsync(thumbnailUrl);
                        }
                    }
                }
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Failed to download image: {response.StatusCode}");
            }

            // Validate content type
            var contentType = response.Content.Headers.ContentType?.MediaType;
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
            bool isValidContentType = contentType != null && allowedTypes.Any(t => contentType.Contains(t, StringComparison.OrdinalIgnoreCase));
            
            // Read content first to check if it's HTML
            var imageBytes = await response.Content.ReadAsByteArrayAsync();
            
            // Check if response is HTML (Google Drive warning page)
            if (contentType?.Contains("text/html") == true || 
                (imageBytes.Length > 1000 && Encoding.UTF8.GetString(imageBytes, 0, Math.Min(100, imageBytes.Length)).TrimStart().StartsWith("<!DOCTYPE", StringComparison.OrdinalIgnoreCase)))
            {
                // Try thumbnail URL as last resort
                var fileIdMatch = Regex.Match(downloadUrl, @"[?&]id=([a-zA-Z0-9_-]+)");
                if (!fileIdMatch.Success)
                {
                    fileIdMatch = Regex.Match(imageUrl, @"[?&]id=([a-zA-Z0-9_-]+)");
                }
                
                if (fileIdMatch.Success)
                {
                    var fileId = fileIdMatch.Groups[1].Value;
                    var thumbnailUrl = $"https://drive.google.com/thumbnail?id={fileId}&sz=w2000";
                    try
                    {
                        response = await httpClient.GetAsync(thumbnailUrl);
                        
                        if (response.IsSuccessStatusCode)
                        {
                            var thumbnailContentType = response.Content.Headers.ContentType?.MediaType;
                            if (thumbnailContentType != null && allowedTypes.Any(t => thumbnailContentType.Contains(t, StringComparison.OrdinalIgnoreCase)))
                            {
                                imageBytes = await response.Content.ReadAsByteArrayAsync();
                                contentType = thumbnailContentType;
                                isValidContentType = true;
                            }
                            else
                            {
                                throw new HttpRequestException($"Thumbnail URL also returned invalid content type: {thumbnailContentType}");
                            }
                        }
                        else
                        {
                            throw new HttpRequestException($"Thumbnail URL failed with status: {response.StatusCode}");
                        }
                    }
                    catch (Exception ex)
                    {
                        throw new HttpRequestException($"Failed to download image from Google Drive. Please ensure the file is shared with 'Anyone with the link can view' permission. Error: {ex.Message}");
                    }
                }
                else
                {
                    throw new HttpRequestException("Failed to download image from Google Drive. Could not extract file ID from URL.");
                }
            }
            
            // Validate file size (max 5MB)
            const long maxFileSize = 5 * 1024 * 1024; // 5MB
            if (imageBytes.Length > maxFileSize)
            {
                throw new ArgumentException("Image size exceeds 5MB limit");
            }

            // Process image: resize and convert to base64
            using var imageStream = new MemoryStream(imageBytes);
            Image image;
            try
            {
                image = await Image.LoadAsync(imageStream);
            }
            catch (Exception ex)
            {
                throw new ArgumentException($"Failed to load image. The file may not be a valid image file. Error: {ex.Message}");
            }
            
            // Resize to 200x200 (maintain aspect ratio, crop if needed)
            const int maxSize = 200;
            var resizeOptions = new ResizeOptions
            {
                Size = new Size(maxSize, maxSize),
                Mode = ResizeMode.Crop, // Crop to ensure square
                Sampler = KnownResamplers.Lanczos3
            };
            
            image.Mutate(x => x.Resize(resizeOptions));

            // Convert to base64
            using var outputStream = new MemoryStream();
            
            // Determine format and encoder - try to detect from image metadata first
            string extension = ".jpg";
            if (image.Metadata.DecodedImageFormat?.Name?.Contains("png", StringComparison.OrdinalIgnoreCase) == true)
            {
                extension = ".png";
            }
            else if (contentType != null && contentType.Contains("png", StringComparison.OrdinalIgnoreCase))
            {
                extension = ".png";
            }
            try
            {
                if (extension == ".png")
                {
                    await image.SaveAsync(outputStream, new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression });
                }
                else
                {
                    // JPEG for other formats
                    await image.SaveAsync(outputStream, new JpegEncoder { Quality = 85 });
                }

                var processedBytes = outputStream.ToArray();
                var base64String = Convert.ToBase64String(processedBytes);
                
                // Return data URL format: data:image/jpeg;base64,{base64}
                var mimeType = extension == ".png" ? "image/png" : "image/jpeg";
                return $"data:{mimeType};base64,{base64String}";
            }
            finally
            {
                image?.Dispose();
            }
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Error processing avatar from URL: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Convert Google Drive sharing link to direct view/download link
    /// For images, use export=view which works better than export=download
    /// Supports formats:
    /// - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
    /// - https://drive.google.com/open?id={FILE_ID}
    /// - https://drive.google.com/uc?export=download&id={FILE_ID} (already direct)
    /// </summary>
    private string ConvertGoogleDriveLinkToDirectDownload(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return url;

        // Check if it's a Google Drive link
        if (!url.Contains("drive.google.com", StringComparison.OrdinalIgnoreCase))
            return url; // Not a Google Drive link, return as-is

        string? fileId = null;

        // Pattern 1: /file/d/{FILE_ID}
        var fileIdMatch = Regex.Match(url, @"/file/d/([a-zA-Z0-9_-]+)");
        if (fileIdMatch.Success)
        {
            fileId = fileIdMatch.Groups[1].Value;
        }
        else
        {
            // Pattern 2: ?id={FILE_ID} or &id={FILE_ID}
            var idMatch = Regex.Match(url, @"[?&]id=([a-zA-Z0-9_-]+)");
            if (idMatch.Success)
            {
                fileId = idMatch.Groups[1].Value;
            }
        }

        if (!string.IsNullOrEmpty(fileId))
        {
            // For images, use export=view which is more reliable than export=download
            // It doesn't require confirm token and works better for public files
            return $"https://drive.google.com/uc?export=view&id={fileId}";
        }

        // If already a direct link or unrecognized format, return as-is
        return url;
    }

    /// <summary>
    /// Extract actual download link from Google Drive warning page HTML
    /// Google Drive shows warning page for large files or suspicious files
    /// </summary>
    private string? ExtractGoogleDriveDownloadLink(string htmlContent, string originalUrl)
    {
        if (string.IsNullOrWhiteSpace(htmlContent))
            return null;

        // Extract file ID from original URL first
        var fileIdMatch = Regex.Match(originalUrl, @"[?&]id=([a-zA-Z0-9_-]+)");
        if (!fileIdMatch.Success)
        {
            fileIdMatch = Regex.Match(originalUrl, @"/file/d/([a-zA-Z0-9_-]+)");
        }

        if (!fileIdMatch.Success)
            return null;

        var fileId = fileIdMatch.Groups[1].Value;

        // Method 1: Try to find confirm token in HTML (for large files)
        // Look for patterns like: confirm=TOKEN or 'confirm','TOKEN' or "confirm":"TOKEN"
        var confirmPatterns = new[]
        {
            @"confirm=([a-zA-Z0-9_-]+)",
            @"['""]confirm['""]\s*:\s*['""]([a-zA-Z0-9_-]+)['""]",
            @"['""]confirm['""]\s*,\s*['""]([a-zA-Z0-9_-]+)['""]",
            @"confirm\s*=\s*['""]([a-zA-Z0-9_-]+)['""]"
        };

        foreach (var pattern in confirmPatterns)
        {
            var confirmMatch = Regex.Match(htmlContent, pattern, RegexOptions.IgnoreCase);
            if (confirmMatch.Success && confirmMatch.Groups.Count > 1)
            {
                var confirmToken = confirmMatch.Groups[1].Value;
                return $"https://drive.google.com/uc?export=download&id={fileId}&confirm={confirmToken}";
            }
        }

        // Method 2: Try to find download URL in HTML
        var downloadUrlMatch = Regex.Match(htmlContent, @"(https?://[^""'\s]+uc\?[^""'\s]*export=download[^""'\s]*)", RegexOptions.IgnoreCase);
        if (downloadUrlMatch.Success)
        {
            var foundUrl = downloadUrlMatch.Groups[1].Value;
            return foundUrl;
        }

        // Method 3: Try to find action URL in form
        var formActionMatch = Regex.Match(htmlContent, @"<form[^>]*action=['""]([^""']+)['""]", RegexOptions.IgnoreCase);
        if (formActionMatch.Success)
        {
            var formAction = formActionMatch.Groups[1].Value;
            if (formAction.Contains("uc?") && formAction.Contains("export=download"))
            {
                // Make absolute URL if relative
                if (formAction.StartsWith("/"))
                {
                    formAction = "https://drive.google.com" + formAction;
                }
                return formAction;
            }
        }

        // Fallback: try direct download with confirm=t (for smaller files)
        return $"https://drive.google.com/uc?export=download&id={fileId}&confirm=t";
    }

    public async Task<(IEnumerable<CurriculumSubjectDto> Items, int TotalCount)> GetCurriculumSubjectsAsync(string? search, int page, int pageSize)
        => await _studentRepository.GetCurriculumSubjectsAsync(search, page, pageSize);
}
