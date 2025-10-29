using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FJAP.vn.fpt.edu.models;

public partial class Semester
{
    [Key]
    [Column("semester_id")]
    public int SemesterId { get; set; }

    [Required]
    [StringLength(100)]
    [Column("name")]
    public string Name { get; set; } = null!;

    [Required]
    [StringLength(20)]
    [Column("semester_code")]
    public string SemesterCode { get; set; } = null!;

    [Column("start_date", TypeName = "date")]
    public DateOnly StartDate { get; set; }

    [Column("end_date", TypeName = "date")]
    public DateOnly EndDate { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();

    public virtual ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();
}
