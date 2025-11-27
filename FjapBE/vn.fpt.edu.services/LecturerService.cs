using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services;

public class LecturerService : ILecturerService
{
    private readonly ILecturerRepository _lecturerRepository;

    public LecturerService(ILecturerRepository lecturerRepository)
    {
        _lecturerRepository = lecturerRepository;
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId)
        => await _lecturerRepository.GetLessonsByLecturerIdAsync(lecturerId);

    public async Task<IEnumerable<LecturerDto>> GetAllLecturersAsync()
        => await _lecturerRepository.GetAllLecturersAsync();

    public async Task<IEnumerable<LecturerClassDto>> GetClassesByLecturerIdAsync(int lecturerId, int? semesterId = null)
        => await _lecturerRepository.GetClassesByLecturerIdAsync(lecturerId, semesterId);

    public async Task<LecturerDetailDto?> GetLecturerByIdAsync(int lecturerId)
        => await _lecturerRepository.GetLecturerByIdAsync(lecturerId);
}

