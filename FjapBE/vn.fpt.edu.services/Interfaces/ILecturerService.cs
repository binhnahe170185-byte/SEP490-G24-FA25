using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface ILecturerService
{
    Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId);
    Task<IEnumerable<LecturerDto>> GetAllLecturersAsync();
    Task<IEnumerable<LecturerClassDto>> GetClassesByLecturerIdAsync(int lecturerId, int? semesterId = null);
    Task<LecturerDetailDto?> GetLecturerByIdAsync(int lecturerId);
}

