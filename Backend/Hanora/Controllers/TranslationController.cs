using Microsoft.AspNetCore.Mvc;
using Services;
using System.Threading.Tasks;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TranslationController : ControllerBase
{
    private readonly IVocabularyService _vocabularyService;

    public TranslationController(IVocabularyService vocabularyService)
    {
        _vocabularyService = vocabularyService;
    }

    [HttpPost]
    public async Task<IActionResult> TranslateText([FromBody] TranslationRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new { success = false, message = "Text is required." });
        }

        var analysis = await _vocabularyService.AnalyzeSentenceAsync(request.Text, request.SourceLanguage ?? "auto", request.TargetLanguage ?? "vi");
        if (analysis == null)
        {
            return BadRequest(new { success = false, message = "Failed to translate text." });
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                originalText = analysis.OriginalText,
                translatedText = analysis.Vietnamese,
                sourceLanguage = request.SourceLanguage ?? "auto",
                targetLanguage = request.TargetLanguage ?? "vi",
                pinyin = analysis.Pinyin,
                hanViet = analysis.HanViet,
                grammarAnalysis = analysis.GrammarAnalysis
            }
        });
    }
}

public class TranslationRequest
{
    public string Text { get; set; } = string.Empty;
    public string? SourceLanguage { get; set; } = "auto";
    public string? TargetLanguage { get; set; } = "vi";
}
