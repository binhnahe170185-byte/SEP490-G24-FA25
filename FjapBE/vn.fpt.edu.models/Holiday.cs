using System;
using System.Collections.Generic;

namespace FJAP.vn.fpt.edu.models;

public partial class Holiday
{
    public int HolidayId { get; set; }

    public int SemesterId { get; set; }

    public string HolidayName { get; set; } = null!;

    public DateOnly HolidayDate { get; set; }

    public string? Description { get; set; }

    public virtual Semester Semester { get; set; } = null!;
}
