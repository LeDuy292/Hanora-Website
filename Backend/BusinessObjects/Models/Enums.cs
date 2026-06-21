using System;

namespace BusinessObjects.Models;

public enum ChannelType { Public, Private }
public enum DocumentStatus { Processing, Ready, Failed }
public enum FlashcardMode { Flashcard, Test }
public enum FlipResult { Know, StillLearning }
public enum LeaderboardPeriod { Daily, Weekly, Monthly, AllTime }
public enum LearnQuestionType { MultipleChoice, TypeAnswer, TrueFalse }
public enum LearnResult { Correct, Incorrect }
public enum QuizQuestionType { MultipleChoiceMeaning, MultipleChoiceWord, FillInBlank, PinyinMatch }
public enum RelationType { Synonym, Antonym, Compound }
public enum ReportStatus { Pending, Reviewed, Dismissed, ActionTaken }
public enum WordType { Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Particle, MeasureWord, Interjection, Other }
