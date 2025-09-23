using Backend.Data;
using Backend.Handles;
using Microsoft.OpenApi.Models;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// ===== Services =====
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

var app = builder.Build();

// ===== Middleware =====
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(CorsPolicy);

app.MapControllers();

app.Run();
