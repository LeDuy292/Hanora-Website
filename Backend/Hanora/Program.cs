using DataAccessObjects;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Repositories;
using Services;
using System.Text;

namespace Hanora
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Database
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(builder.Configuration.GetConnectionString("DefaultConnection"));
            dataSourceBuilder.MapEnum<BusinessObjects.Models.ChannelType>("channel_type_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.DocumentStatus>("document_status_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.FlashcardMode>("flashcard_mode_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.FlipResult>("flip_result_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.LeaderboardPeriod>("leaderboard_period_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.LearnQuestionType>("learn_question_type_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.LearnResult>("learn_result_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.ReportStatus>("report_status_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.RelationType>("relation_type_enum");
            dataSourceBuilder.MapEnum<BusinessObjects.Models.WordType>("word_type_enum");

            var dataSource = dataSourceBuilder.Build();
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(dataSource));

            // DI
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IAuthService, AuthService>();

            // Document Processing & OCR
            builder.Services.AddHttpClient();
            builder.Services.AddSingleton<IBackgroundTaskQueue, DefaultBackgroundTaskQueue>();
            builder.Services.AddHostedService<DocumentProcessingWorker>();
            builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
            builder.Services.AddScoped<IS3StorageService, S3StorageService>();
            builder.Services.AddScoped<IOcrService, OcrService>();
            builder.Services.AddScoped<IDocumentProcessingService, DocumentProcessingService>();
            builder.Services.AddScoped<IVocabularyRepository, VocabularyRepository>();
            builder.Services.AddScoped<IDictionaryAiService, DictionaryAiService>();
            builder.Services.AddScoped<IVocabularyService, VocabularyService>();
            builder.Services.AddScoped<IQuizRepository, QuizRepository>();
            builder.Services.AddScoped<IQuizAiService, QuizAiService>();
            builder.Services.AddScoped<IQuizService, QuizService>();
            builder.Services.AddScoped<IFlashcardRepository, FlashcardRepository>();
            builder.Services.AddScoped<IFlashcardService, FlashcardService>();
            builder.Services.AddScoped<IStatsRepository, StatsRepository>();
            builder.Services.AddScoped<IStatsService, StatsService>();
            builder.Services.AddScoped<IProgressRepository, ProgressRepository>();
            builder.Services.AddScoped<IProgressService, ProgressService>();
            builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();

            // JWT Authentication
            var jwtKey = builder.Configuration["Jwt:Key"]!;
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                    };
                });

            builder.Services.AddAuthorization();

            // CORS — allow React dev server
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("FrontendPolicy", policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:5173",
                            "http://localhost:3000",
                            "https://hanora-website.vercel.app"
                        )
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials()
                        .WithExposedHeaders("Content-Disposition");
                });
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
                });
            builder.Services.AddEndpointsApiExplorer();

            // Swagger with JWT support
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Hanora API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            // Run database updates at startup
            using (var scope = app.Services.CreateScope())
            {
                try
                {
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    context.Database.ExecuteSqlRaw(@"
                        ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS average_pronunciation_score NUMERIC(5,2) DEFAULT 0.00;
                        ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_pronunciation_attempts INTEGER DEFAULT 0;
                        ALTER TABLE documents ADD COLUMN IF NOT EXISTS annotations_json TEXT;
                        ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS han_viet VARCHAR(100);
                        ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS collocations TEXT;
                        ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS grammar_patterns TEXT;
                    ");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error running database migrations: {ex.Message}");
                }
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Avoid HTTP->HTTPS redirects in development so the React dev
            // server (http://localhost:5173) can call the HTTP API directly.
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            app.UseCors("FrontendPolicy");
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.Run();
        }
    }
}
