using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Services;

public class DeepseekChatService : IDeepseekChatService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<DeepseekChatService> _logger;

    private const string Endpoint = "https://api.deepseek.com/chat/completions";

    public DeepseekChatService(HttpClient httpClient, IConfiguration config, ILogger<DeepseekChatService> logger)
    {
        _httpClient = httpClient;
        _apiKey = config["Deepseek:ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public async Task<string?> GenerateResponseAsync(string systemPrompt, List<DeepseekChatMessageDto> history)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Deepseek API Key is not configured.");
            return "Deepseek API Key is not configured in appsettings.";
        }

        // Prepare the payload structure
        var messagesList = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        foreach (var msg in history)
        {
            messagesList.Add(new
            {
                role = msg.Role == "model" ? "assistant" : msg.Role,
                content = msg.Content
            });
        }

        var payload = new
        {
            model = "deepseek-chat",
            messages = messagesList,
            temperature = 0.7
        };

        try
        {
            var jsonPayload = JsonSerializer.Serialize(payload);
            
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            httpRequest.Headers.Add("Authorization", $"Bearer {_apiKey}");
            httpRequest.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync();
                _logger.LogError("Deepseek API error: {StatusCode} - {Error}", response.StatusCode, errorMsg);
                return $"Trợ lý AI đang bận (Error code: {response.StatusCode}). Vui lòng thử lại sau.";
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            
            if (doc.RootElement.TryGetProperty("choices", out var choices) && 
                choices.GetArrayLength() > 0)
            {
                var firstChoice = choices[0];
                if (firstChoice.TryGetProperty("message", out var messageProp) &&
                    messageProp.TryGetProperty("content", out var contentProp))
                  {
                      return contentProp.GetString();
                  }
            }

            _logger.LogWarning("Deepseek response did not contain expected content field: {Response}", responseJson);
            return "Rất tiếc, trợ lý gặp lỗi khi xử lý câu trả lời. Bạn có thể hỏi lại không?";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Deepseek API");
            return "Có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng kiểm tra lại kết nối mạng.";
        }
    }
}
