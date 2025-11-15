using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateStaffRequest
{
    [Required(ErrorMessage = "FirstName is required")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "FirstName must be between 2 and 50 characters")]
    [RegularExpression(@"^[\p{L}\p{M}][\p{L}\p{M}\s\.'-]*$", ErrorMessage = "FirstName contains invalid characters")]
    public string FirstName { get; set; } = null!;

    [Required(ErrorMessage = "LastName is required")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "LastName must be between 2 and 50 characters")]
    [RegularExpression(@"^[\p{L}\p{M}][\p{L}\p{M}\s\.'-]*$", ErrorMessage = "LastName contains invalid characters")]
    public string LastName { get; set; } = null!;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(150, ErrorMessage = "Email must not exceed 150 characters")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "PhoneNumber is required")]
    [RegularExpression(@"^(?:\+?84|0)(?:\d){8,9}$", ErrorMessage = "PhoneNumber must be a valid Vietnamese number (10-11 digits)")]
    public string PhoneNumber { get; set; } = null!;

    [Required(ErrorMessage = "Gender is required")]
    public string Gender { get; set; } = null!;

    [Required(ErrorMessage = "Date of birth is required")]
    public DateOnly Dob { get; set; }

    [StringLength(200, ErrorMessage = "Address must not exceed 200 characters")]
    public string? Address { get; set; }

    public string? Avatar { get; set; }

    [Required(ErrorMessage = "RoleId is required")]
    [Range(3, 7, ErrorMessage = "Invalid role for staff creation. Allowed roles: Staff (6,7), Lecturer (3)")]
    public int RoleId { get; set; }

    public int? DepartmentId { get; set; }

    [RegularExpression("^(Active|Inactive)$", ErrorMessage = "Status must be Active or Inactive")]
    public string Status { get; set; } = "Active";
}
