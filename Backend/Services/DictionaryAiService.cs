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
        _apiKey = config["Gemini:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public async Task<VocabularyAiResponse?> GetVocabularyInfoAsync(string word)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Gemini API key is not configured.");
            return null;
        }

        var prompt = $@"
Analyze the Chinese word '{word}'.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""word"": ""{word}"",
  ""pinyin"": ""pinyin with tone marks"",
  ""definitions"": ""Vietnamese meaning"",
  ""usageNotes"": ""Ngữ cảnh sử dụng, các trường hợp dùng từ này (tiếng Việt)"",
  ""wordType"": ""Verb"" (Must be exactly one of: Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Particle, MeasureWord, Interjection, Other),
  ""examples"": [
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

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json"
            }
        };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error: {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<VocabularyAiResponse>(textResponse, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get vocabulary info from Gemini for word {Word}", word);
            return null;
        }
    }

    public async Task<List<string>?> TranslateSentencesAsync(List<string> englishSentences)
    {
        if (string.IsNullOrEmpty(_apiKey) || !englishSentences.Any()) return null;

        var prompt = @"Translate the following English sentences to Vietnamese. 
Return ONLY a valid JSON array of strings containing the translations in the exact same order.
Do NOT output any markdown blocks like ```json or anything else.
Sentences:
" + JsonSerializer.Serialize(englishSentences);

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
        var payload = new { contents = new[] { new { parts = new[] { new { text = prompt } } } }, generationConfig = new { responseMimeType = "application/json" } };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error (Translate): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            return JsonSerializer.Deserialize<List<string>>(textResponse);
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

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
        var payload = new { contents = new[] { new { parts = new[] { new { text = prompt } } } }, generationConfig = new { responseMimeType = "application/json" } };

        try
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini API error (Relations): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var textResponse = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

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
}
