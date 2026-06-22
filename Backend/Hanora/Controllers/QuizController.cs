using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PracticeController : ControllerBase
{
    private readonly IQuizService _quizService;

    public PracticeController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> GenerateQuiz([FromQuery] int count = 10)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; // Default for demo
        }

        try
        {
            var session = await _quizService.CreateQuizAsync(userId, count);
            return Ok(session);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("finish/{sessionId}")]
    public async Task<IActionResult> FinishQuiz(long sessionId)
    {
        var session = await _quizService.FinishQuizAsync(sessionId);
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpPost("answer")]
    public async Task<IActionResult> SubmitAnswer([FromBody] QuizQuestionAnswerDto dto)
    {
        var success = await _quizService.SubmitAnswerAsync(dto);
        return success ? Ok(new { Saved = true }) : NotFound();
    }


    [HttpGet("result/{sessionId}")]
    public async Task<IActionResult> GetResult(long sessionId)
    {
        var session = await _quizService.GetQuizResultAsync(sessionId);
        if (session == null) return NotFound();
        return Ok(session);
    }
}
