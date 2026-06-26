using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

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

    [HttpGet("{word}")]
    public async Task<IActionResult> GetVocabulary(string word)
    {
        if (string.IsNullOrWhiteSpace(word))
        {
            return BadRequest("Word is required.");
        }

        var result = await _vocabularyService.LookupWordAsync(word);

        if (result == null)
        {
            return NotFound(new { Message = $"Could not find or generate definition for '{word}'." });
        }

        return Ok(new
        {
            result.Id,
            result.Word,
            result.Pinyin,
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

        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var success = await _vocabularyService.SaveToNotebookAsync(userId, word, request.DocumentId);
        if (!success)
        {
            return BadRequest("Could not save to notebook.");
        }

        return Ok(new { Message = "Saved successfully." });
    }

    [HttpPost("translate-sentence")]
    public async Task<IActionResult> TranslateSentence([FromBody] TranslateSentenceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest("Text is required.");
        }

        var result = await _vocabularyService.AnalyzeSentenceAsync(request.Text);
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

        var result = await _vocabularyService.CompareSentencesAsync(request.OriginalText, request.ModifiedText);
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

        var reply = await _vocabularyService.AskAiAssistantAsync(request.Word, request.Question, request.ContextSentence ?? "");
        return Ok(new { Reply = reply });
    }
}

public class SaveVocabularyRequest
{
    public long? DocumentId { get; set; }
}

public class TranslateSentenceRequest
{
    public string Text { get; set; } = null!;
}

public class CompareSentencesRequest
{
    public string OriginalText { get; set; } = null!;
    public string ModifiedText { get; set; } = null!;
}

public class AiChatRequest
{
    public string Word { get; set; } = null!;
    public string Question { get; set; } = null!;
    public string? ContextSentence { get; set; }
}

