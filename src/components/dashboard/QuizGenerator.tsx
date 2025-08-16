import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Link as LinkIcon, Settings, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

import { generateQuiz } from "@/lib/api";

export function QuizGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // core state
  const [questionCount, setQuestionCount] = useState(15);
  const [questionTypes, setQuestionTypes] = useState({
    mcq: true,
    tf: true,
    short: false,
    long: false
  });
  const [difficulty, setDifficulty] = useState("medium");

  // urls and files state
  const [urlsText, setUrlsText] = useState("");
  const [urlsList, setUrlsList] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);

  const maxQuestions = 50;
  const progress = (questionCount / maxQuestions) * 100;

  // validate + parse URLs from textarea
  const parseUrlsFromText = (text: string) => {
    return text
      .split(/\r?\n/)
      .map(u => u.trim())
      .filter(Boolean);
  };

  const validateUrl = (u: string) => {
    try {
      // ensure protocol exists; URL constructor will throw otherwise
      const url = new URL(u.includes("://") ? u : `http://${u}`);
      return true;
    } catch {
      return false;
    }
  };

  const addUrlsToList = () => {
    const parsed = parseUrlsFromText(urlsText);
    const valid = parsed.filter(validateUrl);
    const invalid = parsed.filter(p => !validateUrl(p));

    if (invalid.length > 0) {
      toast({
        title: "Some URLs invalid",
        description: `${invalid.length} url(s) were ignored`,
        variant: "destructive"
      });
    }

    // dedupe
    setUrlsList(prev => Array.from(new Set([...prev, ...valid])));
    setUrlsText("");
    
    if (valid.length > 0) {
      toast({
        title: "URLs Added",
        description: `${valid.length} URL(s) added successfully`
      });
    }
  };

  // file handlers
  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files || []);
    // only allow PDFs
    const pdfs = chosen.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length < chosen.length) {
      toast({
        title: "Only PDFs allowed",
        description: "Non-PDF files were ignored",
        variant: "destructive"
      });
    }
    setFiles(prev => [...prev, ...pdfs]);
    
    if (pdfs.length > 0) {
      toast({
        title: "Files Added",
        description: `${pdfs.length} PDF(s) added successfully`
      });
    }
    
    // reset input so same file can be reselected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFileAt = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const removeUrlAt = (idx: number) => setUrlsList(prev => prev.filter((_, i) => i !== idx));

  const handleGenerateQuiz = async () => {
    // require at least one source
    if (urlsList.length === 0 && files.length === 0) {
      toast({
        title: "Add content",
        description: "Please paste links or upload at least one PDF.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedTypes = Object.keys(questionTypes).filter(k => (questionTypes as any)[k]);
      
      if (selectedTypes.length === 0) {
        toast({
          title: "Select question types",
          description: "Please select at least one question type.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Map UI question types to backend expected types
      const typeMapping: { [key: string]: string } = {
        mcq: "mcq",
        tf: "true_false", 
        short: "short_answer",
        long: "long_answer"
      };

      const backendTypes = selectedTypes.map(type => typeMapping[type] || type);

      let response;
      
      // if there are files -> send multipart/form-data
      if (files.length > 0) {
        const fd = new FormData();
        
        // append files
        files.forEach((f) => fd.append("files", f));
        
        // append urls as individual form fields
        urlsList.forEach(u => fd.append("urls", u));
        
        // other fields
        fd.append("num_questions", String(questionCount));
        fd.append("question_types", JSON.stringify(backendTypes));
        fd.append("difficulty", difficulty);
        fd.append("test_name", `Quiz - ${new Date().toLocaleString()}`);

        response = await generateQuiz(fd, { multipart: true });
      } else {
        // no files -> send JSON body
        const payload = {
          urls: urlsList,
          num_questions: questionCount,
          question_types: backendTypes,
          difficulty,
          test_name: `Quiz - ${new Date().toLocaleString()}`
        };
        response = await generateQuiz(payload, { multipart: false });
      }

      const testId = response?.data?.test_id || response?.data?.quiz_id || response?.data?.id;
      
      if (testId) {
        toast({
          title: "Quiz Generated!",
          description: "Starting your quiz now..."
        });
        
        // Clear the form
        setUrlsList([]);
        setFiles([]);
        setUrlsText("");
        
        // Navigate to the quiz
        navigate(`/take-quiz/${testId}`);
      } else {
        throw new Error("No test ID received from server");
      }
      
    } catch (err: any) {
      console.error("Generate quiz error:", err);
      toast({
        title: "Generation failed",
        description: err.message || "Please try again or check your inputs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if we have content and at least one question type selected
  const hasContent = urlsList.length > 0 || files.length > 0;
  const hasQuestionTypes = Object.values(questionTypes).some(Boolean);
  const canGenerate = hasContent && hasQuestionTypes && !loading;

  return (
    <div className="w-full lg:w-100 bg-card border border-card-border rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 pb-3 border-b border-card-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Generate Quiz</span>
          <span className="sm:hidden">Quiz</span>
        </h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-1 touch-manipulation">
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3 md:p-4 space-y-4">
        {/* Source Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">SOURCE</Label>
          <div className="flex flex-wrap gap-2">
            {/* Upload: triggers hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 md:px-3 text-xs touch-manipulation"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Upload Files</span>
              <span className="sm:hidden">Upload</span>
            </Button>

            {/* Add URLs button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 md:px-3 text-xs touch-manipulation"
              onClick={() => document.getElementById('urls-textarea')?.focus()}
            >
              <LinkIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Add URLs</span>
              <span className="sm:hidden">URLs</span>
            </Button>
          </div>
        </div>

        {/* URLs textarea + add button */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">PASTE URLS (one per line)</Label>
          <textarea
            id="urls-textarea"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder="https://example.com/article1&#10;https://example.com/article2"
            className="w-full min-h-[64px] max-h-36 p-2 text-sm bg-background-secondary border border-card-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2" 
              onClick={addUrlsToList}
              disabled={!urlsText.trim()}
            >
              Add URLs
            </Button>
            <div className="text-xs text-muted-foreground">
              {urlsList.length} link(s) added
            </div>
          </div>

          {/* show added urls */}
          {urlsList.length > 0 && (
            <div className="space-y-1 pt-1">
              {urlsList.slice(0, 3).map((u, idx) => (
                <div key={u + idx} className="flex items-center justify-between bg-background-secondary p-2 rounded text-xs">
                  <div className="truncate pr-2" title={u}>{u}</div>
                  <button 
                    className="p-1 hover:bg-muted rounded" 
                    onClick={() => removeUrlAt(idx)}
                    title="Remove URL"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
              {urlsList.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  ... and {urlsList.length - 3} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* uploaded files preview */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">UPLOADED FILES</Label>
            <div className="space-y-1">
              {files.slice(0, 3).map((f, i) => (
                <div key={f.name + i} className="flex items-center justify-between bg-background-secondary p-2 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center text-[10px] font-medium">PDF</span>
                    <div className="truncate" title={f.name}>{f.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                    <button 
                      className="p-1 hover:bg-muted rounded" 
                      onClick={() => removeFileAt(i)}
                      title="Remove file"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
              {files.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  ... and {files.length - 3} more files
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Count */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">QUESTIONS</Label>
            <span className="text-sm font-medium">{questionCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-gradient-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Input
              type="number"
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(maxQuestions, Math.max(1, parseInt(e.target.value) || 1)))}
              className="h-8 w-16 text-xs text-center"
              min="1"
              max={maxQuestions}
            />
          </div>
        </div>

        {/* Question Types */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">TYPES</Label>
          <div className="grid grid-cols-2 md:flex gap-2 md:gap-4">
            {Object.entries(questionTypes).map(([key, value]) => (
              <label key={key} className="flex items-center gap-1.5 text-sm touch-manipulation cursor-pointer">
                <Checkbox
                  checked={value}
                  onCheckedChange={(checked) => setQuestionTypes(prev => ({ ...prev, [key]: !!checked }))}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{key.toUpperCase()}</span>
              </label>
            ))}
          </div>
          {!hasQuestionTypes && (
            <div className="text-xs text-destructive">Select at least one question type</div>
          )}
        </div>

        {/* Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">DIFFICULTY</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 md:px-3 touch-manipulation"
            onClick={() => {
              // Reset form
              setUrlsList([]);
              setFiles([]);
              setUrlsText("");
              setQuestionCount(15);
              setQuestionTypes({ mcq: true, tf: true, short: false, long: false });
              setDifficulty("medium");
              toast({ title: "Form cleared", description: "Ready for new quiz" });
            }}
          >
            <X className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Clear</span>
            <span className="sm:hidden">Clear</span>
          </Button>

          <Button
            className="flex-1 h-8 bg-gradient-primary hover:opacity-90 font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerateQuiz}
            disabled={!canGenerate}
          >
            <Zap className="h-4 w-4 mr-1" />
            {loading ? (
              <>
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">Creating...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Generate Quiz</span>
                <span className="sm:hidden">Create</span>
              </>
            )}
          </Button>
        </div>

        {/* Status indicator */}
        {!hasContent && (
          <div className="text-xs text-muted-foreground text-center py-2 bg-muted/50 rounded">
            Add URLs or upload PDFs to get started
          </div>
        )}
      </div>
    </div>
  );
}