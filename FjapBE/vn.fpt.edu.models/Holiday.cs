using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FJAP.vn.fpt.edu.models
{
    [Table("holiday")]
    public partial class Holiday
    {
        [Key]
        [Column("HolidayId")]
        public int HolidayId { get; set; }

        [Column("SemesterId")]
        public int SemesterId { get; set; }

        [Required]
        [StringLength(200)]
        [Column("HolidayName")]
        public string Name { get; set; } = null!;

        [Column("HolidayDate", TypeName = "date")]
        public DateOnly Date { get; set; }

        [Column("IsRecurring")]
        public bool IsRecurring { get; set; }

        [StringLength(100)]
        [Column("Type")]
        public string Type { get; set; } = null!;

        [Column("Description", TypeName = "text")]
        public string? Description { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("SemesterId")]
        public virtual Semester Semester { get; set; } = null!;
    }
}