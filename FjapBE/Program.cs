using System.Text;
using System.Security.Claims;
using System.IO;
using Dapper;
using FJAP.Hubs;
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
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using MySql.Data.MySqlClient;
using System.Data;

var builder = WebApplication.CreateBuilder(args);

// Ensure web root exists so static files and uploads share same folder
var runtimeWebRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
Directory.CreateDirectory(runtimeWebRoot);
builder.Environment.WebRootPath = runtimeWebRoot;
builder.Environment.WebRootFileProvider = new PhysicalFileProvider(runtimeWebRoot);
Directory.CreateDirectory(Path.Combine(runtimeWebRoot, "uploads", "homeworks"));

// =================== Services ===================

// Controllers with JSON options
builder.Services.AddControllers(options =>
{
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
})
.AddJsonOptions(options =>
{
    // Use camelCase for JSON properties (matches frontend)
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    // Handle circular references
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    // Increase max depth to handle nested objects
    options.JsonSerializerOptions.MaxDepth = 64;
    // DateOnly serialization as "YYYY-MM-DD"
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    options.JsonSerializerOptions.Converters.Add(new FJAP.Infrastructure.JsonConverters.DateOnlyJsonConverter());
    options.JsonSerializerOptions.Converters.Add(new FJAP.Infrastructure.JsonConverters.NullableDateOnlyJsonConverter());
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
builder.Services.AddScoped<ILecturerRepository, LecturerRepository>();

builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IMaterialService, MaterialService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ILecturerService, LecturerService>();

builder.Services.AddScoped<IStaffOfAdminRepository, StaffOfAdminRepository>();
builder.Services.AddScoped<IStaffOfAdminService, StaffOfAdminService>();
builder.Services.AddScoped<ISemesterRepository, SemesterRepository>();
builder.Services.AddScoped<ISemesterService, SemesterService>();
builder.Services.AddScoped<IHolidayRepository, HolidayRepository>();
builder.Services.AddScoped<IHolidayService, HolidayService>();

builder.Services.AddScoped<IGradeRepository, GradeRepository>();
builder.Services.AddScoped<IGradeService, GradeService>();

builder.Services.AddScoped<INewsRepository, NewsRepository>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IProfileService, ProfileService>();

// ----- HttpClient for external APIs -----
builder.Services.AddHttpClient();
builder.Services.AddSignalR();

// ----- CORS -----
const string CorsPolicy = "AllowFrontend";
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(CorsPolicy, p =>
        p.WithOrigins(
            "http://localhost:3000",
            "https://gray-plant-0778b1000.3.azurestaticapps.net"
        )
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
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
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/notifications", StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
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

var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".sql"] = "application/octet-stream";

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = builder.Environment.WebRootFileProvider,
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path;
        if (path.HasValue && path.Value.StartsWith("/uploads/homeworks", StringComparison.OrdinalIgnoreCase))
        {
            var fileName = Path.GetFileName(path);
            ctx.Context.Response.Headers["Content-Disposition"] =
                $"attachment; filename=\"{fileName}\"";
        }
    }
});

// Request logging middleware for debugging
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/Semester") && context.Request.Method == "POST")
    {
        Console.WriteLine("=== Incoming POST /api/Semester request ===");
        Console.WriteLine($"Content-Type: {context.Request.ContentType}");
        context.Request.EnableBuffering();
        var bodyStream = new StreamReader(context.Request.Body);
        var bodyText = await bodyStream.ReadToEndAsync();
        context.Request.Body.Position = 0;
        Console.WriteLine($"Request Body: {bodyText}");
    }
    await next();
});

app.UseCors(CorsPolicy);

app.UseAuthentication();   // phải trước Authorization
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").RequireAuthorization();

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
