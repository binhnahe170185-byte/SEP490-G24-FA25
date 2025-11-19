namespace FJAP.vn.fpt.edu.models;

/// <summary>
/// Represents a flattened view of student occupancy for quick conflict checks.
/// Backed by the enrollment/lesson join via a SQL view or raw query.
/// </summary>
public class StudentScheduleSnapshot
{
    public int StudentId { get; set; }
    public DateOnly Date { get; set; }
    public int TimeId { get; set; }
}