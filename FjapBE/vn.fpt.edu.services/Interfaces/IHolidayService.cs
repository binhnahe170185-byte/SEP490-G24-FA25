using FJAP.vn.fpt.edu.models;
using FJAP.DTOs;

namespace FJAP.Services.Interfaces;

public interface IHolidayService
{
    Task<IEnumerable<Holiday>> GetAllAsync();
    Task<Holiday?> GetByIdAsync(int id);
    Task<Holiday> CreateAsync(CreateHolidayRequest request);
    Task<bool> UpdateAsync(int id, UpdateHolidayRequest request);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<Holiday>> GetBySemesterAsync(int semesterId);
    Task<IEnumerable<Holiday>> CreateBulkAsync(CreateHolidayRequest[] requests);
}
