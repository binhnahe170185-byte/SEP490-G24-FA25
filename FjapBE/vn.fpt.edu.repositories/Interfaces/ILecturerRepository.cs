using FJAP.vn.fpt.edu.models;

namespace FJAP.Repositories.Interfaces;

public interface ILecturerRepository : IGenericRepository<Lecture>
{
    Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId);
    Task<IEnumerable<LecturerDto>> GetAllLecturersAsync();
    Task<IEnumerable<LecturerClassDto>> GetClassesByLecturerIdAsync(int lecturerId, int? semesterId = null);
    Task<LecturerDetailDto?> GetLecturerByIdAsync(int lecturerId);
}

