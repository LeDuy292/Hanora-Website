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
  ""definitions"": ""Vietnamese meaning"",
  ""usageNotes"": ""Ngữ cảnh sử dụng, các trường hợp dùng từ này (tiếng Việt)"",
  ""wordType"": ""Verb"" (Must be exactly one of: Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Particle, MeasureWord, Interjection, Other),
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
}
