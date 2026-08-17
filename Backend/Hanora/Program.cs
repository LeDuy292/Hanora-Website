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

            // Windows Event Log requires elevated permissions on some development machines.
            // If it cannot write, logging itself turns otherwise valid API requests into 500 errors.
            if (builder.Environment.IsDevelopment())
            {
                builder.Logging.ClearProviders();
                builder.Logging.AddConsole();
                builder.Logging.AddDebug();
            }

            // Database
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = "Host=reseau.proxy.rlwy.net;Port=32993;Database=railway;Username=postgres;Password=yMEnWyNEDKcPQRgdrnzlXclATiyOjZjo";
            }
            var connStrBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
            {
                Timeout = 30,
                CommandTimeout = 60,
                KeepAlive = 15,
                ConnectionIdleLifetime = 45,
                ConnectionPruningInterval = 10,
                Pooling = true,
                MinPoolSize = 1,
                MaxPoolSize = 25
            };

            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connStrBuilder.ConnectionString);
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
                options.UseNpgsql(dataSource, npgsqlOptions =>
                {
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null);
                }));

            // DI
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IAuthService, AuthService>();

            // Document Processing & OCR
            builder.Services.AddHttpClient<IOcrService, OcrService>();
            builder.Services.AddSingleton<IBackgroundTaskQueue, DefaultBackgroundTaskQueue>();
            builder.Services.AddSingleton<IChineseSegmenterService, ChineseSegmenterService>();
            builder.Services.AddScoped<ILayoutAnalysisService, LayoutAnalysisService>();

            var documentWorkerCount = Math.Clamp(
                builder.Configuration.GetValue("DocumentProcessing:WorkerCount", 2),
                1,
                8);
            for (var i = 0; i < documentWorkerCount; i++)
            {
                builder.Services.AddHostedService<DocumentProcessingWorker>();
            }

            builder.Services.AddHostedService<LeaderboardWeeklyRewardWorker>();

            builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
            builder.Services.AddScoped<IS3StorageService, S3StorageService>();
            builder.Services.AddScoped<IDocumentProcessingService, DocumentProcessingService>();
            builder.Services.AddScoped<IVocabularyRepository, VocabularyRepository>();
            builder.Services.AddScoped<IDictionaryAiService, DictionaryAiService>();
            builder.Services.AddScoped<IVocabularyService, VocabularyService>();
            builder.Services.AddScoped<IQuizRepository, QuizRepository>();
            builder.Services.AddScoped<IQuizAiService, QuizAiService>();
            builder.Services.AddScoped<IQuizService, QuizService>();
            builder.Services.AddScoped<IFlashcardRepository, FlashcardRepository>();
            builder.Services.AddScoped<IFlashcardService, FlashcardService>();
            builder.Services.AddScoped<ISrsService, SrsService>();
            builder.Services.AddScoped<IStatsRepository, StatsRepository>();
            builder.Services.AddScoped<IStatsService, StatsService>();
            builder.Services.AddScoped<IProgressRepository, ProgressRepository>();
            builder.Services.AddScoped<IProgressService, ProgressService>();
            builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
            builder.Services.AddScoped<IChatRepository, ChatRepository>();
            builder.Services.AddScoped<IDeepseekChatService, DeepseekChatService>();
            builder.Services.AddScoped<IChatService, ChatService>();
            builder.Services.AddScoped<ICommunityRepository, CommunityRepository>();
            builder.Services.AddScoped<ICommunityService, CommunityService>();

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
                    
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/communityhub"))
                            {
                                context.Token = accessToken;
                            }
                            return Task.CompletedTask;
                        }
                    };
                });

            builder.Services.AddAuthorization();
            // CORS - allow local dev plus configured deployed frontend origins.
            var configuredCorsOrigins = builder.Configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            var corsString = builder.Configuration["Cors:AllowedOrigins"] ?? builder.Configuration["CORS_ALLOWED_ORIGINS"];
            var extraOrigins = new List<string>(configuredCorsOrigins);
            if (!string.IsNullOrWhiteSpace(corsString))
            {
                var split = corsString.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                extraOrigins.AddRange(split);
            }

            var allowedCorsOrigins = new[]
                {
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:3000",
                    "http://localhost:5187",
                    "https://hanora-website.vercel.app",
                    "https://www.hanora.id.vn",
                    "https://hanora.id.vn"
                }
                .Concat(extraOrigins)
                .Where(origin => !string.IsNullOrWhiteSpace(origin))
                .Select(origin => origin.Trim().TrimEnd('/'))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("FrontendPolicy", policy =>
                {
                    policy.SetIsOriginAllowed(origin =>
                    {
                        if (string.IsNullOrWhiteSpace(origin)) return false;
                        var normalized = origin.Trim().TrimEnd('/');

                        if (allowedCorsOrigins.Contains(normalized)) return true;

                        try
                        {
                            var uri = new Uri(normalized);
                            var host = uri.Host;

                            if (host.Equals("hanora.id.vn", StringComparison.OrdinalIgnoreCase) ||
                                host.EndsWith(".hanora.id.vn", StringComparison.OrdinalIgnoreCase) ||
                                host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
                                host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                                host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
                            {
                                return true;
                            }
                        }
                        catch { }

                        return false;
                    })
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
            builder.Services.AddSignalR();

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

            // Support reverse proxies (like Railway)
            var forwardedOptions = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions
            {
                ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
            };
            forwardedOptions.KnownNetworks.Clear();
            forwardedOptions.KnownProxies.Clear();
            app.UseForwardedHeaders(forwardedOptions);

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Apply CORS before static files so locally stored documents and OCR JSON
            // also receive Access-Control-Allow-Origin headers.
            app.UseCors("FrontendPolicy");

            // Serve static files (local file upload fallback for dev when S3 is unavailable).
            // Ensure static file responses include CORS headers so the React dev server
            // (running on a different origin) can fetch PDFs and OCR JSON.
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            Directory.CreateDirectory(wwwrootPath);
            app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    var origin = ctx.Context.Request.Headers["Origin"].ToString();
                    if (!string.IsNullOrEmpty(origin))
                    {
                        var normalized = origin.Trim().TrimEnd('/');
                        var isAllowed = allowedCorsOrigins.Contains(normalized);
                        if (!isAllowed)
                        {
                            try
                            {
                                var uri = new Uri(normalized);
                                var host = uri.Host;
                                if (host.Equals("hanora.id.vn", StringComparison.OrdinalIgnoreCase) ||
                                    host.EndsWith(".hanora.id.vn", StringComparison.OrdinalIgnoreCase) ||
                                    host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
                                    host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                                    host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
                                {
                                    isAllowed = true;
                                }
                            }
                            catch { }
                        }

                        if (isAllowed)
                        {
                            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
                            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
                            ctx.Context.Response.Headers.Append("Vary", "Origin");
                            return;
                        }
                    }

                    // Fallback: allow any origin for static files if no matching origin found.
                    ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
                }
            });

            // Avoid HTTP->HTTPS redirects in development so the React dev
            // server (http://localhost:5173) can call the HTTP API directly.
            if (!app.Environment.IsDevelopment())
                app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.MapHub<Hanora.Hubs.CommunityHub>("/communityhub");
            app.Run();
        }
    }
}
