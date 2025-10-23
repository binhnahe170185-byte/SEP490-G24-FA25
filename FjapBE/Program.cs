using System.Text;
using System.Security.Claims;
using Dapper;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories;
using FJAP.Repositories.Interfaces;
using FJAP.Services;
using FJAP.Services.Interfaces;
using FJAP.Infrastructure.Security; // JwtOptions, JwtTokenService
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MySql.Data.MySqlClient;
using System.Data;

var builder = WebApplication.CreateBuilder(args);

// =================== Services ===================

// Controllers
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
});

// ----- DB (EF Core MySQL) -----
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:MySql");

builder.Services.AddDbContext<FjapDbContext>(options =>
    options.UseMySql(
        connStr,
        new MySqlServerVersion(new Version(8, 0, 34)),
        mysql =>
        {
            mysql.SchemaBehavior(MySqlSchemaBehavior.Ignore);
            mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(30), null);
        }
    )
);

// Dapper: map snake_case -> PascalCase
DefaultTypeMap.MatchNamesWithUnderscores = true;

// ----- Dapper IDbConnection DI -----
builder.Services.AddScoped<IDbConnection>(sp => new MySqlConnection(connStr));

// ----- Repository & Service DI -----
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IClassRepository, ClassRepository>();
builder.Services.AddScoped<IMaterialRepository, MaterialRepository>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();

builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IMaterialService, MaterialService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();

builder.Services.AddScoped<IStaffOfAdminRepository, StaffOfAdminRepository>();
builder.Services.AddScoped<IStaffOfAdminService, StaffOfAdminService>();

// ----- CORS -----
const string CorsPolicy = "AllowFrontend";
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(CorsPolicy, p =>
        p.WithOrigins("http://localhost:3000")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

// ----- JWT -----
var jwtOpt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Missing Jwt section");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpt.Key));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.RequireHttpsMetadata = false; // dev
        o.SaveToken = true;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = jwtOpt.Issuer,
            ValidAudience = jwtOpt.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("ManagerOrAdmin", p => p.RequireRole("Manager", "Admin"));
    opt.AddPolicy("RoleId>=2", p => p.RequireAssertion(ctx =>
    {
        var s = ctx.User.FindFirst("role_id")?.Value;
        return int.TryParse(s, out var id) && id >= 2;
    }));
});

// Service phát JWT để controller dùng
builder.Services.AddSingleton(new JwtTokenService(jwtOpt));

// ----- Swagger (+Bearer) -----
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FJAP API", Version = "v1" });
    var jwtScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Nhập: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", jwtScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtScheme, Array.Empty<string>() }
    });
});

// =================== App pipeline ===================
var app = builder.Build();

// Chỉ redirect HTTPS khi chạy ngoài dev (tránh lỗi không xác định cổng https)
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);

app.UseAuthentication();   // phải trước Authorization
app.UseAuthorization();

app.MapControllers();

// Endpoint test claims nhanh
app.MapGet("/api/auth/me", (ClaimsPrincipal user) =>
{
    var uid = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    var email = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value;
    var name = user.FindFirst("name")?.Value;
    var role = user.FindFirst(ClaimTypes.Role)?.Value;
    var roleId = user.FindFirst("role_id")?.Value;
    return Results.Ok(new { userId = uid, email, name, role, roleId });
}).RequireAuthorization();

app.Run();
