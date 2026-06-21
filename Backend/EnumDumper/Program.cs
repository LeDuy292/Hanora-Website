using System;
using Npgsql;

var connString = "Host=localhost;Port=5432;Database=Hanora;Username=postgres;Password=1842004duy";
await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

var sql = "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder;";
await using var cmd = new NpgsqlCommand(sql, conn);
await using var reader = await cmd.ExecuteReaderAsync();

while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader.GetString(0)}:{reader.GetString(1)}");
}
