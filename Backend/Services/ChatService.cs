using BusinessObjects.Models;
using Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Services;

public class ChatService : IChatService
{
    private readonly IChatRepository _chatRepo;
    private readonly IDeepseekChatService _deepseekChatService;
    private readonly IProgressService _progressService;
    private readonly IDocumentRepository _documentRepo;

    public ChatService(
        IChatRepository chatRepo, 
        IDeepseekChatService deepseekChatService, 
        IProgressService progressService,
        IDocumentRepository documentRepo)
    {
        _chatRepo = chatRepo;
        _deepseekChatService = deepseekChatService;
        _progressService = progressService;
        _documentRepo = documentRepo;
    }

    public async Task<List<ChatSession>> GetSessionsAsync(long userId)
    {
        return await _chatRepo.GetSessionsAsync(userId);
    }

    public async Task<List<ChatMessage>> GetMessagesAsync(long sessionId)
    {
        return await _chatRepo.GetMessagesAsync(sessionId);
    }

    public async Task<ChatSession> CreateSessionAsync(long userId, string? title)
    {
        var sessionTitle = string.IsNullOrWhiteSpace(title) ? "Hội thoại mới" : title.Trim();
        return await _chatRepo.CreateSessionAsync(userId, sessionTitle);
    }

    public async Task<ChatMessage> SendMessageAsync(long userId, long sessionId, string content, string? activeDocContext)
    {
        // 1. Add user's message
        var userMsg = await _chatRepo.AddMessageAsync(sessionId, "user", content);

        // 2. Fetch all messages in the session to construct history
        var messages = await _chatRepo.GetMessagesAsync(sessionId);

        // Auto-rename session if it has a default title
        var session = await _chatRepo.GetSessionByIdAsync(sessionId);
        if (session != null && (session.Title == "Hội thoại mới" || session.Title == "New Chat"))
        {
            var cleanTitle = content.Trim();
            var newTitle = cleanTitle.Length > 25 ? cleanTitle.Substring(0, 22) + "..." : cleanTitle;
            await _chatRepo.RenameSessionAsync(sessionId, newTitle);
        }

        // Convert messages to Deepseek format
        var deepseekHistory = messages.Select(m => new DeepseekChatMessageDto
        {
            Role = m.Role,
            Content = m.Content
        }).ToList();

        // 3. Build system instruction with user progress and context
        var systemPrompt = await BuildSystemPromptAsync(userId, activeDocContext);

        // 4. Generate AI response
        var aiResponseText = await _deepseekChatService.GenerateResponseAsync(systemPrompt, deepseekHistory);
        var responseText = aiResponseText ?? "Xin lỗi, hiện tại tôi không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.";

        // 5. Add AI response to database
        var modelMsg = await _chatRepo.AddMessageAsync(sessionId, "model", responseText);

        return modelMsg;
    }

    public async Task<bool> RenameSessionAsync(long sessionId, string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return false;
        return await _chatRepo.RenameSessionAsync(sessionId, title.Trim());
    }

    public async Task<bool> TogglePinSessionAsync(long sessionId, bool pin)
    {
        return await _chatRepo.TogglePinSessionAsync(sessionId, pin);
    }

    public async Task<bool> DeleteSessionAsync(long sessionId)
    {
        return await _chatRepo.DeleteSessionAsync(sessionId);
    }

