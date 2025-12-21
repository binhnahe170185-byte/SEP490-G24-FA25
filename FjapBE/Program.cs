using System.Text;
using System.Security.Claims;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Http;
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
builder.Services.AddScoped<IAttendanceRepository, AttendanceRepository>();

builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IMaterialService, MaterialService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ILecturerService, LecturerService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IScheduleAvailabilityService, ScheduleAvailabilityService>();

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
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<ILessonService, LessonService>();

builder.Services.AddScoped<IFeedbackRepository, FeedbackRepository>();
builder.Services.AddScoped<IFeedbackQuestionRepository, FeedbackQuestionRepository>();
builder.Services.AddScoped<IDailyFeedbackRepository, DailyFeedbackRepository>();
builder.Services.AddScoped<IFeedbackService, FeedbackService>();
builder.Services.AddScoped<IFeedbackQuestionService, FeedbackQuestionService>();
builder.Services.AddScoped<IDailyFeedbackService, DailyFeedbackService>();
builder.Services.AddScoped<IFeedbackCheckService, FeedbackCheckService>();
builder.Services.AddScoped<IFeedbackTextAnalysisService, FeedbackTextAnalysisService>();
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddScoped<FJAP.Services.Ai.GeminiFeedbackAnalyzer>();
builder.Services.AddScoped<IEmailService, EmailService>();

// ----- Background Services -----
builder.Services.AddHostedService<FJAP.Services.ClassStatusBackgroundService>();

// ----- HttpClient for external APIs -----
builder.Services.AddHttpClient();
builder.Services.AddSignalR();
// ----- AI & Feedback Services -----

// Register HttpClient (needed for OpenAI and Gemini)
builder.Services.AddHttpClient();

// Always register Mock AI Provider as fallback
builder.Services.AddScoped<FJAP.Services.AIProviders.MockAIProvider>();

// Configure AI Provider with fallback mechanism
// Priority: Gemini > OpenAI > Mock
var aiProvider = builder.Configuration["AI:Provider"] ?? "Gemini";
var geminiApiKey = builder.Configuration["AI:Gemini:ApiKey"] 
                ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
var openAiApiKey = builder.Configuration["AI:OpenAI:ApiKey"] 
                ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");

FJAP.Services.Interfaces.IAIProvider? primaryProvider = null;

// Try Gemini first
if (!string.IsNullOrEmpty(geminiApiKey) && (aiProvider == "Gemini" || string.IsNullOrEmpty(openAiApiKey)))
{
    Console.WriteLine($"[AI Config] Gemini API Key found: {geminiApiKey.Substring(0, Math.Min(10, geminiApiKey.Length))}...");
    Console.WriteLine($"[AI Config] Provider setting: {aiProvider}");
    
    builder.Services.AddScoped<FJAP.Services.AIProviders.GeminiProvider>(sp =>
    {
        var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
        var httpClient = httpClientFactory.CreateClient();
        return new FJAP.Services.AIProviders.GeminiProvider(httpClient, builder.Configuration);
    });
    
    builder.Services.AddScoped<FJAP.Services.Interfaces.IAIProvider>(sp =>
    {
        var primary = sp.GetRequiredService<FJAP.Services.AIProviders.GeminiProvider>();
        var fallback = sp.GetRequiredService<FJAP.Services.AIProviders.MockAIProvider>();
        var logger = sp.GetService<ILogger<FJAP.Services.AIProviders.FallbackAIProvider>>();
        return new FJAP.Services.AIProviders.FallbackAIProvider(primary, fallback, logger);
    });
    
    Console.WriteLine("✅ Gemini AI Provider configured with Mock AI fallback");
}
// Fallback to OpenAI
else if (!string.IsNullOrEmpty(openAiApiKey))
{
    builder.Services.AddScoped<FJAP.Services.AIProviders.OpenAIProvider>(sp =>
    {
        var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
        var httpClient = httpClientFactory.CreateClient();
        return new FJAP.Services.AIProviders.OpenAIProvider(httpClient, builder.Configuration);
    });
    
    builder.Services.AddScoped<FJAP.Services.Interfaces.IAIProvider>(sp =>
    {
        var primary = sp.GetRequiredService<FJAP.Services.AIProviders.OpenAIProvider>();
        var fallback = sp.GetRequiredService<FJAP.Services.AIProviders.MockAIProvider>();
        var logger = sp.GetService<ILogger<FJAP.Services.AIProviders.FallbackAIProvider>>();
        return new FJAP.Services.AIProviders.FallbackAIProvider(primary, fallback, logger);
    });
    
    Console.WriteLine("✅ OpenAI AI Provider configured with Mock AI fallback");
}
else
{
    // No API key, use Mock AI directly
    builder.Services.AddScoped<FJAP.Services.Interfaces.IAIProvider, FJAP.Services.AIProviders.MockAIProvider>();
    Console.WriteLine("⚠️ Using Mock AI Provider only (no Gemini or OpenAI API key found)");
}

builder.Services.AddScoped<IAIService, AIService>();
// ----- CORS -----
const string CorsPolicy = "AllowFrontend";
var allowedFrontendOrigins = new[]
{
    "http://localhost:3000",
    "https://gray-plant-0778b1000.3.azurestaticapps.net"
};
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(CorsPolicy, p =>
        p.WithOrigins(allowedFrontendOrigins)
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
contentTypeProvider.Mappings[".sql"] = "text/plain";

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = builder.Environment.WebRootFileProvider,
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path;
        if (path.HasValue && path.Value.StartsWith("/uploads/homeworks", StringComparison.OrdinalIgnoreCase))
        {
            var origin = ctx.Context.Request.Headers["Origin"].ToString();
            if (!string.IsNullOrEmpty(origin) &&
                allowedFrontendOrigins.Any(o => string.Equals(o, origin, StringComparison.OrdinalIgnoreCase)))
            {
                ctx.Context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                ctx.Context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                ctx.Context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With";
                ctx.Context.Response.Headers["Access-Control-Expose-Headers"] = "Content-Disposition";
            }
        }
    }
});

app.Use(async (context, next) =>
{
    if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase) &&
        context.Request.Path.StartsWithSegments("/uploads/homeworks", StringComparison.OrdinalIgnoreCase))
    {
        var origin = context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin) &&
            allowedFrontendOrigins.Any(o => string.Equals(o, origin, StringComparison.OrdinalIgnoreCase)))
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With";
            context.Response.Headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
        }
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
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
