using System;
using System.Linq;
using System.Threading.Tasks;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Repositories;
using Services;

namespace DbTest
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var services = new ServiceCollection();
            
            var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder("Host=reseau.proxy.rlwy.net;Port=32993;Database=railway;Username=postgres;Password=yMEnWyNEDKcPQRgdrnzlXclATiyOjZjo");
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
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(dataSource));

            services.AddScoped<IVocabularyRepository, VocabularyRepository>();
            services.AddScoped<IFlashcardRepository, FlashcardRepository>();
            services.AddScoped<IFlashcardService, FlashcardService>();
            services.AddScoped<IProgressRepository, ProgressRepository>();
            services.AddScoped<IProgressService, ProgressService>();
            services.AddScoped<IStatsRepository, StatsRepository>();
            services.AddScoped<IStatsService, StatsService>();
            services.AddScoped<IVocabularyService, VocabularyService>();
            services.AddScoped<IDictionaryAiService, DictionaryAiService>();
            
            var provider = services.BuildServiceProvider();
            var scope = provider.CreateScope();
            
            try 
            {
                await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.ExecuteSqlRawAsync(
                    "ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;");
                Console.WriteLine("SUCCESS: ALTER TABLE user_vocabulary");
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: ALTER TABLE");
                Console.WriteLine(ex.ToString());
            }
        }
    }
}
