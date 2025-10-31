using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FJAP.vn.fpt.edu.models
{
    [Table("holiday")]
    public partial class Holiday
    {
        [Key]
        [Column("holidayId")]
        public int HolidayId { get; set; }

        [Column("semesterId")]
        public int SemesterId { get; set; }

        [Required]
        [StringLength(200)]
        [Column("holidayName")]
        public string Name { get; set; } = null!;

        [Column("holidayDate", TypeName = "date")]
        public DateOnly Date { get; set; }

        [StringLength(500)]
        [Column("description")]
        public string? Description { get; set; }

        // Navigation properties
        [ForeignKey("SemesterId")]
        public virtual Semester? Semester { get; set; }
    }
}