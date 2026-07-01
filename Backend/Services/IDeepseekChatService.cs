using System.Collections.Generic;
using System.Threading.Tasks;

namespace Services;

public interface IDeepseekChatService
{
    Task<string?> GenerateResponseAsync(string systemPrompt, List<DeepseekChatMessageDto> history);
}

public class DeepseekChatMessageDto
{
    public string Role { get; set; } = null!; // "system", "user", "assistant"
    public string Content { get; set; } = null!;
}
