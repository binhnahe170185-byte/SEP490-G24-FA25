using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _subjectRepository;

        public SubjectService(ISubjectRepository subjectRepository)
        {
            _subjectRepository = subjectRepository;
        }

        public async Task<IEnumerable<SubjectDto>> GetAllAsync()
            => await _subjectRepository.GetAllWithDetailsAsync();

        public Task<SubjectDto?> GetByIdAsync(int id) 
            => _subjectRepository.GetByIdWithDetailsAsync(id);

        public async Task<Subject> CreateAsync(CreateSubjectRequest request)
        {
            var subject = new Subject
            {
                SubjectCode = request.SubjectCode,
                SubjectName = request.SubjectName,
                Description = request.Description,
                PassMark = request.PassMark,
                SemesterId = request.SemesterId,
                LevelId = request.LevelId,
                ClassId = request.ClassId,
                Status = true,
                CreatedAt = DateTime.Now
            };

            await _subjectRepository.AddAsync(subject);
            await _subjectRepository.SaveChangesAsync();
            return subject;
        }

        public async Task<bool> UpdateAsync(int id, UpdateSubjectRequest request)
        {
            var existing = await _subjectRepository.GetByIdAsync(id);
            if (existing == null) return false;

            existing.SubjectCode = request.SubjectCode;
            existing.SubjectName = request.SubjectName;
            existing.Description = request.Description;
            existing.PassMark = request.PassMark;
            existing.SemesterId = request.SemesterId;
            existing.LevelId = request.LevelId;
            existing.ClassId = request.ClassId;

            _subjectRepository.Update(existing);
            await _subjectRepository.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _subjectRepository.GetByIdAsync(id);
            if (existing == null) return false;

            _subjectRepository.Remove(existing);
            await _subjectRepository.SaveChangesAsync();
            return true;
        }

        public Task UpdateStatusAsync(int id, bool status) 
            => _subjectRepository.UpdateStatusAsync(id, status);

        public Task<SubjectFormOptions> GetFormOptionsAsync() 
            => _subjectRepository.GetFormOptionsAsync();
    }
}