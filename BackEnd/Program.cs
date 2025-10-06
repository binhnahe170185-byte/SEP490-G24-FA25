using Backend.Data;
using Microsoft.OpenApi.Models;
using Dapper;
using FJAP.Handles.student;
using FJAP.Handles.Manager;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// CORS
const string CorsPolicy = "AllowFrontend";
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(CorsPolicy, p =>
        p.WithOrigins("http://localhost:3000")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FAJP API", Version = "v1" });
});

// Dapper config (nếu DB đặt tên cột snake_case)
DefaultTypeMap.MatchNamesWithUnderscores = true;

// DI: Db helper + Handle
builder.Services.AddSingleton<MySqlDb>();
builder.Services.AddScoped<IStudentsHandle, StudentsHandle>();
builder.Services.AddScoped<IClassHandle, ClassHandle>();

var app = builder.Build();

// Middleware
// (Dev có thể để https sau)
app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Endpoint test “me”
app.MapGet("/api/auth/me", (System.Security.Claims.ClaimsPrincipal user) =>
{
    var uid = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var email = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value;
    var name = user.FindFirst("name")?.Value;
    var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var roleId = user.FindFirst("role_id")?.Value;
    return Results.Ok(new { userId = uid, email, name, role, roleId });
}).RequireAuthorization();

app.Run();
