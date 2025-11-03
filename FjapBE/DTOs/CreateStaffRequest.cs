using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateStaffRequest
{
    [Required(ErrorMessage = "FirstName is required")]
    public string FirstName { get; set; } = null!;

    [Required(ErrorMessage = "LastName is required")]
    public string LastName { get; set; } = null!;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = null!;

    public string PhoneNumber { get; set; } = "";

    [Required(ErrorMessage = "Gender is required")]
    public string Gender { get; set; } = null!;

    [Required(ErrorMessage = "Date of birth is required")]
    public DateOnly Dob { get; set; }

    public string Address { get; set; } = "";

    public string? Avatar { get; set; }

    [Required(ErrorMessage = "RoleId is required")]
    [Range(3, 7, ErrorMessage = "Invalid role for staff creation. Allowed roles: Staff (6,7), Lecturer (3)")]
    public int RoleId { get; set; }

    public int? DepartmentId { get; set; }

    public string Status { get; set; } = "Active";
}
