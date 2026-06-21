using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class LearningProgress
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public DateOnly ActivityDate { get; set; }

    public int? DocumentsRead { get; set; }

    public int? PagesRead { get; set; }

    public int? WordsClicked { get; set; }

    public int? NewWordsSaved { get; set; }

    public int? TotalWordsSaved { get; set; }

    public int? WordsMastered { get; set; }

    public int? StudySessionsDone { get; set; }

    public int? FlashcardsReviewed { get; set; }

    public int? FlashcardsKnow { get; set; }

    public int? LearnRoundsDone { get; set; }

    public int? LearnCorrect { get; set; }

    public int? MatchGamesDone { get; set; }

    public int? QuizzesCompleted { get; set; }

    public int? QuizTotalQuestions { get; set; }

    public int? QuizCorrectAnswers { get; set; }

    public int? XpEarned { get; set; }

    public int? StudyMinutes { get; set; }

    public virtual User User { get; set; } = null!;
}
