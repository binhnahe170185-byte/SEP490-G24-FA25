using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class ProfileDto
{
    public int UserId { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Gender { get; set; } = null!;
    public string? Avatar { get; set; }
    public DateOnly Dob { get; set; }
    public string PhoneNumber { get; set; } = null!;
    public int RoleId { get; set; }
    public string Status { get; set; } = null!;
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? RoleName { get; set; }
}

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "First name is required")]
    [StringLength(50, ErrorMessage = "First name must not exceed 50 characters")]
    public string FirstName { get; set; } = null!;

    [Required(ErrorMessage = "Last name is required")]
    [StringLength(50, ErrorMessage = "Last name must not exceed 50 characters")]
    public string LastName { get; set; } = null!;

    [Required(ErrorMessage = "Address is required")]
    [StringLength(255, ErrorMessage = "Address must not exceed 255 characters")]
    public string Address { get; set; } = null!;

    [Required(ErrorMessage = "Phone number is required")]
    [StringLength(20, ErrorMessage = "Phone number must not exceed 20 characters")]
    [RegularExpression(@"^(0\d{1,2}-?\d{4}-?\d{4}|0\d{9,10})$", ErrorMessage = "Phone number must be a valid Japanese number (e.g., 090-1234-5678 or 03-1234-5678)")]
    public string PhoneNumber { get; set; } = null!;

    [Required(ErrorMessage = "Gender is required")]
    [StringLength(10, ErrorMessage = "Gender must not exceed 10 characters")]
    public string Gender { get; set; } = null!;

    [Required(ErrorMessage = "Date of birth is required")]
    public DateOnly Dob { get; set; }

    [StringLength(50000, ErrorMessage = "Avatar data must not exceed 50000 characters")]
    public string? Avatar { get; set; }
}

