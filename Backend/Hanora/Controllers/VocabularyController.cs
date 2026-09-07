using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;
using System.Text.Json;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
public class VocabularyController : ControllerBase
{
    private readonly IVocabularyService _vocabularyService;

    public VocabularyController(IVocabularyService vocabularyService)
    {
        _vocabularyService = vocabularyService;
    }

    private long GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(userIdString, out var userId) ? userId : 1;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotebookVocabularies([FromQuery] string language = "vi")
    {
        try
        {
            var userId = GetCurrentUserId();
            var list = await _vocabularyService.GetUserVocabularyAsync(userId);
            bool isEn = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);
            
            return Ok(list.Select(uv => {
                string definitionVn = "";
                string definitionEn = "";
                string rawDefs = uv.Vocabulary?.Definitions ?? "";

                try
                {
                    if (!string.IsNullOrWhiteSpace(rawDefs))
                    {
                        using (var doc = JsonDocument.Parse(rawDefs))
                        {
                            var root = doc.RootElement;
                            if (root.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in root.EnumerateArray())
                                {
                                    if (item.ValueKind == JsonValueKind.Object)
                                    {
                                        string lang = item.TryGetProperty("lang", out var lp) ? (lp.GetString() ?? "") : "";
                                        string meaning = item.TryGetProperty("meaning", out var mp) ? (mp.GetString() ?? "") : "";

                                        if (string.Equals(lang, "en", StringComparison.OrdinalIgnoreCase))
                                        {
                                            definitionEn = meaning;
                                        }
                                        else if (string.Equals(lang, "vn", StringComparison.OrdinalIgnoreCase) || string.Equals(lang, "vi", StringComparison.OrdinalIgnoreCase))
                                        {
                                            definitionVn = meaning;
                                        }
                                        else if (string.IsNullOrEmpty(definitionVn))
                                        {
                                            definitionVn = meaning;
                                        }
                                    }
                                }

                                if (string.IsNullOrEmpty(definitionVn) && root.GetArrayLength() > 0)
                                {
                                    var first = root[0];
                                    if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("meaning", out var mp))
                                    {
                                        definitionVn = mp.GetString() ?? "";
                                    }
                                }
                            }
                            else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("meaning", out var mp))
                            {
                                definitionVn = mp.GetString() ?? "";
                            }
                        }
                    }
                }
                catch { }

                string chosenTranslation = isEn && !string.IsNullOrWhiteSpace(definitionEn) 
                    ? definitionEn 
                    : (!string.IsNullOrWhiteSpace(definitionVn) ? definitionVn : definitionEn);

                return new {
                    id = uv.Id,
                    userVocabularyId = uv.Id,
                    text = uv.Vocabulary.Word,
                    pinyin = uv.Vocabulary.Pinyin,
                    translation = chosenTranslation,
                    definition = chosenTranslation,
                    definitionEn = definitionEn,
                    definitionVn = definitionVn,
                    definitions = rawDefs,
                    wordType = uv.Vocabulary.WordType?.ToString() ?? "Other",
                    srsLevel = uv.MasteryLevel,
                    dateAdded = uv.SavedAt?.ToString("yyyy-MM-dd"),
                    documentTitle = uv.SourceDocument?.Title,
                    documentId = uv.SourceDocumentId,
                    hanViet = uv.Vocabulary.HanViet,
                    collocations = uv.Vocabulary.Collocations,
                    grammarPatterns = uv.Vocabulary.GrammarPatterns,
                    context = uv.Vocabulary.UsageNotes,
                    examples = uv.Vocabulary.ExampleSentencesNavigation.Select(e => new {
                        zhText = e.ZhText,
                        viText = e.ViText,
                        enText = e.EnText,
                        translation = (isEn && !string.IsNullOrWhiteSpace(e.EnText)) ? e.EnText : e.ViText,
                        pinyin = ""
                    }).ToList()
                };
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{word}")]
    public async Task<IActionResult> GetVocabulary(string word, [FromQuery] string language = "vi")
    {
        if (string.IsNullOrWhiteSpace(word))
        {
            return BadRequest("Word is required.");
        }

        var result = await _vocabularyService.LookupWordAsync(word, language);

        if (result == null)
        {
            return NotFound(new { Message = $"Could not find or generate definition for '{word}'." });
        }

        string definitionVn = "";
        string definitionEn = "";
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(result.Definitions);
            if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var elem in doc.RootElement.EnumerateArray())
                {
                    var l = elem.TryGetProperty("lang", out var lp) ? lp.GetString()?.ToLower() : "";
                    var m = elem.TryGetProperty("meaning", out var mp) ? mp.GetString() : "";
                    if (l == "vn" || l == "vi") definitionVn = m ?? "";
                    if (l == "en") definitionEn = m ?? "";
                }
            }
        }
        catch { }

        var isEn = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);
        var resolvedDef = isEn && !string.IsNullOrWhiteSpace(definitionEn)
            ? definitionEn
            : (!string.IsNullOrWhiteSpace(definitionVn) ? definitionVn : result.Definitions);

        return Ok(new
        {
            result.Id,
            result.Word,
            result.Pinyin,
            Definition = resolvedDef,
            DefinitionEn = definitionEn,
            DefinitionVn = definitionVn,
            result.Definitions,
            result.UsageNotes,
            WordType = result.WordType?.ToString() ?? "Other",
            HanViet = result.HanViet,
            Collocations = string.IsNullOrEmpty(result.Collocations) ? new System.Collections.Generic.List<string>() : System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(result.Collocations),
            GrammarPatterns = string.IsNullOrEmpty(result.GrammarPatterns) ? new System.Collections.Generic.List<string>() : System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(result.GrammarPatterns),
            Examples = result.ExampleSentencesNavigation.Take(2).Select(e => new
            {
                e.ZhText,
                e.ViText,
                e.EnText,
                e.Source
            }),
            Synonyms = result.WordRelationVocabs.Where(wr => wr.RelationType == BusinessObjects.Models.RelationType.Synonym).Select(wr => wr.Related.Word).ToList(),
            Antonyms = result.WordRelationVocabs.Where(wr => wr.RelationType == BusinessObjects.Models.RelationType.Antonym).Select(wr => wr.Related.Word).ToList(),
            Compounds = result.WordRelationVocabs.Where(wr => wr.RelationType == BusinessObjects.Models.RelationType.Compound).Select(wr => wr.Related.Word).ToList()
        });
    }

    [HttpPost("{word}/save")]
    public async Task<IActionResult> SaveToNotebook(string word, [FromBody] SaveVocabularyRequest request)
    {
        if (string.IsNullOrWhiteSpace(word))
        {
            return BadRequest("Word is required.");
        }

        try
        {
            var userId = GetCurrentUserId();

            var result = await _vocabularyService.SaveToNotebookAsync(
                userId,
                word,
                request.DocumentId,
                request.CustomDefinition,
                request.Pinyin,
                request.HanViet,
                request.WordType,
                request.PageNumber,
                request.PersonalNote);

            if (!result.Success)
            {
                return BadRequest(new { success = false, message = "Khong the luu tu vung vao so tay." });
            }

            return Ok(new
            {
                success = true,
                created = result.Created,
                restored = result.Restored,
                alreadyExists = result.AlreadyExists,
                userVocabularyId = result.UserVocabularyId,
                message = result.Message
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteVocabulary(long id, [FromBody] DeleteVocabularyRequest? request = null)
    {
        var userId = GetCurrentUserId();
        var result = await _vocabularyService.DeleteFromNotebookAsync(
            userId,
            new[] { id },
            request?.DeleteFlashcards ?? false);

        if (result.DeletedCount == 0)
        {
            return NotFound(new { success = false, message = "Không tìm thấy từ vựng cần xóa." });
        }

        return Ok(new
        {
            success = true,
            message = "Đã xóa từ vựng thành công.",
            result.DeletedCount,
            result.FlashcardsAffected
        });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteVocabularies([FromBody] BulkDeleteVocabularyRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest(new { success = false, message = "Vui lòng chọn ít nhất 1 từ vựng để xóa." });
        }

        var userId = GetCurrentUserId();
        var result = await _vocabularyService.DeleteFromNotebookAsync(
            userId,
            request.Ids,
            request.DeleteFlashcards);

        if (result.DeletedCount == 0)
        {
            return NotFound(new { success = false, message = "Không tìm thấy từ vựng cần xóa." });
        }

        return Ok(new
        {
            success = true,
            message = $"Đã xóa {result.DeletedCount} từ vựng thành công.",
            result.DeletedCount,
            result.FlashcardsAffected,
            result.NotFoundIds
        });
    }

    [HttpPost("translate-sentence")]
    public async Task<IActionResult> TranslateSentence([FromBody] TranslateSentenceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest("Text is required.");
        }

        var result = await _vocabularyService.AnalyzeSentenceAsync(request.Text, request.Language ?? "vi");
        if (result == null)
        {
            return BadRequest("Failed to analyze sentence.");
        }

        return Ok(result);
    }

    [HttpPost("interactive-compare")]
    public async Task<IActionResult> CompareSentences([FromBody] CompareSentencesRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OriginalText) || string.IsNullOrWhiteSpace(request.ModifiedText))
        {
            return BadRequest("OriginalText and ModifiedText are required.");
        }

        var result = await _vocabularyService.CompareSentencesAsync(request.OriginalText, request.ModifiedText, request.Language ?? "vi");
        if (result == null)
        {
            return BadRequest("Failed to compare sentences.");
        }

        return Ok(result);
    }

    [HttpPost("ai-chat")]
    public async Task<IActionResult> AiChat([FromBody] AiChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Word) || string.IsNullOrWhiteSpace(request.Question))
        {
            return BadRequest("Word and Question are required.");
        }

        var reply = await _vocabularyService.AskAiAssistantAsync(request.Word, request.Question, request.ContextSentence ?? "", request.Language ?? "vi");
        return Ok(new { Reply = reply });
    }

    [HttpPost("report-translation")]
    public async Task<IActionResult> ReportTranslation([FromBody] ReportTranslationRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Word) || string.IsNullOrWhiteSpace(request.ProposedTranslation))
        {
            return BadRequest("Word and ProposedTranslation are required.");
        }

        try
        {
            var userId = GetCurrentUserId();
            var success = await _vocabularyService.ReportTranslationErrorAsync(
                userId,
                request.Word.Trim(),
                request.CurrentTranslation?.Trim() ?? string.Empty,
                request.ProposedTranslation.Trim(),
                request.Notes?.Trim());

            return Ok(new { success = true, message = "Đã gửi báo cáo lỗi dịch thuật thành công." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}

public class ReportTranslationRequest
{
    public string Word { get; set; } = null!;
    public string CurrentTranslation { get; set; } = null!;
    public string ProposedTranslation { get; set; } = null!;
    public string? Notes { get; set; }
}

public class SaveVocabularyRequest
{
    public long? DocumentId { get; set; }
    public string? CustomDefinition { get; set; }
    public string? Pinyin { get; set; }
    public string? HanViet { get; set; }
    public string? WordType { get; set; }
    public int? PageNumber { get; set; }
    public string? PersonalNote { get; set; }
}

public class DeleteVocabularyRequest
{
    public bool DeleteFlashcards { get; set; }
}

public class BulkDeleteVocabularyRequest
{
    public List<long> Ids { get; set; } = new();
    public bool DeleteFlashcards { get; set; }
}

public class TranslateSentenceRequest
{
    public string Text { get; set; } = null!;
    public string? Language { get; set; } = "vi";
}

public class CompareSentencesRequest
{
    public string OriginalText { get; set; } = null!;
    public string ModifiedText { get; set; } = null!;
    public string? Language { get; set; } = "vi";
}

public class AiChatRequest
{
    public string Word { get; set; } = null!;
    public string Question { get; set; } = null!;
    public string? ContextSentence { get; set; }
    public string? Language { get; set; } = "vi";
}
