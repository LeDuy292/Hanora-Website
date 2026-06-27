using BusinessObjects.Models;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;

namespace Services;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepo;
    private readonly IVocabularyRepository _vocabRepo;
    private readonly IQuizAiService _quizAi;
    private readonly ILogger<QuizService> _logger;
    private readonly IStatsService _statsService;

    // Mastery is tracked on a 0–100 scale (see spec). +5 correct, -3 wrong.
    private const int MasteryMax = 100;
    private const int MasteryMin = 0;
    private const int MasteryGain = 5;
    private const int MasteryLoss = 3;
    private const int SlowAnswerMs = 15000; // answers slower than this flag the word for review

    public QuizService(
        IQuizRepository quizRepo,
        IVocabularyRepository vocabRepo,
        IQuizAiService quizAi,
        ILogger<QuizService> logger,
        IStatsService statsService)
    {
        _quizRepo = quizRepo;
        _vocabRepo = vocabRepo;
        _quizAi = quizAi;
        _logger = logger;
        _statsService = statsService;
    }

    // ============================================================
    // CREATE — pick words (70% weak / 30% known), generate via AI,
    // fall back to local generation, persist everything.
    // ============================================================
    public async Task<QuizSession> CreateQuizAsync(long userId, StartTestRequest request)
    {
        var userVocabs = await _vocabRepo.GetUserVocabularyAsync(userId);
        if (!userVocabs.Any())
            throw new Exception("User has no vocabulary to quiz on.");

        // Close out any lingering open sessions so the user only ever has one active test.
        await _quizRepo.AbandonInProgressSessionsAsync(userId);

        int count = Math.Clamp(request.QuestionCount, 1, userVocabs.Count);
        var selected = SelectVocabulary(userVocabs, count);

        var session = new QuizSession
        {
            UserId = userId,
            TotalQuestions = selected.Count,
            StartedAt = DateTime.UtcNow,
            Status = "In Progress",
            Difficulty = string.IsNullOrWhiteSpace(request.Difficulty) ? "medium" : request.Difficulty,
            QuestionTypes = JsonSerializer.Serialize(request.QuestionTypes ?? new List<string>())
        };
        await _quizRepo.CreateSessionAsync(session);

        var questions = await BuildQuestionsAsync(session, selected, userVocabs, request);
        session.Generator = questions.generator;
        session.TotalQuestions = questions.list.Count;

        await _quizRepo.AddQuestionsAsync(questions.list);
        await _quizRepo.UpdateSessionAsync(session);

        return await _quizRepo.GetSessionAsync(session.Id) ?? session;
    }

    /// <summary>70% of slots from the weakest words, 30% from the most-known, by priority score.</summary>
    private List<UserVocabulary> SelectVocabulary(List<UserVocabulary> all, int count)
    {
        double Priority(UserVocabulary uv)
        {
            double daysSinceLast = uv.LastReviewed.HasValue
                ? (DateTime.UtcNow - uv.LastReviewed.Value).TotalDays
                : 30;
            return (uv.WrongCount * 5.0) + daysSinceLast + ((5 - Math.Min(uv.MasteryLevel, 5)) * 2.0);
        }

        var weakPool = all.OrderByDescending(Priority).ToList();
        var knownPool = all.OrderBy(Priority).ToList();

        int weakCount = (int)Math.Round(count * 0.7);
        int knownCount = count - weakCount;

        var picked = new List<UserVocabulary>();
        picked.AddRange(weakPool.Take(weakCount));
        picked.AddRange(knownPool.Where(k => !picked.Contains(k)).Take(knownCount));

        // Top up if dedup left us short, then trim.
        if (picked.Count < count)
            picked.AddRange(weakPool.Where(w => !picked.Contains(w)).Take(count - picked.Count));

        return picked.Take(count).ToList();
    }

    private async Task<(List<QuizQuestion> list, string generator)> BuildQuestionsAsync(
        QuizSession session,
        List<UserVocabulary> selected,
        List<UserVocabulary> allUserVocabs,
        StartTestRequest request)
    {
        // 1) Try AI generation.
        if (_quizAi.IsConfigured)
        {
            try
            {
                var vocabItems = selected.Select(uv => new AiVocabItem
                {
                    Word = uv.Vocabulary.Word,
                    Pinyin = uv.Vocabulary.Pinyin,
                    Meaning = GetMeaning(uv.Vocabulary),
                    MasteryLevel = uv.MasteryLevel
                }).ToList();

                var aiQuestions = await _quizAi.GenerateQuestionsAsync(
                    vocabItems, request.QuestionTypes ?? new(), session.Difficulty ?? "medium", selected.Count);

                if (aiQuestions != null && aiQuestions.Count > 0)
                {
                    var wordToVocab = selected
                        .GroupBy(uv => uv.Vocabulary.Word)
                        .ToDictionary(g => g.Key, g => g.First().Vocabulary);

                    var mapped = new List<QuizQuestion>();
                    int order = 1;
                    foreach (var aq in aiQuestions)
                    {
                        // Match AI question back to a real vocabulary row; skip if it invented a word.
                        if (aq.Word == null || !wordToVocab.TryGetValue(aq.Word, out var vocab))
                            vocab = selected[(order - 1) % selected.Count].Vocabulary;

                        mapped.Add(new QuizQuestion
                        {
                            SessionId = session.Id,
                            VocabularyId = vocab.Id,
                            QuestionType = aq.QuestionType,
                            QuestionText = aq.QuestionText,
                            Options = JsonSerializer.Serialize(aq.Options),
                            CorrectAnswer = aq.CorrectAnswer,
                            Explanation = aq.Explanation,
                            QuestionOrder = order++,
                            Flagged = false
                        });
                    }
                    _logger.LogInformation("Generated {Count} AI questions for session {Session}.", mapped.Count, session.Id);
                    return (mapped, "ai");
                }
                _logger.LogWarning("AI returned no usable questions; falling back to local generation.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI question generation failed; falling back to local generation.");
            }
        }

        // 2) Local fallback.
        return (BuildLocalQuestions(session, selected, allUserVocabs, request), "local");
    }

    // ============================================================
    // LOCAL FALLBACK — deterministic generation from the vocab pool.
    // ============================================================
    private List<QuizQuestion> BuildLocalQuestions(
        QuizSession session,
        List<UserVocabulary> selected,
        List<UserVocabulary> allUserVocabs,
        StartTestRequest request)
    {
        var pool = allUserVocabs.Select(u => u.Vocabulary).ToList();
        var random = new Random();

        // Restrict to the user's chosen types when given; otherwise use all four.
        var allowed = (request.QuestionTypes != null && request.QuestionTypes.Count > 0)
            ? request.QuestionTypes
            : new List<string> { "multiple_choice_meaning", "multiple_choice_word", "pinyin_match", "fill_in_blank" };

        var questions = new List<QuizQuestion>();
        int order = 1;
        foreach (var uv in selected)
        {
            var type = allowed[random.Next(allowed.Count)];
            var q = new QuizQuestion
            {
                SessionId = session.Id,
                VocabularyId = uv.VocabularyId,
                QuestionOrder = order++,
                Flagged = false
            };
            SetupLocalQuestion(q, type, uv.Vocabulary, pool, random);
            questions.Add(q);
        }
        return questions;
    }

    private void SetupLocalQuestion(QuizQuestion q, string type, Vocabulary target, List<Vocabulary> pool, Random random)
    {
        var distractors = pool.Where(v => v.Id != target.Id).OrderBy(_ => random.Next()).Take(3).ToList();

        switch (type)
        {
            case "multiple_choice_word":
                q.QuestionType = "multiple_choice_word";
                q.QuestionText = $"Từ nào ứng với nghĩa '{GetMeaning(target)}'?";
                q.CorrectAnswer = target.Word;
                q.Options = JsonSerializer.Serialize(
                    distractors.Select(d => d.Word).Append(q.CorrectAnswer).OrderBy(_ => random.Next()).ToList());
                q.Explanation = $"'{target.Word}' ({target.Pinyin}) nghĩa là '{GetMeaning(target)}'.";
                break;

            case "pinyin_match":
                q.QuestionType = "pinyin_match";
                q.QuestionText = $"Phiên âm (Pinyin) của '{target.Word}' là gì?";
                q.CorrectAnswer = target.Pinyin;
                q.Options = JsonSerializer.Serialize(
                    distractors.Select(d => d.Pinyin).Append(q.CorrectAnswer).OrderBy(_ => random.Next()).ToList());
                q.Explanation = $"'{target.Word}' được đọc là '{target.Pinyin}'.";
                break;

            case "fill_in_blank":
                var example = target.ExampleSentencesNavigation.FirstOrDefault(e => e.ZhText.Contains(target.Word));
                if (example != null)
                {
                    q.QuestionType = "fill_in_blank";
                    q.QuestionText = example.ZhText.Replace(target.Word, "____")
                                     + (string.IsNullOrEmpty(example.ViText) ? "" : $" ({example.ViText})");
                    q.CorrectAnswer = target.Word;
                    q.Options = JsonSerializer.Serialize(
                        distractors.Select(d => d.Word).Append(q.CorrectAnswer).OrderBy(_ => random.Next()).ToList());
                    q.Explanation = $"Từ còn thiếu là '{target.Word}' ({target.Pinyin}).";
                    break;
                }
                goto default; // no usable example → fall through to meaning question

            default:
                q.QuestionType = "multiple_choice_meaning";
                q.QuestionText = $"Nghĩa của '{target.Word}' là gì?";
                q.CorrectAnswer = GetMeaning(target);
                q.Options = JsonSerializer.Serialize(
                    distractors.Select(d => GetMeaning(d)).Append(q.CorrectAnswer).OrderBy(_ => random.Next()).ToList());
                q.Explanation = $"'{target.Word}' ({target.Pinyin}) nghĩa là '{GetMeaning(target)}'.";
                break;
        }
    }

    private string GetMeaning(Vocabulary v)
    {
        try
        {
            using var doc = JsonDocument.Parse(v.Definitions);
            return doc.RootElement[0].GetProperty("meaning").GetString() ?? "Unknown";
        }
        catch { return "Unknown"; }
    }

    // ============================================================
    // SAVE ANSWER — store the choice only; grading happens at Finish.
    // ============================================================
    public async Task<bool> SaveAnswerAsync(QuizQuestionAnswerDto dto)
    {
        var question = await _quizRepo.GetQuestionAsync(dto.QuestionId);
        if (question == null) return false;

        question.UserAnswer = dto.UserAnswer;
        question.ResponseMs = dto.ResponseMs;
        question.AnsweredAt = DateTime.UtcNow;
        await _quizRepo.UpdateQuestionAsync(question);
        return true;
    }

    public async Task<bool> FlagQuestionAsync(long questionId, bool flagged)
    {
        var question = await _quizRepo.GetQuestionAsync(questionId);
        if (question == null) return false;
        question.Flagged = flagged;
        await _quizRepo.UpdateQuestionAsync(question);
        return true;
    }

    // ============================================================
    // FINISH — grade, score, update mastery, build review list, AI analysis.
    // ============================================================
    public async Task<QuizSession?> FinishQuizAsync(long sessionId)
    {
        var session = await _quizRepo.GetSessionAsync(sessionId);
        if (session == null) return null;
        if (session.Status == "Completed") return session; // idempotent

        int correctCount = 0;
        int totalTimeMs = 0;
        double speedBonusPoints = 0; // accumulated within a 0–10 pool, scaled below

        foreach (var q in session.QuizQuestions)
        {
            bool isCorrect = !string.IsNullOrEmpty(q.UserAnswer)
                && q.CorrectAnswer.Trim().Equals(q.UserAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
            q.IsCorrect = isCorrect;
            totalTimeMs += q.ResponseMs ?? 0;

            if (isCorrect)
            {
                correctCount++;
                // Per-correct speed credit: 1.0 (fast) / 0.4 (medium) / 0 (slow).
                if (q.ResponseMs < 5000) speedBonusPoints += 1.0;
                else if (q.ResponseMs < 10000) speedBonusPoints += 0.4;
            }
            await _quizRepo.UpdateQuestionAsync(q);
        }

        int total = session.TotalQuestions > 0 ? session.TotalQuestions : session.QuizQuestions.Count;

        // Score is on a fixed 0–100 scale: 90 points for accuracy + up to 10 for speed.
        double accuracyPoints = total > 0 ? (double)correctCount / total * 90.0 : 0;
        double speedPoints = total > 0 ? speedBonusPoints / total * 10.0 : 0;
        int finalScore = (int)Math.Round(Math.Min(100, accuracyPoints + speedPoints));

        session.CorrectAnswers = correctCount;
        session.AccuracyPercent = total > 0
            ? Math.Round((decimal)correctCount / total * 100, 2)
            : 0;
        session.Score = finalScore;
        session.TimeSpentSeconds = totalTimeMs / 1000;

        string diff = (session.Difficulty ?? "medium").ToLowerInvariant();
        double baseMultiplier = diff switch
        {
            "easy" => 3.0,
            "hard" => 4.0,
            _ => 50.0 / 15.0 // medium
        };
        int calculatedXp = (int)Math.Round(baseMultiplier * correctCount);
        if (diff == "hard" && session.AccuracyPercent >= 95m)
        {
            calculatedXp += 20;
        }

        session.Xp = calculatedXp;
        session.XpEarned = calculatedXp;
        session.CompletedAt = DateTime.UtcNow;
        session.Status = "Completed";
        session.SkillsJson = JsonSerializer.Serialize(CalculateSkills(session));

        // Track quiz completion stats
        await _statsService.TrackQuizCompletionAsync(session.UserId, total, correctCount);

        // Award XP
        await _statsService.AwardXpAsync(session.UserId, calculatedXp, $"Làm bài kiểm tra Flashcard ({session.Difficulty})");

        // Mastery updates + weak-word review list.
        var reviews = await UpdateMasteryAndCollectReviewsAsync(session);

        // AI analysis (feedback + per-wrong-answer explanations); fall back to basic feedback.
        await ApplyAnalysisAsync(session);

        await _quizRepo.UpdateSessionAsync(session);
        if (reviews.Count > 0)
            await _quizRepo.AddReviewsAsync(reviews);

        return await _quizRepo.GetSessionAsync(session.Id);
    }

    private async Task<List<QuizReview>> UpdateMasteryAndCollectReviewsAsync(QuizSession session)
    {
        var reviews = new List<QuizReview>();
        var seenVocab = new HashSet<long>();

        foreach (var q in session.QuizQuestions)
        {
            var uv = await _vocabRepo.GetUserVocabularyByIdsAsync(session.UserId, q.VocabularyId);
            if (uv == null) continue;

            uv.LastReviewed = DateTime.UtcNow;
            if (q.IsCorrect == true)
            {
                uv.CorrectCount++;
                uv.MasteryLevel = Math.Min(MasteryMax, uv.MasteryLevel + MasteryGain);
            }
            else
            {
                uv.WrongCount++;
                uv.MasteryLevel = Math.Max(MasteryMin, uv.MasteryLevel - MasteryLoss);
            }
            uv.IsMastered = uv.MasteryLevel >= 80;
            await _vocabRepo.UpdateUserVocabularyAsync(uv);

            // Flag for review: wrong, slow, or low mastery. One review per word.
            if (seenVocab.Contains(q.VocabularyId)) continue;
            string? reason = null;
            if (q.IsCorrect != true) reason = "wrong";
            else if ((q.ResponseMs ?? 0) > SlowAnswerMs) reason = "slow";
            else if (uv.MasteryLevel < 30) reason = "low_mastery";

            if (reason != null)
            {
                seenVocab.Add(q.VocabularyId);
                reviews.Add(new QuizReview
                {
                    SessionId = session.Id,
                    VocabularyId = q.VocabularyId,
                    ReviewReason = reason
                });
            }
        }
        return reviews;
    }

    private async Task ApplyAnalysisAsync(QuizSession session)
    {
        if (_quizAi.IsConfigured)
        {
            try
            {
                var req = new AiAnalysisRequest
                {
                    Difficulty = session.Difficulty ?? "medium",
                    TimeSpentSeconds = session.TimeSpentSeconds ?? 0,
                    AccuracyPercent = session.AccuracyPercent ?? 0,
                    Questions = session.QuizQuestions.Select(q => new AiAnalysisQuestion
                    {
                        QuestionId = q.Id,
                        Word = q.Vocabulary?.Word,
                        QuestionText = q.QuestionText,
                        CorrectAnswer = q.CorrectAnswer,
                        UserAnswer = q.UserAnswer,
                        IsCorrect = q.IsCorrect == true
                    }).ToList()
                };

                var analysis = await _quizAi.AnalyzeResultAsync(req);
                if (analysis != null)
                {
                    var feedback = analysis.Feedback ?? GenerateBasicFeedback(session);
                    if (analysis.Recommendations != null && analysis.Recommendations.Count > 0)
                        feedback += "\n\n• " + string.Join("\n• ", analysis.Recommendations);
                    session.AiFeedback = feedback;

                    if (analysis.WrongExplanations != null)
                    {
                        var map = analysis.WrongExplanations
                            .GroupBy(w => w.QuestionId)
                            .ToDictionary(g => g.Key, g => g.First().Explanation);
                        foreach (var q in session.QuizQuestions)
                        {
                            if (map.TryGetValue(q.Id, out var exp) && !string.IsNullOrWhiteSpace(exp))
                            {
                                q.AiExplanation = exp;
                                await _quizRepo.UpdateQuestionAsync(q);
                            }
                        }
                    }
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI analysis failed; using basic feedback.");
            }
        }
        session.AiFeedback = GenerateBasicFeedback(session);
    }

    private Dictionary<string, decimal> CalculateSkills(QuizSession session)
    {
        decimal SkillFor(params string[] types)
        {
            var qs = session.QuizQuestions
                .Where(q => q.QuestionType != null && types.Contains(q.QuestionType))
                .ToList();
            if (!qs.Any()) return 50;
            return Math.Round((decimal)qs.Count(q => q.IsCorrect == true) / qs.Count * 100, 0);
        }

        return new Dictionary<string, decimal>
        {
            { "Nghĩa", SkillFor("multiple_choice_meaning") },
            { "Pinyin", SkillFor("pinyin_match") },
            { "Mặt chữ", SkillFor("multiple_choice_word") },
            { "Ngữ cảnh", SkillFor("fill_in_blank", "example_match", "context") }
        };
    }

    private string GenerateBasicFeedback(QuizSession session)
    {
        var acc = session.AccuracyPercent ?? 0;
        if (acc >= 90) return "Xuất sắc! Bạn đã ghi nhớ rất tốt bộ từ vựng này. Hãy tiếp tục duy trì phong độ nhé!";
        if (acc >= 75) return "Tốt! Bạn nắm khá chắc kiến thức nhưng vẫn cần ôn lại một số từ thường nhầm lẫn.";
        if (acc >= 50) return "Trung bình. Bạn nên ôn tập thêm các từ đã sai trước khi học bài mới.";
        return "Cần cải thiện. Hãy dành thêm thời gian học lại Flashcard để nắm vững mặt chữ và nghĩa của từ.";
    }

    // ============================================================
    // QUERIES
    // ============================================================
    public async Task<QuizSession?> GetQuizResultAsync(long sessionId)
        => await _quizRepo.GetSessionAsync(sessionId);

    public async Task<List<QuizHistoryItemDto>> GetHistoryAsync(long userId)
    {
        var sessions = await _quizRepo.GetUserSessionsAsync(userId);
        return sessions
            .Where(s => s.Status == "Completed")
            .Select(s => new QuizHistoryItemDto
            {
                Id = s.Id,
                TotalQuestions = s.TotalQuestions,
                CorrectAnswers = s.CorrectAnswers,
                Score = s.Score,
                AccuracyPercent = s.AccuracyPercent,
                Xp = s.Xp,
                TimeSpentSeconds = s.TimeSpentSeconds,
                Difficulty = s.Difficulty,
                Status = s.Status,
                StartedAt = s.StartedAt,
                CompletedAt = s.CompletedAt
            })
            .ToList();
    }

    public async Task<QuizSession?> GetInProgressAsync(long userId)
        => await _quizRepo.GetLatestInProgressAsync(userId);
}
