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
  ""definitionsEn"": ""English meaning (concise dictionary definition, e.g. 'to seize; to strive for')"",
  ""usageNotes"": ""Ngữ cảnh sử dụng, các trường hợp dùng từ này (tiếng Việt)"",
  ""wordType"": ""Verb"" (Must be exactly one of: Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Particle, MeasureWord, Interjection, Other),
  ""collocations"": [""collocation 1"", ""collocation 2""],
  ""grammarPatterns"": [""grammar pattern 1"", ""grammar pattern 2""],
  ""examples"": [ // Provide ONLY 1 to 2 example sentences here. Do NOT provide more than 2.
    {{
      ""zhText"": ""Chinese example sentence"",
      ""viText"": ""Vietnamese translation"",
      ""enText"": ""English translation""
    }},
    {{
      ""zhText"": ""Another Chinese example sentence"",
      ""viText"": ""Vietnamese translation"",
      ""enText"": ""English translation""
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

    public async Task<string?> TranslateTextAsync(string text, string targetLanguage = "en")
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrEmpty(_apiKey)) return null;

        var targetLangName = targetLanguage.ToLower() == "en" ? "English" : "Vietnamese";
        var prompt = $@"Translate the following dictionary meaning into {targetLangName}. Keep it concise and return ONLY a valid JSON object matching this schema:
{{ ""translation"": ""..."" }}
Text: {text}";

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
            if (!response.IsSuccessStatusCode) return null;

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            if (string.IsNullOrEmpty(textResponse)) return null;

            using var resDoc = JsonDocument.Parse(textResponse);
            if (resDoc.RootElement.TryGetProperty("translation", out var transProp))
            {
                return transProp.GetString();
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to translate text: {Text}", text);
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

    public Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence, string sourceLang, string targetLang)
    {
        if (targetLang == "zh")
        {
            return AnalyzeSentenceInternalAsync(sentence, targetLang: "zh");
        }
        var lang = targetLang == "en" ? "en" : "vi";
        return AnalyzeSentenceAsync(sentence, lang);
    }

    public Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence, string language = "vi")
    {
        return AnalyzeSentenceInternalAsync(sentence, language: language);
    }

    private async Task<SentenceAnalysisResponse?> AnalyzeSentenceInternalAsync(string sentence, string language = "vi", string targetLang = "")
    {
        if (string.IsNullOrEmpty(_apiKey)) return null;

        var serializedInput = JsonSerializer.Serialize(sentence);
        bool isLong = sentence.Length > 80;

        string prompt;
        if (targetLang == "zh")
        {
            prompt = $@"
Translate the following text into standard Chinese (Simplified):
{serializedInput}

Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": {serializedInput},
  ""pinyin"": ""Full pinyin of the translated Chinese text with tone marks"",
  ""hanViet"": """",
  ""vietnamese"": ""The translated Chinese text"",
  ""translation"": ""The translated Chinese text"",
  ""grammarAnalysis"": ""Explanation of the translated Chinese sentence structure and key words (in Vietnamese)""
}}
Do NOT output any markdown fences, just the raw JSON object.";
        }
        else
        {
            var isEnglish = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);

            string hanVietReq = isLong 
                ? @"""Sino-Vietnamese (Hán Việt) of key keywords only, separated by space"""
                : @"""Sino-Vietnamese equivalent (Hán Việt) of each character/word in the sentence, separated by spaces""";

            prompt = isEnglish ? $@"
Analyze and translate the following Chinese text into natural English:
{serializedInput}

Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": {serializedInput},
  ""pinyin"": ""Full pinyin with tone marks"",
  ""hanViet"": ""Key vocabulary equivalents (optional)"",
  ""vietnamese"": ""Natural English translation of the text"",
  ""translation"": ""Natural English translation of the text"",
  ""grammarAnalysis"": ""Concise explanation of grammar, structure and key words (in English)""
}}
Do NOT output any markdown fences, just the raw JSON object."
: $@"
Phân tích và dịch đoạn văn bản tiếng Trung sau sang tiếng Việt tự nhiên, đúng ngữ cảnh:
{serializedInput}

Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": {serializedInput},
  ""pinyin"": ""Phiên âm Pinyin đầy đủ có dấu thanh"",
  ""hanViet"": {hanVietReq},
  ""vietnamese"": ""Bản dịch tiếng Việt tự nhiên, chuẩn xác ngữ cảnh"",
  ""translation"": ""Bản dịch tiếng Việt tự nhiên, chuẩn xác ngữ cảnh"",
  ""grammarAnalysis"": ""Giải thích ngắn gọn cấu trúc ngữ pháp và các từ quan trọng (bằng tiếng Việt)""
}}
Do NOT output any markdown fences, just the raw JSON object.";
        }

        var url = "https://api.deepseek.com/chat/completions";
        var payload = new 
        { 
            model = "deepseek-chat",
            messages = new[] { new { role = "user", content = prompt } }, 
            response_format = new { type = "json_object" },
            max_tokens = 4096
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
                _logger.LogWarning("Deepseek API error (AnalyzeSentence): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            if (string.IsNullOrEmpty(textResponse)) return null;

            var cleanJson = textResponse.Trim();
            if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                cleanJson = cleanJson.Substring(7);
            }
            else if (cleanJson.StartsWith("```"))
            {
                cleanJson = cleanJson.Substring(3);
            }
            if (cleanJson.EndsWith("```"))
            {
                cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
            }
            cleanJson = cleanJson.Trim();

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = JsonSerializer.Deserialize<SentenceAnalysisResponse>(cleanJson, options);
            if (result != null)
            {
                if (string.IsNullOrEmpty(result.OriginalText)) result.OriginalText = sentence;
                if (string.IsNullOrEmpty(result.Translation)) result.Translation = result.Vietnamese;
                if (string.IsNullOrEmpty(result.Vietnamese)) result.Vietnamese = result.Translation;
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze sentence: {Sentence}", sentence);
            return null;
        }
    }

    public async Task<SentenceComparisonResponse?> CompareSentencesAsync(string originalText, string modifiedText, string language = "vi")
    {
        if (string.IsNullOrEmpty(_apiKey)) return null;

        var isEnglish = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);

        var prompt = isEnglish ? $@"
Compare the original Chinese sentence: '{originalText}'
with the modified Chinese sentence: '{modifiedText}'.
Return ONLY a valid JSON object matching exactly this schema:
{{
  ""originalText"": ""{originalText}"",
  ""originalTranslation"": ""English translation of the original sentence"",
  ""modifiedText"": ""{modifiedText}"",
  ""modifiedTranslation"": ""English translation of the modified sentence"",
  ""differences"": ""Explanation of grammar or semantic differences between these two sentences (in English)""
}}
Do NOT output any markdown blocks like ```json or anything else, just the raw JSON object."
: $@"
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
                _logger.LogWarning("Deepseek API error (CompareSentences): {StatusCode} {Error}", response.StatusCode, error);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

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

    public async Task<string> AskAiAssistantAsync(string word, string question, string contextSentence, string language = "vi")
    {
        if (string.IsNullOrEmpty(_apiKey)) return "AI key is not configured.";

        var isEnglish = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);

        var prompt = isEnglish ? $@"
You are Hanora's intelligent Chinese learning assistant.
The student is reading a document and has a question about the word/phrase/sentence: '{word}'.
The context sentence in the document is: '{contextSentence}'.
The student's question is: '{question}'.

Answer concisely, clearly, and helpfully in English to help the student understand, providing memory tips or practical examples if helpful."
: $@"
Bạn là trợ lý học tập tiếng Trung thông minh của Hanora.
Học viên đang đọc một tài liệu và thắc mắc về từ/cụm từ/câu: '{word}'.
Ngữ cảnh trong câu gốc của tài liệu là: '{contextSentence}'.
Câu hỏi của học viên là: '{question}'.

Hãy trả lời ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt để giúp người học làm rõ thắc mắc của họ, cung cấp mẹo ghi nhớ hoặc các ví dụ thực tế liên quan nếu cần.";

        var url = "https://api.deepseek.com/chat/completions";
        var payload = new 
        { 
            model = "deepseek-chat",
            messages = new[] { new { role = "user", content = prompt } }
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
                _logger.LogWarning("Deepseek API error (AskAiAssistant): {StatusCode} {Error}", response.StatusCode, error);
                return isEnglish ? "Cannot connect to AI service at the moment." : "Không thể kết nối với AI lúc này.";
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var textResponse = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            return textResponse ?? (isEnglish ? "No response received from AI." : "Không nhận được phản hồi từ AI.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ask AI assistant for word: {Word}", word);
            return isEnglish ? "System error occurred while connecting to AI." : "Đã xảy ra lỗi hệ thống khi kết nối với AI.";
        }
    }
}
