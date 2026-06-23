using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

namespace Hanora.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class PracticeController : ControllerBase
{
    private readonly IQuizService _quizService;

    public PracticeController(IQuizService quizService)
    {
        _quizService = quizService;
    }

    private long GetUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(userIdString, out long userId) ? userId : 0;
    }

    // Start an AI practice test from a config payload.
    [HttpPost("start")]
    public async Task<IActionResult> GenerateQuiz([FromBody] StartTestRequest request)
    {
        long userId = GetUserId();
        if (userId == 0) return Unauthorized();

        try
        {
            var session = await _quizService.CreateQuizAsync(userId, request ?? new StartTestRequest());
            return Ok(session);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    // Save (not grade) a single answer — auto-save / resume support.
    [HttpPost("answer")]
    public async Task<IActionResult> SaveAnswer([FromBody] QuizQuestionAnswerDto dto)
    {
        var success = await _quizService.SaveAnswerAsync(dto);
        return success ? Ok(new { Saved = true }) : NotFound();
    }

    // Toggle the flag marker on a question.
    [HttpPost("flag")]
    public async Task<IActionResult> Flag([FromBody] FlagRequest req)
    {
        var success = await _quizService.FlagQuestionAsync(req.QuestionId, req.Flagged);
        return success ? Ok(new { Saved = true }) : NotFound();
    }

    // Grade + analyze the test.
    [HttpPost("finish/{sessionId}")]
    public async Task<IActionResult> FinishQuiz(long sessionId)
    {
        var session = await _quizService.FinishQuizAsync(sessionId);
        if (session == null) return NotFound();
        return Ok(session);
    }

    // Full session detail (for review screen / resume).
    [HttpGet("result/{sessionId}")]
    public async Task<IActionResult> GetResult(long sessionId)
    {
        var session = await _quizService.GetQuizResultAsync(sessionId);
        if (session == null) return NotFound();
        return Ok(session);
    }

    // Completed-test history for the current user.
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        long userId = GetUserId();
        if (userId == 0) return Unauthorized();
        return Ok(await _quizService.GetHistoryAsync(userId));
    }

    // Most recent unfinished session (to offer "Resume Test"), or 204 if none.
    [HttpGet("in-progress")]
    public async Task<IActionResult> GetInProgress()
    {
        long userId = GetUserId();
        if (userId == 0) return Unauthorized();
        var session = await _quizService.GetInProgressAsync(userId);
        if (session == null) return NoContent();
        return Ok(session);
    }
}

public class FlagRequest
{
    public long QuestionId { get; set; }
    public bool Flagged { get; set; }
}
