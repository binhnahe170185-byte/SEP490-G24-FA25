using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateStudentRequest
{
    // User fields
    [Required]
    public string FirstName { get; set; } = null!;
    [Required]
    public string LastName { get; set; } = null!;
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
    [Required]
    public string Gender { get; set; } = null!; // Male | Female | Other
    [Required]
    public DateOnly Dob { get; set; }
    public string Address { get; set; } = "";
    public string? Avatar { get; set; }
    public string PhoneNumber { get; set; } = "";

    // Student fields
    [Required]
    public int LevelId { get; set; }
    public string? StudentCode { get; set; }
}


