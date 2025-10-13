using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class GradeType
{
    public int GradeTypeId { get; set; }

    public string GradeTypeName { get; set; } = null!;

    public decimal Weight { get; set; }

    public string? Comment { get; set; }

    public decimal? Score { get; set; }

    public string? Status { get; set; }

    public int GradeId { get; set; }

    public virtual Grade Grade { get; set; } = null!;
}
