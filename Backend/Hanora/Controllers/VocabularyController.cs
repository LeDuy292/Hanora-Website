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
            Examples = result.ExampleSentencesNavigation.Select(e => new
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
}

public class SaveVocabularyRequest
{
    public long? DocumentId { get; set; }
}
