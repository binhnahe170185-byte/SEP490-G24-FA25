using System;
using System.Collections.Generic;

namespace FJAP.Models;

public partial class HomeworkType
{
    public int HomeworkTypeId { get; set; }

    public string TypeName { get; set; } = null!;

    public int HomeworkId { get; set; }

    public virtual Homework Homework { get; set; } = null!;
}
