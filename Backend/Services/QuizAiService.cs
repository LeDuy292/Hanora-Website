using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace Services;

/// <summary>
/// Deepseek-backed generation and analysis for the Flashcard AI Practice Test.
/// Mirrors the HTTP pattern used by <see cref="DictionaryAiService"/>.
/// All methods return null on failure so the caller can fall back to local logic.
/// </summary>
public class QuizAiService : IQuizAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<QuizAiService> _logger;

    private const string Endpoint = "https://api.deepseek.com/chat/completions";

    public QuizAiService(HttpClient httpClient, IConfiguration config, ILogger<QuizAiService> logger)
    {
        _httpClient = httpClient;
        _apiKey = config["Deepseek:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey);

    public async Task<List<AiQuestionDto>?> GenerateQuestionsAsync(
        IEnumerable<AiVocabItem> vocabulary,
        List<string> questionTypes,
        string difficulty,
        int questionCount)
    {
        if (!IsConfigured) return null;

        var vocabJson = JsonSerializer.Serialize(vocabulary);
        var typesText = (questionTypes != null && questionTypes.Count > 0)
            ? string.Join(", ", questionTypes)
            : "multiple_choice_meaning, multiple_choice_word, pinyin_match, fill_in_blank";

        var prompt = $@"
You are a Chinese-language teacher building a personalized practice test for a Vietnamese learner.
Create exactly {questionCount} questions based ONLY on the vocabulary list provided below.
Difficulty: {difficulty}.
Allowed question types (use a varied mix of these only): {typesText}.

Question type meanings:
- multiple_choice_meaning: show the Chinese word, ask its Vietnamese meaning.
- multiple_choice_word: show a Vietnamese meaning, ask which Chinese word matches.
- pinyin_match: show the Chinese word, ask its correct pinyin.
- fill_in_blank: a Chinese sentence with the target word replaced by ____, ask which word fills it.
- example_match: ask which example sentence correctly uses the target word.
- context: a short usage/context question about the word.

Rules:
- Every question MUST have exactly 4 options, and correctAnswer MUST be one of the options verbatim.
- questionText and explanation MUST be written in Vietnamese (the word/pinyin/options stay in their natural language).
- explanation briefly says why the answer is correct and warns about confusable words when relevant.
- word MUST be the exact Chinese word from the list that the question is about.

Return ONLY a valid JSON array (no markdown fences) matching this schema:
[
  {{
    ""word"": ""学习"",
    ""questionType"": ""multiple_choice_meaning"",
    ""questionText"": ""'学习' có nghĩa là gì?"",
    ""options"": [""học tập"", ""giáo viên"", ""trường học"", ""bạn bè""],
    ""correctAnswer"": ""học tập"",
    ""explanation"": ""学习 là động từ nghĩa là 'học tập'. Đừng nhầm với 学校 (trường học) hay 学生 (học sinh).""
  }}
]

Vocabulary list (JSON): {vocabJson}
";

        var text = await CallDeepseekAsync(prompt, "GenerateQuestions");
        if (string.IsNullOrEmpty(text)) return null;

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var questions = JsonSerializer.Deserialize<List<AiQuestionDto>>(text, options);
            // Keep only well-formed questions whose answer is among the options.
            return questions?
                .Where(q => q != null
                            && !string.IsNullOrWhiteSpace(q.QuestionText)
                            && !string.IsNullOrWhiteSpace(q.CorrectAnswer)
                            && q.Options != null && q.Options.Count >= 2
                            && q.Options.Any(o => o.Trim().Equals(q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Deepseek quiz questions.");
            return null;
        }
    }

    public async Task<AiAnalysisDto?> AnalyzeResultAsync(AiAnalysisRequest request)
    {
        if (!IsConfigured) return null;

        var payloadJson = JsonSerializer.Serialize(request);

        var prompt = $@"
You are an encouraging Chinese-language teacher. A Vietnamese learner just finished a practice test.
Analyze their performance and respond in VIETNAMESE.

Return ONLY a valid JSON object (no markdown fences) matching this schema:
{{
  ""feedback"": ""2-4 câu nhận xét tổng quan, cá nhân hóa, động viên, chỉ ra nhóm từ hay nhầm lẫn."",
  ""recommendations"": [""khuyến nghị ngắn 1"", ""khuyến nghị 2""],
  ""wrongExplanations"": [
    {{ ""questionId"": 123, ""explanation"": ""Giải thích vì sao đáp án đúng và vì sao lựa chọn của học viên sai."" }}
  ]
}}

Provide a wrongExplanations entry for EVERY question where isCorrect is false, keyed by its questionId.
Test data (JSON): {payloadJson}
";

        var text = await CallDeepseekAsync(prompt, "AnalyzeResult");
        if (string.IsNullOrEmpty(text)) return null;

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiAnalysisDto>(text, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Deepseek analysis.");
            return null;
        }
    }

    private async Task<string?> CallDeepseekAsync(string prompt, string label)
    {
        var url = Endpoint;
        var payload = new
        {
            model = "deepseek-chat",
            messages = new[] { new { role = "user", content = prompt } },
            response_format = new { type = "json_object" }
        };

        try
        {
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            httpRequest.Headers.Add("Authorization", $"Bearer {_apiKey}");
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Deepseek API error ({Label}): {StatusCode} {Error}", label, response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Deepseek call failed ({Label}).", label);
            return null;
        }
    }
}
