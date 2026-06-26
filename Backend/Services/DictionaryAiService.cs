using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace Services;

public class DictionaryAiService : IDictionaryAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<DictionaryAiService> _logger;

    public DictionaryAiService(HttpClient httpClient, IConfiguration config, ILogger<DictionaryAiService> logger)
    {
        _httpClient = httpClient;
        _apiKey = config["Deepseek:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public async Task<VocabularyAiResponse?> GetVocabularyInfoAsync(string word)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Deepseek API key is not configured.");
            return null;
        }

        var prompt = $@"
Analyze the Chinese word '{word}'.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""word"": ""{word}"",
  ""pinyin"": ""pinyin with tone marks"",
  ""hanViet"": ""Sino-Vietnamese equivalent in Vietnamese (Hán Việt), e.g. 'Tranh Thủ'"",
  ""definitions"": ""Vietnamese meaning"",
  ""usageNotes"": ""Ngữ cảnh sử dụng, các trường hợp dùng từ này (tiếng Việt)"",
  ""wordType"": ""Verb"" (Must be exactly one of: Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Particle, MeasureWord, Interjection, Other),
  ""collocations"": [""collocation 1"", ""collocation 2""],
  ""grammarPatterns"": [""grammar pattern 1"", ""grammar pattern 2""],
  ""examples"": [ // Provide ONLY 1 to 2 example sentences here. Do NOT provide more than 2.
    {{
      ""zhText"": ""Chinese example sentence"",
      ""viText"": ""Vietnamese translation""
    }},
    {{
      ""zhText"": ""Another Chinese example sentence"",
      ""viText"": ""Vietnamese translation""
    }}
  ]
}}
Do NOT output any markdown blocks like ```json or anything else, just the raw JSON object.";

        var url = "https://api.deepseek.com/chat/completions";

        var payload = new
        {
            model = "deepseek-chat",
            messages = new[]
            {
                new { role = "user", content = prompt }
            },
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
                _logger.LogWarning("Deepseek API error: {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<VocabularyAiResponse>(textResponse, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get vocabulary info from Deepseek for word {Word}", word);
            return null;
        }
    }

    public async Task<List<string>?> TranslateSentencesAsync(List<string> englishSentences)
    {
        if (string.IsNullOrEmpty(_apiKey) || !englishSentences.Any()) return null;

        var prompt = @"Translate the following English sentences to Vietnamese. 
Return ONLY a valid JSON object matching exactly this schema:
{ ""translations"": [""..."", ""...""] }
The translations array must be in the exact same order as the input sentences.
Sentences:
" + JsonSerializer.Serialize(englishSentences);

        var url = "https://api.deepseek.com/chat/completions";
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
                _logger.LogWarning("Deepseek API error (Translate): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var resultObj = JsonSerializer.Deserialize<JsonElement>(textResponse);
            if (resultObj.TryGetProperty("translations", out var translationsProp))
            {
                return JsonSerializer.Deserialize<List<string>>(translationsProp.GetRawText());
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to translate sentences.");
            return null;
        }
    }

    public async Task<RelationsDto?> GetRelationsAsync(string word)
    {
        if (string.IsNullOrEmpty(_apiKey)) return null;

        var prompt = $@"
Analyze the Chinese word '{word}'. Provide up to 5 synonyms, 5 antonyms, and 5 common compound words that contain this word.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""synonyms"": [""..."", ""...""],
  ""antonyms"": [""..."", ""...""],
  ""compounds"": [""..."", ""...""]
}}
If there are none for a category, return an empty array [].
Do NOT output any markdown blocks like ```json or anything else.";

        var url = "https://api.deepseek.com/chat/completions";
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
                _logger.LogWarning("Deepseek API error (Relations): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<RelationsDto>(textResponse, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get relations for {Word}.", word);
            return null;
        }
    }

    public async Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence)
    {
        if (string.IsNullOrEmpty(_apiKey)) return null;

        var prompt = $@"
Analyze this Chinese sentence: '{sentence}'.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": ""{sentence}"",
  ""pinyin"": ""Full pinyin of the sentence with tone marks"",
  ""hanViet"": ""Sino-Vietnamese equivalent (Hán Việt) of each character/word in the sentence, separated by spaces"",
  ""vietnamese"": ""Natural Vietnamese translation of the sentence"",
  ""grammarAnalysis"": ""Detailed explanation of grammar, identifying Subject, Verb, Object, complements, and key structures (in Vietnamese)""
}}
Do NOT output any markdown blocks like ```json or anything else, just the raw JSON object.";

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
        var payload = new { contents = new[] { new { parts = new[] { new { text = prompt } } } }, generationConfig = new { responseMimeType = "application/json" } };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error (AnalyzeSentence): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SentenceAnalysisResponse>(textResponse, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze sentence: {Sentence}", sentence);
            return null;
        }
    }

    public async Task<SentenceComparisonResponse?> CompareSentencesAsync(string originalText, string modifiedText)
    {
        if (string.IsNullOrEmpty(_apiKey)) return null;

        var prompt = $@"
Compare the original Chinese sentence: '{originalText}'
with the modified Chinese sentence: '{modifiedText}'.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": ""{originalText}"",
  ""originalTranslation"": ""Vietnamese translation of the original sentence"",
  ""modifiedText"": ""{modifiedText}"",
  ""modifiedTranslation"": ""Vietnamese translation of the modified sentence"",
  ""differences"": ""Explanation of grammar or semantic differences between these two sentences (in Vietnamese)""
}}
Do NOT output any markdown blocks like ```json or anything else, just the raw JSON object.";

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
        var payload = new { contents = new[] { new { parts = new[] { new { text = prompt } } } }, generationConfig = new { responseMimeType = "application/json" } };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error (CompareSentences): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SentenceComparisonResponse>(textResponse, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compare sentences: {Original} vs {Modified}", originalText, modifiedText);
            return null;
        }
    }

    public async Task<string> AskAiAssistantAsync(string word, string question, string contextSentence)
    {
        if (string.IsNullOrEmpty(_apiKey)) return "AI key is not configured.";

        var prompt = $@"
Bạn là trợ lý học tập tiếng Trung thông minh của Hanora.
Học viên đang đọc một tài liệu và thắc mắc về từ/cụm từ/câu: '{word}'.
Ngữ cảnh trong câu gốc của tài liệu là: '{contextSentence}'.
Câu hỏi của học viên là: '{question}'.

Hãy trả lời ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt để giúp người học làm rõ thắc mắc của họ, cung cấp mẹo ghi nhớ hoặc các ví dụ thực tế liên quan nếu cần.";

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
        var payload = new
        {
            contents = new[]
            {
                new {
                    parts = new[] {
                        new { text = prompt }
                    }
                }
            }
        };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error (AskAiAssistant): {StatusCode} {Error}", response.StatusCode, error);
                return "Không thể kết nối với AI lúc này.";
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var reply = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            return reply ?? "Không nhận được phản hồi từ AI.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ask AI assistant for word: {Word}", word);
            return "Đã xảy ra lỗi hệ thống khi kết nối với AI.";
        }
    }
}
