using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface ILecturerService
{
    Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId);
    Task<IEnumerable<LecturerDto>> GetAllLecturersAsync();
}

