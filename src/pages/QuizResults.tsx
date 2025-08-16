import React, { useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  RotateCcw, 
  ArrowLeft, 
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  Award,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Star
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QuestionResult {
  question_index: number;
  question: string;
  type: string;
  difficulty: string;
  tags: string[];
  user_answer: string;
  user_score?: number;
  correct_answer?: any;
  correct_answers?: string[];
  sample_answer?: string;
  key_points?: string[];
  options?: { [key: string]: string };
  explanation?: string;
}

interface SubmissionData {
  submission_id: string;
  test_name: string;
  test_type: string;
  estimated_time: number;
  questions_with_answers: QuestionResult[];
  performance_metrics?: {
    skill_averages?: { [key: string]: number };
    topic_averages?: { [key: string]: number };
    difficulty_averages?: { [key: string]: number };
    overall_average?: number;
  };
}

export default function QuizResults() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const nav = useNavigate();
  const location = useLocation();
  
  const [selfScores, setSelfScores] = useState<{ [key: number]: number }>({});
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());
  const [explanationLoading, setExplanationLoading] = useState<{ [key: number]: boolean }>({});
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});

  // Get submission data from location state or fetch from API
  const submissionData = location.state?.submissionData as SubmissionData | undefined;
  const timeTaken = location.state?.timeTaken as number | undefined;

  // Fetch submission details if not provided in state
  const { data: fetchedSubmissionData, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error("Failed to load submission");
      }
      return response.json();
    },
    enabled: !submissionData && !!submissionId,
  });

  const finalSubmissionData = submissionData || fetchedSubmissionData;

  // Update self-scores mutation
  const updateScoresMutation = useMutation({
    mutationFn: async (scores: { [key: number]: number }) => {
      const response = await fetch(`/api/submissions/${submissionId}/update-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      });
      if (!response.ok) {
        throw new Error("Failed to update scores");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Self-assessment scores updated successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating scores", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get AI explanation mutation
  const getExplanationMutation = useMutation({
    mutationFn: async ({ questionData, questionIndex, userAnswer }: {
      questionData: QuestionResult;
      questionIndex: number;
      userAnswer: string;
    }) => {
      const response = await fetch('/api/explain-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_data: questionData,
          submission_id: submissionId,
          question_index: questionIndex,
          user_answer: userAnswer,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to get explanation");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      setExplanations(prev => ({
        ...prev,
        [variables.questionIndex]: data.explanation
      }));
      setExplanationLoading(prev => ({
        ...prev,
        [variables.questionIndex]: false
      }));
    },
    onError: (error, variables) => {
      toast({ 
        title: "Error getting explanation", 
        description: error.message,
        variant: "destructive"
      });
      setExplanationLoading(prev => ({
        ...prev,
        [variables.questionIndex]: false
      }));
    }
  });

  // Handle self-scoring
  const handleScoreChange = (questionIndex: number, score: number) => {
    setSelfScores(prev => ({
      ...prev,
      [questionIndex]: score
    }));
  };

  const saveScores = () => {
    if (Object.keys(selfScores).length === 0) {
      toast({ 
        title: "No scores to save", 
        description: "Please rate some answers first.",
        variant: "destructive"
      });
      return;
    }
    updateScoresMutation.mutate(selfScores);
  };

  const toggleQuestion = (index: number) => {
    setOpenQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getExplanation = (questionData: QuestionResult, index: number) => {
    if (explanations[index]) return;
    
    setExplanationLoading(prev => ({ ...prev, [index]: true }));
    getExplanationMutation.mutate({
      questionData,
      questionIndex: index,
      userAnswer: questionData.user_answer
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionIcon = (question: QuestionResult) => {
    if (question.type === 'mcq' || question.type === 'true_false') {
      const isCorrect = question.user_answer === question.correct_answer;
      return isCorrect ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    } else {
      const score = question.user_score || selfScores[question.question_index] || 0;
      return score >= 80 ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : score >= 60 ? (
        <AlertCircle className="h-5 w-5 text-yellow-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    }
  };

// Replace the getScoreColor function with this fixed version:
const getScoreColor = (score: number | unknown) => {
    const numericScore = typeof score === 'number' ? score : 0;
    if (numericScore >= 80) return "text-green-600 bg-green-50";
    if (numericScore >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };
  
  // Calculate overall statistics
  const statistics = useMemo(() => {
    if (!finalSubmissionData?.questions_with_answers) return null;

    const questions = finalSubmissionData.questions_with_answers;
    let totalScore = 0;
    let scoredQuestions = 0;
    let correctAnswers = 0;

    questions.forEach((q, index) => {
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (q.user_answer === q.correct_answer) {
          correctAnswers++;
          totalScore += 100;
        }
        scoredQuestions++;
      } else {
        const score = q.user_score || selfScores[index] || 0;
        if (score > 0) {
          totalScore += score;
          scoredQuestions++;
        }
      }
    });

    const averageScore = scoredQuestions > 0 ? totalScore / scoredQuestions : 0;
    const answered = questions.filter(q => q.user_answer && q.user_answer.trim() !== '').length;

    return {
      totalQuestions: questions.length,
      answered,
      correctAnswers,
      averageScore,
      scoredQuestions
    };
  }, [finalSubmissionData, selfScores]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!finalSubmissionData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Results Not Found</h2>
              <p className="text-muted-foreground">The quiz results you're looking for don't exist.</p>
            </div>
            <Button onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Quiz Results
              </h1>
              <p className="text-muted-foreground">{finalSubmissionData.test_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => nav(`/take-quiz/${finalSubmissionData.submission_id}`)}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retake Quiz
            </Button>
            {Object.keys(selfScores).length > 0 && (
              <Button onClick={saveScores} disabled={updateScoresMutation.isPending}>
                {updateScoresMutation.isPending ? "Saving..." : "Save Self-Assessment"}
              </Button>
            )}
          </div>
        </div>

        {/* Results Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Questions</span>
            </div>
            <div className="text-2xl font-bold">
              {statistics?.answered || 0}/{statistics?.totalQuestions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Answered</p>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Accuracy</span>
            </div>
            <div className="text-2xl font-bold">
              {statistics?.correctAnswers || 0}
            </div>
            <p className="text-xs text-muted-foreground">Correct Answers</p>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Average Score</span>
            </div>
            <div className="text-2xl font-bold">
              {statistics?.averageScore.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Self-Assessed</p>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Time Taken</span>
            </div>
            <div className="text-2xl font-bold">
              {timeTaken ? formatTime(timeTaken) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
        </div>

        {/* Performance Metrics (for comprehensive tests) */}
        // Replace the Performance Metrics section with this fixed version:
{finalSubmissionData.performance_metrics && (
  <div className="bg-card border rounded-lg p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-primary" />
      Performance Analysis
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {finalSubmissionData.performance_metrics.skill_averages && (
        <div>
          <h4 className="font-medium mb-3">Skills</h4>
          <div className="space-y-2">
            {Object.entries(finalSubmissionData.performance_metrics.skill_averages).map(([skill, score]) => {
              const numericScore = typeof score === 'number' ? score : 0;
              return (
                <div key={skill} className="flex justify-between text-sm">
                  <span className="capitalize">{skill.replace('-', ' ')}</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${getScoreColor(numericScore)}`}>
                    {numericScore.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {finalSubmissionData.performance_metrics.topic_averages && (
        <div>
          <h4 className="font-medium mb-3">Topics</h4>
          <div className="space-y-2">
            {Object.entries(finalSubmissionData.performance_metrics.topic_averages).map(([topic, score]) => {
              const numericScore = typeof score === 'number' ? score : 0;
              return (
                <div key={topic} className="flex justify-between text-sm">
                  <span className="capitalize">{topic}</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${getScoreColor(numericScore)}`}>
                    {numericScore.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {finalSubmissionData.performance_metrics.difficulty_averages && (
        <div>
          <h4 className="font-medium mb-3">Difficulty Levels</h4>
          <div className="space-y-2">
            {Object.entries(finalSubmissionData.performance_metrics.difficulty_averages).map(([difficulty, score]) => {
              const numericScore = typeof score === 'number' ? score : 0;
              return (
                <div key={difficulty} className="flex justify-between text-sm">
                  <span className="capitalize">{difficulty}</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${getScoreColor(numericScore)}`}>
                    {numericScore.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
)}


        {/* Question Review */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Question Review
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Review your answers and provide self-assessment scores for open-ended questions.
            </p>
          </div>

          <div className="divide-y">
            {finalSubmissionData.questions_with_answers.map((question, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  onClick={() => toggleQuestion(index)}
                >
                  <div className="flex items-center gap-3">
                    {getQuestionIcon(question)}
                    <div className="text-left">
                      <div className="font-medium">Q{index + 1}: {question.question}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {question.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {question.difficulty}
                        </Badge>
                        {question.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {openQuestions.has(index) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4 space-y-4">
                  {/* User's Answer */}
                  <div>
                    <Label className="text-sm font-medium">Your Answer:</Label>
                    <div className="mt-1 p-3 bg-muted/50 rounded-md">
                      {question.user_answer || <em className="text-muted-foreground">No answer provided</em>}
                    </div>
                  </div>

                  {/* Correct Answer / Sample Answer */}
                  {(question.correct_answer || question.correct_answers || question.sample_answer) && (
                    <div>
                      <Label className="text-sm font-medium">
                        {question.type === 'mcq' || question.type === 'true_false' ? 'Correct Answer:' : 'Sample Answer:'}
                      </Label>
                      <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                        {question.correct_answer || 
                         (question.correct_answers && question.correct_answers.join(', ')) ||
                         question.sample_answer}
                      </div>
                    </div>
                  )}

                  {/* Key Points */}
                  {question.key_points && question.key_points.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Key Points to Consider:</Label>
                      <ul className="mt-1 list-disc list-inside space-y-1 text-sm">
                        {question.key_points.map((point, pointIndex) => (
                          <li key={pointIndex}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Self-Assessment for Open Questions */}
                  {!['mcq', 'true_false'].includes(question.type) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-3 block">
                        Self-Assessment Score (0-100):
                      </Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[selfScores[index] || question.user_score || 0]}
                          onValueChange={([value]) => handleScoreChange(index, value)}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="font-medium min-w-12 text-center">
                          {selfScores[index] || question.user_score || 0}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Rate how well you think you answered this question
                      </p>
                    </div>
                  )}

                  {/* AI Explanation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getExplanation(question, index)}
                      disabled={explanationLoading[index] || !!explanations[index]}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {explanationLoading[index] ? "Getting Explanation..." : 
                       explanations[index] ? "Explanation Loaded" : "Get AI Explanation"}
                    </Button>
                  </div>

                  {/* Show AI Explanation */}
                  {explanations[index] && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Star className="h-4 w-4 text-purple-600" />
                        AI Explanation & Feedback:
                      </Label>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: explanations[index] }}
                      />
                    </div>
                  )}

                  {/* Built-in Explanation */}
                  {question.explanation && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block">Explanation:</Label>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: question.explanation }}
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => nav('/folders')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Back to Folders
          </Button>
          <Button onClick={() => window.print()}>
            <Eye className="h-4 w-4 mr-2" />
            Print Results
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}