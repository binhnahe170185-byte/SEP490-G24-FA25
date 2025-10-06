using System.Data;
using Dapper;

public class AccountHandles
{
    private readonly IDbConnection _db;

    public AccountHandles(IDbConnection db)
    {
        _db = db;
    }

    public async Task<UserAccount?> FindByEmailAsync(string email)
    {
        try
        {
            var sql = @"
               SELECT a.account_id, a.email, u.user_id, u.first_name, u.last_name, u.role_id
                FROM fjap.account a
                JOIN fjap.user u ON a.user_id = u.user_id
                WHERE a.email = @email
                LIMIT 1";
            return await _db.QueryFirstOrDefaultAsync<UserAccount>(sql, new { email });
        }
        catch (Exception ex)
        {
            Console.WriteLine("GoogleLogin error: " + ex.ToString());
            return null; // Fix: Return null on error, since StatusCodes is not a method and the method expects UserAccount?
        }
    }

    public class UserAccount
    {
        public int Account_Id { get; set; }
        public string Email { get; set; }
        public int User_Id { get; set; }
        public string First_Name { get; set; }
        public string Last_Name { get; set; }
        public int Role_Id { get; set; }
    }
}