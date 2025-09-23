using Dapper;
using MySqlConnector;
using System.Data;

namespace Backend.Data;

public class MySqlDb
{
    private readonly string _cs;
    public MySqlDb(IConfiguration cfg)
    {
        _cs = cfg.GetConnectionString("MySql")!;
    }


    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
    {
        await using var con = new MySqlConnection(_cs);
        return await con.QueryAsync<T>(sql, param);
    }

    public async Task<int> ExecuteAsync(string sql, object? param = null)
    {
        await using var con = new MySqlConnection(_cs);
        return await con.ExecuteAsync(sql, param);
    }
}
