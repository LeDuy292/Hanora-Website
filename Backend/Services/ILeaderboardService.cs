using System.Collections.Generic;
using System.Threading.Tasks;

namespace Services
{
    public interface ILeaderboardService
    {
        Task<LeaderboardResultDto> GetLeaderboardAsync(long userId, string period, string criteria);
    }

    public record LeaderboardResultDto
    {
        public LeaderboardUserDto? CurrentUser { get; init; }
        public List<LeaderboardUserDto> Top3 { get; init; } = new();
        public List<LeaderboardUserDto> Rankings { get; init; } = new();
        public HallOfFameDto HallOfFame { get; init; } = new();
    }

    public record LeaderboardUserDto
    {
        public int Rank { get; init; }
        public long UserId { get; init; }
        public string Username { get; init; } = "";
        public string DisplayName { get; init; } = "";
        public string? AvatarUrl { get; init; }
        public int Level { get; init; }
        public double Score { get; init; }
        public int Streak { get; init; }
        public int Xp { get; init; }
        public string? SecondaryValue { get; init; }
    }

    public record HallOfFameDto
    {
        public HallOfFameWinnerDto? VocabularyKing { get; init; }
        public HallOfFameWinnerDto? PracticeMaster { get; init; }
        public HallOfFameWinnerDto? ReadingChampion { get; init; }
        public HallOfFameWinnerDto? PronunciationMaster { get; init; }
        public HallOfFameWinnerDto? LongestStreak { get; init; }
    }

    public record HallOfFameWinnerDto
    {
        public string DisplayName { get; init; } = "";
        public string? AvatarUrl { get; init; }
        public double Value { get; init; }
        public string Label { get; init; } = "";
    }
}