    private async Task<string> BuildSystemPromptAsync(long userId, string? activeDocContext)
    {
        var prompt = new System.Text.StringBuilder();
        prompt.AppendLine("Bạn là một gia sư tiếng Trung thông minh của nền tảng Hanora (Hanora AI Learning Assistant).");
        prompt.AppendLine("Nhiệm vụ của bạn là đồng hành, giải đáp thắc mắc, phân tích ngữ pháp, từ vựng và hỗ trợ người dùng học tiếng Trung.");
        prompt.AppendLine();

        try
        {
            // Fetch live user progress
            var dashboard = await _progressService.GetDashboardAsync(userId);
            prompt.AppendLine("Thông tin tiến trình học tập của học viên:");
            prompt.AppendLine($"- Level: {dashboard.Level}");
            prompt.AppendLine($"- Tổng số điểm kinh nghiệm (XP): {dashboard.Xp}");
            prompt.AppendLine($"- Chuỗi ngày học liên tục (Streak): {dashboard.Streak} ngày");
            prompt.AppendLine($"- Hôm nay học được: {dashboard.DailyGoal.Current} phút (Mục tiêu hàng ngày: {dashboard.DailyGoal.Target} phút)");
            prompt.AppendLine($"- Sổ tay từ vựng: Đã lưu {dashboard.WordsSaved} từ (Đã thành thạo {dashboard.WordsMastered} từ)");
            prompt.AppendLine($"- Số từ vựng cần ôn tập SRS hôm nay: {dashboard.ReviewToday} từ");

            if (dashboard.RecentDocuments != null && dashboard.RecentDocuments.Any())
            {
                var docs = string.Join(", ", dashboard.RecentDocuments.Take(3).Select(d => $"'{d.Title}' ({d.ProgressPercent}% progress)"));
                prompt.AppendLine($"- Tài liệu đọc gần đây: {docs}");
            }

            if (dashboard.Achievements != null && dashboard.Achievements.Any(a => a.Unlocked))
            {
                var achievements = string.Join(", ", dashboard.Achievements.Where(a => a.Unlocked).Take(3).Select(a => $"'{a.Name}'"));
                prompt.AppendLine($"- Danh hiệu đã đạt gần đây: {achievements}");
            }
        }
        catch (Exception)
        {
            prompt.AppendLine("Thông tin tiến trình học tập của học viên hiện chưa được tải hoàn tất.");
        }

        prompt.AppendLine();

        // Handle context-awareness for Translation workspace document
        if (!string.IsNullOrWhiteSpace(activeDocContext))
        {
            if (long.TryParse(activeDocContext, out var docId))
            {
                var doc = await _documentRepo.GetByIdAsync(docId);
                if (doc != null)
                {
                    prompt.AppendLine($"[NGỮ CẢNH HIỆN TẠI]: Học viên đang mở tài liệu dịch thuật có tiêu đề là '{doc.Title}'.");
                    prompt.AppendLine("Hãy sẵn sàng giúp tóm tắt tài liệu, phân tích ngữ pháp, dịch đoạn văn khó hoặc giải nghĩa các từ xuất hiện trong tài liệu này.");
                }
            }
            else
            {
                prompt.AppendLine($"[NGỮ CẢNH HIỆN TẠI]: Học viên gửi kèm ngữ cảnh bổ sung sau: \"{activeDocContext}\"");
            }
            prompt.AppendLine();
        }

        // behavior guidelines
        prompt.AppendLine("HƯỚNG DẪN ỨNG XỬ:");
        prompt.AppendLine("1. Xưng hô thân thiện, nhiệt tình. Khuyến khích học viên học tập để hoàn thành mục tiêu hàng ngày hoặc duy trì chuỗi Streak.");
        prompt.AppendLine("2. Khi trả lời về từ vựng, hãy cung cấp đầy đủ: Hán tự, Pinyin, Hán Việt (rất quan trọng đối với người Việt học tiếng Trung), loại từ, định nghĩa và ví dụ mẫu.");
        prompt.AppendLine("3. Nếu học viên hỏi về các từ hoặc kiến thức trong tài liệu đang mở, hãy giải thích sát nghĩa theo ngữ cảnh của tài liệu đó.");
        prompt.AppendLine("4. Khi phân tích ngữ pháp/câu văn, hãy phân chia cấu trúc rõ ràng (chủ ngữ, vị ngữ, tân ngữ, cấu trúc đặc biệt) và chỉ ra lỗi sai kèm sửa đổi.");
        prompt.AppendLine("5. Hãy trả lời bằng tiếng Việt lịch sự, định dạng Markdown rõ ràng, dễ nhìn. Sử dụng biểu tượng cảm xúc (emoji) để tăng tính tương tác sinh động.");

        return prompt.ToString();
    }
}
