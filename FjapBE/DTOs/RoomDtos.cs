using System.ComponentModel.DataAnnotations;

namespace FJAP.DTOs;

public class CreateRoomRequest
{
    [Required(ErrorMessage = "Room name is required")]
    public string RoomName { get; set; } = null!;

    public string? Status { get; set; }
}

public class UpdateRoomRequest
{
    [Required(ErrorMessage = "Room name is required")]
    public string RoomName { get; set; } = null!;

    public string? Status { get; set; }
}

public class UpdateRoomStatusRequest
{
    [Required(ErrorMessage = "Status is required")]
    public string Status { get; set; } = null!;
}

