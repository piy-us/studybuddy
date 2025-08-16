import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  FileText, 
  Link, 
  FolderOpen, 
  Upload, 
  Zap, 
  Plus,
  Settings,
  Clock,
  Target,
  BookOpen
} from "lucide-react";
import { useState } from "react";

const folders = [
  { id: 1, name: "Machine Learning", icon: "📚" },
  { id: 2, name: "Physics Notes", icon: "📚" },
  { id: 3, name: "History Study", icon: "📚" },
  { id: 4, name: "Mathematics", icon: "📚" },
];

export default function Quiz() {
  const [contentSource, setContentSource] = useState<"current" | "select" | "upload" | "urls">("current");
  const [questionCount, setQuestionCount] = useState([15]);
  const [questionTypes, setQuestionTypes] = useState({
    mcq: true,
    trueFalse: true,
    shortAnswer: false,
    longAnswer: false
  });
  const [difficulty, setDifficulty] = useState("medium");
  const [testType, setTestType] = useState("normal");
  const [timeLimit, setTimeLimit] = useState(true);
  const [timeLimitValue, setTimeLimitValue] = useState("30");
  const [detailedTags, setDetailedTags] = useState(true);
  const [saveToFolder, setSaveToFolder] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="h-12 flex items-center justify-between border-b border-border mb-6">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Generate Quiz</h1>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Quiz Settings Panel (300px width) */}
          <div className="w-75 bg-card border border-card-border rounded-lg p-4 space-y-4">
            {/* Content Source */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Content Source</h3>
              <RadioGroup value={contentSource} onValueChange={(value: any) => setContentSource(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="current" />
                  <Label htmlFor="current" className="text-sm">Current Folder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="select" id="select" />
                  <Label htmlFor="select" className="text-sm">Select Folders</Label>
                  {contentSource === "select" && (
                    <Button variant="outline" size="sm" className="h-6 ml-2">
                      Choose
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upload" id="upload" />
                  <Label htmlFor="upload" className="text-sm">Upload Files</Label>
                  {contentSource === "upload" && (
                    <Button variant="outline" size="sm" className="h-6 ml-2">
                      <Upload className="h-3 w-3 mr-1" />
                      Browse
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="urls" id="urls" />
                  <Label htmlFor="urls" className="text-sm">Add URLs</Label>
                  {contentSource === "urls" && (
                    <Button variant="outline" size="sm" className="h-6 ml-2">
                      <Link className="h-3 w-3 mr-1" />
                      Paste Links
                    </Button>
                  )}
                </div>
              </RadioGroup>
            </div>

            {/* Questions Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Questions</Label>
                <span className="text-sm text-muted-foreground">{questionCount[0]}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < questionCount[0] / 3 ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Slider
                value={questionCount}
                onValueChange={setQuestionCount}
                max={30}
                min={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Question Types */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Types</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mcq"
                    checked={questionTypes.mcq}
                    onCheckedChange={(checked) =>
                      setQuestionTypes(prev => ({ ...prev, mcq: !!checked }))
                    }
                  />
                  <Label htmlFor="mcq" className="text-sm">MCQ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tf"
                    checked={questionTypes.trueFalse}
                    onCheckedChange={(checked) =>
                      setQuestionTypes(prev => ({ ...prev, trueFalse: !!checked }))
                    }
                  />
                  <Label htmlFor="tf" className="text-sm">T/F</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sa"
                    checked={questionTypes.shortAnswer}
                    onCheckedChange={(checked) =>
                      setQuestionTypes(prev => ({ ...prev, shortAnswer: !!checked }))
                    }
                  />
                  <Label htmlFor="sa" className="text-sm">SA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="la"
                    checked={questionTypes.longAnswer}
                    onCheckedChange={(checked) =>
                      setQuestionTypes(prev => ({ ...prev, longAnswer: !!checked }))
                    }
                  />
                  <Label htmlFor="la" className="text-sm">LA</Label>
                </div>
              </div>
            </div>

            {/* Difficulty & Test Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Test Type</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="timed">Timed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Limit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="time-limit"
                  checked={timeLimit}
                  onCheckedChange={(checked) => setTimeLimit(!!checked)}
                />
                <Label htmlFor="time-limit" className="text-sm">Time Limit:</Label>
                {timeLimit && (
                  <div className="flex items-center gap-1">
                    <Input
                      value={timeLimitValue}
                      onChange={(e) => setTimeLimitValue(e.target.value)}
                      className="h-6 w-12 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Tags */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="detailed-tags"
                checked={detailedTags}
                onCheckedChange={(checked) => setDetailedTags(!!checked)}
              />
              <Label htmlFor="detailed-tags" className="text-sm">Detailed Tags</Label>
            </div>

            {/* Save Quiz To */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Save Quiz To</Label>
              {!showNewFolderInput ? (
                <div className="space-y-2">
                  <Select value={saveToFolder} onValueChange={setSaveToFolder}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="📁 Existing Folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          {folder.icon} {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full"
                    onClick={() => setShowNewFolderInput(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create New Folder
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name..."
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      // TODO: Create folder
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }}
                  >
                    ✓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }}
                  >
                    ✗
                  </Button>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button className="w-full h-10 bg-gradient-primary hover:opacity-90">
              <Zap className="h-4 w-4 mr-2" />
              Generate Quiz
            </Button>
          </div>

          {/* Preview/Instructions Area */}
          <div className="flex-1 space-y-6">
            {/* Quiz Preview */}
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Quiz Preview</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Questions:</span>
                  <span>{questionCount[0]} questions</span>
                </div>
                <div className="flex justify-between">
                  <span>Types:</span>
                  <span>
                    {Object.entries(questionTypes)
                      .filter(([_, enabled]) => enabled)
                      .map(([type, _]) => type.toUpperCase())
                      .join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className="capitalize">{difficulty}</span>
                </div>
                {timeLimit && (
                  <div className="flex justify-between">
                    <span>Time Limit:</span>
                    <span>{timeLimitValue} minutes</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="capitalize">{contentSource.replace("-", " ")}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Tips for Better Quizzes</h3>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Include diverse content types (PDFs, videos, articles)</li>
                <li>• Mix question types for comprehensive assessment</li>
                <li>• Set appropriate time limits based on difficulty</li>
                <li>• Use detailed tags for better organization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}