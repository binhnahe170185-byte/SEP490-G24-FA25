namespace FJAP.Infrastructure.Security
{
    public class AppUser
    {
        public string? UserId { get; set; }   
        public string? Email { get; set; }     
        public string? Name { get; set; }       // first_name + last_name
        public int? RoleId { get; set; }      
        public string? RoleName { get; set; }   
    }
}
