using BusinessObjects.Models;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;

namespace Services;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepo;
    private readonly IVocabularyRepository _vocabRepo;
    private readonly IDictionaryAiService _aiService;
    private readonly ILogger<QuizService> _logger;

    public QuizService(
        IQuizRepository quizRepo, 
        IVocabularyRepository vocabRepo, 
        IDictionaryAiService aiService,
        ILogger<QuizService> logger)
    {
        _quizRepo = quizRepo;
        _vocabRepo = vocabRepo;
        _aiService = aiService;
        _logger = logger;
    }

    public async Task<QuizSession> CreateQuizAsync(long userId, int questionCount = 20)
    {
        var userVocabs = await _vocabRepo.GetUserVocabularyAsync(userId);
        if (!userVocabs.Any())
        {
            throw new Exception("User has no vocabulary to quiz on.");
        }

        // Priority Score Calculation
        // Priority = WrongCount * 5 + DaysSinceLastReview + (5 - MasteryLevel) * 2
        double getPriorityScore(UserVocabulary uv)
        {
            double daysSinceLast = uv.LastReviewed.HasValue 
                ? (DateTime.UtcNow - uv.LastReviewed.Value).TotalDays 
                : 30; // Default high if never reviewed
            
            return (uv.WrongCount * 5.0) + daysSinceLast + ((5 - uv.MasteryLevel) * 2.0);
        }

        var prioritizedVocabs = userVocabs
            .OrderByDescending(getPriorityScore)
            .Take(questionCount)
            .ToList();

        var session = new QuizSession
        {
            UserId = userId,
            TotalQuestions = prioritizedVocabs.Count,
            StartedAt = DateTime.UtcNow,
            Status = "In Progress"
        };

        await _quizRepo.CreateSessionAsync(session);

        var random = new Random();
        var questions = new List<QuizQuestion>();

        foreach (var uv in prioritizedVocabs)
        {
            var questionType = (QuizQuestionType)random.Next(0, 4);
            
            var question = new QuizQuestion
            {
                SessionId = session.Id,
                VocabularyId = uv.VocabularyId,
                QuestionType = questionType,
                AnsweredAt = null
            };

            SetupQuestionContent(question, uv.Vocabulary, userVocabs.Select(u => u.Vocabulary).ToList());
            await _quizRepo.AddQuestionAsync(question);
        }

        return await _quizRepo.GetSessionAsync(session.Id) ?? session;
    }

    private void SetupQuestionContent(QuizQuestion q, Vocabulary target, List<Vocabulary> pool)
    {
        var random = new Random();
        var distractors = pool.Where(v => v.Id != target.Id).OrderBy(x => random.Next()).Take(3).ToList();
        
        string getMeaning(Vocabulary v) {
             try {
                var doc = JsonDocument.Parse(v.Definitions);
                return doc.RootElement[0].GetProperty("meaning").GetString() ?? "Unknown";
             } catch { return "Unknown"; }
        }

        switch (q.QuestionType)
        {
            case QuizQuestionType.MultipleChoiceMeaning:
                q.QuestionText = $"Nghĩa của '{target.Word}' là gì?";
                q.CorrectAnswer = getMeaning(target);
                var optionsM = distractors.Select(d => getMeaning(d)).Append(q.CorrectAnswer).OrderBy(x => random.Next()).ToList();
                q.Options = JsonSerializer.Serialize(optionsM);
                break;

            case QuizQuestionType.MultipleChoiceWord:
                q.QuestionText = $"Từ nào ứng với nghĩa '{getMeaning(target)}'?";
                q.CorrectAnswer = target.Word;
                var optionsW = distractors.Select(d => d.Word).Append(q.CorrectAnswer).OrderBy(x => random.Next()).ToList();
                q.Options = JsonSerializer.Serialize(optionsW);
                break;

            case QuizQuestionType.PinyinMatch:
                q.QuestionText = $"Phiên âm (Pinyin) của '{target.Word}' là gì?";
                q.CorrectAnswer = target.Pinyin;
                var optionsP = distractors.Select(d => d.Pinyin).Append(q.CorrectAnswer).OrderBy(x => random.Next()).ToList();
                q.Options = JsonSerializer.Serialize(optionsP);
                break;

            case QuizQuestionType.FillInBlank:
                var example = target.ExampleSentencesNavigation.FirstOrDefault();
                if (example != null && example.ZhText.Contains(target.Word))
                {
                    q.QuestionText = example.ZhText.Replace(target.Word, "____") + $" ({example.ViText})";
                    q.CorrectAnswer = target.Word;
                    var optionsF = distractors.Select(d => d.Word).Append(q.CorrectAnswer).OrderBy(x => random.Next()).ToList();
                    q.Options = JsonSerializer.Serialize(optionsF);
                }
                else
                {
                    q.QuestionType = QuizQuestionType.MultipleChoiceMeaning;
                    q.QuestionText = $"Nghĩa của '{target.Word}' là gì?";
                    q.CorrectAnswer = getMeaning(target);
                    var opts = distractors.Select(d => getMeaning(d)).Append(q.CorrectAnswer).OrderBy(x => random.Next()).ToList();
                    q.Options = JsonSerializer.Serialize(opts);
                }
                break;
        }
    }

    private decimal calculateSkill(QuizSession session, QuizQuestionType type)
    {
        var questions = session.QuizQuestions.Where(q => q.QuestionType == type).ToList();
        if (!questions.Any()) return 50; // Neutral
        int correct = questions.Count(q => q.IsCorrect == true);
        return (decimal)correct / questions.Count * 100;
    }

    private decimal randomPercent(decimal? baseVal)
    {
        var r = new Random();
        return Math.Max(0, Math.Min(100, (baseVal ?? 50) + r.Next(-15, 15)));
    }

    private string GenerateBasicFeedback(QuizSession session)
    {
        if (session.AccuracyPercent >= 90) return "Xuất sắc! Bạn đã ghi nhớ rất tốt bộ từ vựng này. Hãy tiếp tục duy trì phong độ nhé!";
        if (session.AccuracyPercent >= 75) return "Tốt! Bạn nắm khá chắc kiến thức nhưng vẫn cần ôn lại một số từ thường nhầm lẫn.";
        if (session.AccuracyPercent >= 50) return "Trung bình. Bạn nên ôn tập thêm các từ đã sai trước khi học bài mới.";
        return "Cần cải thiện. Hãy dành thêm thời gian học lại Flashcard để nắm vững mặt chữ và nghĩa của từ.";
    }

    public async Task<bool> SubmitAnswerAsync(QuizQuestionAnswerDto dto)
    {
        var question = await _quizRepo.GetQuestionAsync(dto.QuestionId);
        if (question == null) return false;

        var isCorrect = question.CorrectAnswer.Trim().Equals(dto.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase);
        
        question.UserAnswer = dto.UserAnswer;
        question.IsCorrect = isCorrect;
        question.ResponseMs = dto.ResponseMs;
        question.AnsweredAt = DateTime.UtcNow;

        await _quizRepo.UpdateQuestionAsync(question);

        // Update Vocab Stats
        var uv = await _vocabRepo.GetUserVocabularyByIdsAsync(question.Session.UserId, question.VocabularyId);
        if (uv != null)
        {
            uv.LastReviewed = DateTime.UtcNow;
            if (isCorrect) {
                uv.CorrectCount++;
                if (uv.MasteryLevel < 5) uv.MasteryLevel++;
            } else {
                uv.WrongCount++;
                if (uv.MasteryLevel > 0) uv.MasteryLevel--;
            }
            if (uv.CorrectCount >= 10 && uv.MasteryLevel >= 4) uv.IsMastered = true;
            else if (uv.WrongCount > uv.CorrectCount + 5) uv.IsMastered = false;
            await _vocabRepo.UpdateUserVocabularyAsync(uv);
        }
        return true;
    }

    public async Task<QuizSession?> FinishQuizAsync(long sessionId)
    {
        var session = await _quizRepo.GetSessionAsync(sessionId);
        if (session == null) return null;

        int correctCount = session.QuizQuestions.Count(q => q.IsCorrect == true);
        session.CorrectAnswers = correctCount;
        session.AccuracyPercent = session.TotalQuestions > 0 ? (decimal)correctCount / session.TotalQuestions * 100 : 0;
        session.CompletedAt = DateTime.UtcNow;
        session.Status = "Completed";

        int totalScore = 0;
        int totalTimeMs = 0;
        foreach (var q in session.QuizQuestions) {
            if (q.IsCorrect == true) {
                int qScore = 10;
                if (q.ResponseMs < 5000) qScore += 5;
                else if (q.ResponseMs < 10000) qScore += 2;
                totalScore += qScore;
            }
            totalTimeMs += q.ResponseMs ?? 0;
        }

        session.Xp = session.AccuracyPercent > 90 ? 70 : (session.AccuracyPercent > 50 ? 50 : 20);
        session.XpEarned = session.Xp;
        session.Score = totalScore;
        session.TimeSpentSeconds = totalTimeMs / 1000;

        var skills = new Dictionary<string, decimal> {
            { "Meaning", calculateSkill(session, QuizQuestionType.MultipleChoiceMeaning) },
            { "Pinyin", calculateSkill(session, QuizQuestionType.PinyinMatch) },
            { "Characters", calculateSkill(session, QuizQuestionType.MultipleChoiceWord) },
            { "Grammar", calculateSkill(session, QuizQuestionType.FillInBlank) }
        };
        session.SkillsJson = JsonSerializer.Serialize(skills);
        session.AiFeedback = GenerateBasicFeedback(session);

        await _quizRepo.UpdateSessionAsync(session);
        return session;
    }

    public async Task<QuizSession?> SubmitQuizAsync(long sessionId, List<QuizQuestionAnswerDto> answers)
    {
        foreach (var ans in answers) await SubmitAnswerAsync(ans);
        return await FinishQuizAsync(sessionId);
    }

    public async Task<QuizSession?> GetQuizResultAsync(long sessionId)
    {
        return await _quizRepo.GetSessionAsync(sessionId);
    }
}
