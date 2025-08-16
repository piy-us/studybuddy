import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flag,
  Send,
  MessageCircle,
  ArrowLeft,
  BookOpen,
  Target,
  AlertCircle
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { getTestDetails, submitTest } from "@/lib/api";

interface Question {
  question: string;
  type: "mcq" | "true_false" | "short_answer" | "long_answer" | "fill_blanks" | "multi_select";
  difficulty: string;
  options?: { [key: string]: string };
  correct_answer?: any;
  correct_answers?: string[];
  sample_answer?: string;
  key_points?: string[];
  explanation?: string;
  tags?: string[];
}

interface TestData {
  test_id: string;
  test_name: string;
  test_data: Question[];
  estimated_time: number;
  difficulty: string;
  test_type?: string;
  tags?: string[];
}

export default function TakeQuiz() {
  const { testId } = useParams<{ testId: string }>();
  const nav = useNavigate();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(Date.now());

  // Fetch test data using the API function
  const { data: testData, isLoading, error } = useQuery<TestData>({
    queryKey: ["test", testId],
    queryFn: async () => {
      if (!testId) {
        throw new Error("No test ID provided");
      }
      const data = await getTestDetails(testId);
      console.log("Fetched test data:", data); // Debug log
      return data;
    },
    enabled: !!testId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Initialize timer
  useEffect(() => {
    if (testData?.estimated_time && timeRemaining === null) {
      setTimeRemaining(testData.estimated_time * 60); // Convert to seconds
    }
  }, [testData, timeRemaining]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitted]);

  // Submit test mutation
  const submitMutation = useMutation({
    mutationFn: async (submissionData: { answers: Record<number, string>; scores?: Record<number, number> }) => {
      if (!testId) {
        throw new Error("No test ID provided");
      }
      return await submitTest(testId, submissionData.answers, submissionData.scores || {});
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      toast({ title: "Test submitted successfully!" });
      // Navigate to results page
      nav(`/quiz-results/${data.submission_id}`, { 
        state: { 
          submissionData: data,
          timeTaken: Math.round((Date.now() - startTime) / 1000)
        }
      });
    },
    onError: (error: any) => {
      console.error("Submit test error:", error);
      toast({ 
        title: "Error submitting test", 
        description: error?.message || "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAutoSubmit = () => {
    if (!isSubmitted) {
      toast({ 
        title: "Time's up!", 
        description: "Your test is being submitted automatically.",
        variant: "destructive"
      });
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate({ answers });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: value
    }));
  };

  const handleMultiSelectChange = (option: string, checked: boolean) => {
    const currentAnswer = answers[currentQuestion] || "";
    const currentSelections = currentAnswer ? currentAnswer.split(",") : [];
    
    let newSelections: string[];
    if (checked) {
      newSelections = [...currentSelections, option];
    } else {
      newSelections = currentSelections.filter(sel => sel !== option);
    }
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: newSelections.join(",")
    }));
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (testData?.test_data.length || 0)) {
      setCurrentQuestion(index);
    }
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Calculate progress and stats
  const progress = useMemo(() => {
    if (!testData) return { completed: 0, total: 0, percentage: 0 };
    
    const total = testData.test_data.length;
    const completed = Object.keys(answers).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  }, [answers, testData]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    console.error("Test fetch error:", error);
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Failed to Load Quiz</h2>
              <p className="text-muted-foreground">
                Error: {(error as any)?.message || "The quiz you're looking for couldn't be loaded."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Test ID: {testId}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => nav(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!testData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Quiz Not Found</h2>
              <p className="text-muted-foreground">The quiz you're looking for doesn't exist or has been removed.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Test ID: {testId}
              </p>
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

  // Check if test_data exists and has questions
  if (!testData.test_data || testData.test_data.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">No Questions Available</h2>
              <p className="text-muted-foreground">This quiz doesn't have any questions yet.</p>
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

  const currentQ = testData.test_data[currentQuestion];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Quiz Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="font-semibold">{testData.test_name}</h1>
              <div className="text-sm text-muted-foreground">
                Q{currentQuestion + 1} of {testData.test_data.length} • {testData.difficulty} • {testData.test_type || 'normal'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {progress.completed}/{progress.total} answered
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={`text-sm font-mono ${timeRemaining < 300 ? "text-red-500" : ""}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            <Button 
              onClick={() => setShowSubmitConfirm(true)} 
              disabled={submitMutation.isPending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-muted/30">
          <Progress value={progress.percentage} className="w-full h-2" />
        </div>

        {/* Question Navigation */}
        <div className="px-6 py-3 border-b bg-card">
          <div className="flex gap-1 flex-wrap">
            {testData.test_data.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  index === currentQuestion
                    ? "bg-primary text-primary-foreground"
                    : answers[index]
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : flaggedQuestions.has(index)
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-muted hover:bg-muted/80"
                }`}
                title={`Question ${index + 1}${answers[index] ? " (Answered)" : ""}${flaggedQuestions.has(index) ? " (Flagged)" : ""}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question Area */}
        <div className="p-6">
          <div className="bg-card border rounded-lg p-6 space-y-6">
            {/* Question Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {currentQ.tags && currentQ.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground capitalize">
                    {currentQ.type.replace("_", " ")} • {currentQ.difficulty}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(currentQuestion)}
                  className={flaggedQuestions.has(currentQuestion) ? "text-yellow-600" : ""}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  {flaggedQuestions.has(currentQuestion) ? "Unflag" : "Flag"}
                </Button>
              </div>
              
              <h2 className="text-lg font-medium leading-relaxed mb-4">
                {currentQ.question}
              </h2>
            </div>

            {/* Answer Input Based on Question Type */}
            <div className="space-y-4">
              {currentQ.type === "mcq" && currentQ.options && (
                <RadioGroup
                  value={answers[currentQuestion] || ""}
                  onValueChange={handleAnswerChange}
                  className="space-y-3"
                >
                  {Object.entries(currentQ.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={key} id={`option-${key}`} />
                      <Label htmlFor={`option-${key}`} className="flex-1 cursor-pointer">
                        <span className="font-medium mr-2">{key})</span>
                        {value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQ.type === "true_false" && (
                <RadioGroup
                  value={answers[currentQuestion] || ""}
                  onValueChange={handleAnswerChange}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}

              {currentQ.type === "multi_select" && currentQ.options && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Select all that apply:</p>
                  {Object.entries(currentQ.options).map(([key, value]) => {
                    const currentSelections = answers[currentQuestion] ? answers[currentQuestion].split(",") : [];
                    return (
                      <div key={key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={currentSelections.includes(key)}
                          onCheckedChange={(checked) => handleMultiSelectChange(key, !!checked)}
                          id={`multi-${key}`}
                        />
                        <Label htmlFor={`multi-${key}`} className="flex-1 cursor-pointer">
                          <span className="font-medium mr-2">{key})</span>
                          {value}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {(currentQ.type === "short_answer" || currentQ.type === "fill_blanks") && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Your Answer:</Label>
                  <Textarea
                    value={answers[currentQuestion] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer here..."
                    className="min-h-[100px]"
                    rows={3}
                  />
                </div>
              )}

              {currentQ.type === "long_answer" && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Your Answer:</Label>
                  <Textarea
                    value={answers[currentQuestion] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Provide a detailed answer..."
                    className="min-h-[150px]"
                    rows={6}
                  />
                  {currentQ.key_points && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-800 mb-1">Consider including:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {currentQ.key_points.map((point, idx) => (
                          <li key={idx}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{progress.completed} of {progress.total} answered</span>
                <span>•</span>
                <span>{flaggedQuestions.size} flagged</span>
              </div>

              <Button
                onClick={() => goToQuestion(currentQuestion + 1)}
                disabled={currentQuestion === testData.test_data.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg p-6 w-[500px] max-w-[90vw] m-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Submit Quiz?</h3>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Questions answered:</span>
                    <span className="font-medium">{progress.completed} of {progress.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Questions flagged:</span>
                    <span className="font-medium">{flaggedQuestions.size}</span>
                  </div>
                  {timeRemaining !== null && (
                    <div className="flex justify-between">
                      <span>Time remaining:</span>
                      <span className="font-medium">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>

                {progress.completed < progress.total && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      You have {progress.total - progress.completed} unanswered question(s). 
                      You can still submit, but consider reviewing them first.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                    Review More
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        Submitting...
                      </div>
                    ) : (
                      "Submit Quiz"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}