namespace FJAP.vn.fpt.edu.models;

/// <summary>
/// Keyless model that maps to either a SQL view or raw query returning
/// slot-level schedule snapshots. It allows us to fetch conflicts without
/// materializing the full Lesson graph.
/// </summary>
public class ScheduleSlotSnapshot
{
    public DateOnly Date { get; set; }
    public int TimeId { get; set; }
    public int ClassId { get; set; }
    public int RoomId { get; set; }
    public int? LecturerId { get; set; }
}