// src/components/pages/FolderDetails.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  FileText,
  Link as LinkIcon,
  Youtube,
  Zap,
  Play,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  X,
  Trash,
  ChevronRight,
  ArrowLeft,
  Settings,
  BookOpen,
  Clock,
  Target,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";

// Use the existing API functions from api.ts
import {
  getFolderLinks as apiFolderLinks,
  getFolderTests as apiFolderTests,
  addLinksToFolder,
  uploadPdfsToFolder as apiUploadPdfs,
  deleteLink as apiDeleteLink,
  deleteTest as apiDeleteTest,
  generateTestFromFolder as apiGenerateTest,
  generateComprehensiveTestFromFolder,
} from "@/lib/api";

// ════════════════════════ Types ════════════════════════
type LinkItem = {
  link_id: string;
  folder_id: string;
  url?: string;
  display_name?: string;
  title?: string;
  link_type?: string;
  created_at?: string;
  last_accessed?: string;
  content_preview?: string;
  custom_name?: string;
};

type TestItem = {
  test_id: string;
  folder_id: string;
  test_name?: string;
  num_questions?: number;
  tags?: string;
  created_at?: string;
  estimated_time?: number;
  test_type?: string;
};

// ════════════════════════ Helpers ════════════════════════
function TypeTile({ type }: { type?: string }) {
  const base = "h-8 w-8 rounded-md flex items-center justify-center";
  if (type === "pdf")
    return (
      <div className={`bg-primary/10 text-primary ${base}`}>
        <FileText className="h-4 w-4" />
      </div>
    );
  if (type === "youtube")
    return (
      <div className={`bg-red-500/10 text-red-500 ${base}`}>
        <Youtube className="h-4 w-4" />
      </div>
    );
  return (
    <div className={`bg-blue-500/10 text-blue-500 ${base}`}>
      <LinkIcon className="h-4 w-4" />
    </div>
  );
}

function TestTile() {
  return (
    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
      <Zap className="h-4 w-4" />
    </div>
  );
}

// ════════════════════════ Component ════════════════════════
export default function FolderDetailsPage() {
  const { folderId = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"content" | "tests">("content");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [pasteLinks, setPasteLinks] = useState("");
  const [pdfs, setPdfs] = useState<File[]>([]);

  // Enhanced quiz generation state
  const [quizName, setQuizName] = useState("");
  const [numQuestions, setNumQuestions] = useState([15]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [qTypes, setQTypes] = useState({ mcq: true, tf: true, short: false, long: false });
  const [testType, setTestType] = useState<"normal" | "comprehensive">("normal");
  const [timeLimit, setTimeLimit] = useState(true);
  const [timeLimitValue, setTimeLimitValue] = useState("30");
  const [detailedTags, setDetailedTags] = useState(true);

  // Queries using the imported API functions
  const { data: links = [], isLoading: linksLoading, error: linksError } = useQuery({
    queryKey: ["folder-links", folderId],
    queryFn: () => apiFolderLinks(folderId),
    enabled: !!folderId,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: tests = [], isLoading: testsLoading, error: testsError } = useQuery({
    queryKey: ["folder-tests", folderId],
    queryFn: () => apiFolderTests(folderId),
    enabled: !!folderId,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle errors using useEffect - React Query v5 way
  useEffect(() => {
    if (linksError) {
      console.error("Links query error:", linksError);
      toast({ 
        title: "Error loading content", 
        description: "Failed to load folder content. Please try again.",
        variant: "destructive"
      });
    }
  }, [linksError]);

  useEffect(() => {
    if (testsError) {
      console.error("Tests query error:", testsError);
      toast({ 
        title: "Error loading tests", 
        description: "Failed to load folder tests. Please try again.",
        variant: "destructive"
      });
    }
  }, [testsError]);

  // Mutations using the imported API functions
  const addLinksMut = useMutation({
    mutationFn: (urls: string[]) => addLinksToFolder(folderId, urls),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-links", folderId] });
      toast({ title: "Links added successfully" });
      setPasteLinks("");
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error("Add links error:", error);
      toast({ 
        title: "Error adding links", 
        description: error?.message || "Failed to add links. Please try again.",
        variant: "destructive"
      });
    }
  });

  const uploadPdfsMut = useMutation({
    mutationFn: (files: File[]) => apiUploadPdfs(folderId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-links", folderId] });
      toast({ title: "PDFs uploaded successfully" });
      setPdfs([]);
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error("Upload PDFs error:", error);
      toast({ 
        title: "Error uploading PDFs", 
        description: error?.message || "Failed to upload PDFs. Please try again.",
        variant: "destructive"
      });
    }
  });

  const delLinkMut = useMutation({
    mutationFn: (linkId: string) => apiDeleteLink(linkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-links", folderId] });
      toast({ title: "Link deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Delete link error:", error);
      toast({ 
        title: "Error deleting link", 
        description: error?.message || "Failed to delete link. Please try again.",
        variant: "destructive"
      });
    }
  });

  const delTestMut = useMutation({
    mutationFn: (testId: string) => apiDeleteTest(testId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-tests", folderId] });
      toast({ title: "Test deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Delete test error:", error);
      toast({ 
        title: "Error deleting test", 
        description: error?.message || "Failed to delete test. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Enhanced quiz generation mutation - FIXED
  const genTestMut = useMutation({
    mutationFn: async (payload: {
      link_ids: string[];
      question_types: string[];
      difficulty: "easy" | "medium" | "hard" | "mixed";
      num_questions: number;
      test_name?: string;
      test_type?: "normal" | "comprehensive";
    }) => {
      // Use appropriate endpoint based on test type
      if (payload.test_type === "comprehensive") {
        return generateComprehensiveTestFromFolder(folderId, payload);
      } else {
        return apiGenerateTest(folderId, payload);
      }
    },
    onSuccess: (res) => {
      console.log("Test generation response:", res); // Debug log
      qc.invalidateQueries({ queryKey: ["folder-tests", folderId] });
      setShowGenModal(false);
      toast({ 
        title: "Quiz generated successfully!", 
        description: `Redirecting to take the quiz...`
      });
      
      // Navigate to take the quiz - FIXED: Use correct test_id field
      const testId = res.test_id || res.id; // Handle different response formats
      if (testId) {
        setTimeout(() => {
          nav(`/take-quiz/${testId}`);
        }, 1000);
      } else {
        console.error("No test_id found in response:", res);
        toast({ 
          title: "Navigation error", 
          description: "Quiz generated but couldn't navigate to it. Please refresh and try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("Generate test error:", error);
      toast({ 
        title: "Error generating quiz", 
        description: error?.message || "Failed to generate quiz. Please try again.",
        variant: "destructive"
      });
    }
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSelectAll = () => {
    if (!links?.length) return;
    if (selectAll) {
      setSelected([]);
      setSelectAll(false);
    } else {
      setSelected(links.map((l) => l.link_id));
      setSelectAll(true);
    }
  };

  const handleAddContent = () => {
    const urls = pasteLinks.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    
    if (urls.length === 0 && pdfs.length === 0) {
      toast({ 
        title: "No content to add", 
        description: "Please add URLs or select PDF files.",
        variant: "destructive"
      });
      return;
    }
    
    if (urls.length > 0) {
      addLinksMut.mutate(urls);
    }
    if (pdfs.length > 0) {
      uploadPdfsMut.mutate(pdfs);
    }
  };

  const openGenModal = () => {
    if (testType === "normal" && !selected.length) {
      toast({ 
        title: "Select content first", 
        description: "Please select at least one piece of content to generate a quiz, or use comprehensive mode.",
        variant: "destructive"
      });
      return;
    }
    setShowGenModal(true);
  };

  const submitGen = () => {
    const question_types = Object.entries(qTypes)
      .filter(([, v]) => v)
      .map(([k]) => k === 'tf' ? 'true_false' : k === 'short' ? 'short_answer' : k === 'long' ? 'long_answer' : k);
    
    if (question_types.length === 0) {
      toast({ 
        title: "Select question types", 
        description: "Please select at least one question type.",
        variant: "destructive"
      });
      return;
    }

    // For comprehensive tests, we don't need selected link_ids
    const link_ids = testType === "comprehensive" ? [] : selected;

    genTestMut.mutate({
      link_ids,
      question_types,
      difficulty,
      num_questions: numQuestions[0],
      test_name: quizName || undefined,
      test_type: testType,
    });
  };

  // Helper to format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "—";
    }
  };

  // Quiz preview calculations
  const quizPreview = useMemo(() => {
    const selectedTypes = Object.entries(qTypes)
      .filter(([, enabled]) => enabled)
      .map(([type, _]) => type.toUpperCase())
      .join(", ");
    
    const estimatedTime = Math.ceil(numQuestions[0] * (difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 3 : 2));
    
    return {
      questionTypes: selectedTypes,
      estimatedTime: timeLimit ? `${timeLimitValue} min (limit)` : `~${estimatedTime} min`,
      sourceType: testType === 'comprehensive' ? 'All folder content' : `${selected.length} selected items`
    };
  }, [qTypes, numQuestions, difficulty, timeLimit, timeLimitValue, testType, selected.length]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              Folder Details
            </h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={openGenModal} disabled={genTestMut.isPending}>
              <Zap className="h-4 w-4 mr-1" /> 
              {genTestMut.isPending ? "Generating..." : "Generate Quiz"}
            </Button>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Content
            </Button>
          </div>
        </div>

        {/* Error messages */}
        {(linksError || testsError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">
              {linksError ? `Error loading content: ${(linksError as any)?.message}` : ""}
              {testsError ? `Error loading tests: ${(testsError as any)?.message}` : ""}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="flex gap-2 px-3 py-2 border-b">
            <button
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "content" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              onClick={() => setActiveTab("content")}
            >
              Content ({links.length})
            </button>
            <button
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "tests" ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              onClick={() => setActiveTab("tests")}
            >
              Tests ({tests.length})
            </button>
          </div>

          {activeTab === "content" ? (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[40px,3fr,1fr,120px,80px] px-4 py-2 text-xs font-medium border-b bg-muted/30">
                <Checkbox checked={selectAll} onCheckedChange={onSelectAll} />
                <div>Item</div>
                <div>Source</div>
                <div>Date</div>
                <div>Actions</div>
              </div>

              {/* Links */}
              {linksLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="animate-pulse">Loading content...</div>
                </div>
              ) : links?.length ? (
                links.map((item) => (
                  <div
                    key={item.link_id}
                    className="grid grid-cols-[40px,3fr,1fr,120px,80px] px-4 py-3 border-b hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selected.includes(item.link_id)}
                      onCheckedChange={() => toggle(item.link_id)}
                    />
                    <div className="flex gap-2 items-center min-w-0">
                      <TypeTile type={item.link_type} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">
                          {item.display_name || item.title || item.url}
                        </div>
                        {item.content_preview && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {item.content_preview}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="truncate text-sm text-muted-foreground" title={item.url}>
                      {item.url}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => item.url && window.open(item.url, "_blank")}
                        disabled={!item.url || item.link_type === "pdf"}
                        title="View source"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => delLinkMut.mutate(item.link_id)}
                        disabled={delLinkMut.isPending}
                        title="Delete"
                      >
                        <Trash className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="mb-2">No content yet</div>
                  <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add your first content
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Tests Table header - UPDATED with new actions columns */}
              <div className="grid grid-cols-[40px,2fr,80px,100px,120px,120px] px-4 py-2 text-xs font-medium border-b bg-muted/30">
                <div></div>
                <div>Test Name</div>
                <div>Questions</div>
                <div>Type</div>
                <div>Date</div>
                <div>Actions</div>
              </div>

              {/* Tests - UPDATED with new action buttons */}
              {testsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="animate-pulse">Loading tests...</div>
                </div>
              ) : tests?.length ? (
                tests.map((t) => (
                  <div
                    key={t.test_id}
                    className="grid grid-cols-[40px,2fr,80px,100px,120px,120px] px-4 py-3 border-b hover:bg-muted/30 transition-colors"
                  >
                    <TestTile />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">{t.test_name}</div>
                      {t.estimated_time && (
                        <div className="text-xs text-muted-foreground">
                          ~{t.estimated_time} min
                        </div>
                      )}
                    </div>
                    <div className="text-sm">{t.num_questions}</div>
                    <div className="text-xs">
                      <Badge variant="outline" className="text-xs">
                        {t.test_type || 'normal'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(t.created_at)}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => nav(`/take-quiz/${t.test_id}`)}
                        title="Take test"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => nav(`/take-quiz/${t.test_id}`)}
                        title="Retake test"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => nav(`/test/${t.test_id}/submissions`)}
                        title="View results"
                      >
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => delTestMut.mutate(t.test_id)}
                        disabled={delTestMut.isPending}
                        title="Delete"
                      >
                        <Trash className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="mb-2">No tests yet</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={openGenModal}
                    disabled={!links.length}
                  >
                    <Zap className="h-4 w-4 mr-1" /> Generate your first test
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg p-6 w-[600px] max-w-[90vw] m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Content</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">URLs (one per line)</label>
                <textarea
                  value={pasteLinks}
                  onChange={(e) => setPasteLinks(e.target.value)}
                  placeholder="https://example.com&#10;https://youtube.com/watch?v=..."
                  className="w-full p-3 border rounded-md min-h-[100px] resize-vertical"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">PDF Files</label>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setPdfs(Array.from(e.target.files || []))}
                  className="w-full p-2 border rounded-md"
                />
                {pdfs.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {pdfs.length} file(s) selected
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddContent}
                disabled={addLinksMut.isPending || uploadPdfsMut.isPending}
              >
                {(addLinksMut.isPending || uploadPdfsMut.isPending) ? "Adding..." : "Add Content"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Generate Quiz Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg p-6 w-[800px] max-w-[95vw] m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Configure Quiz</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowGenModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-6">
              {/* Quiz Settings Panel */}
              <div className="w-80 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Quiz Name (optional)</Label>
                  <Input 
                    value={quizName} 
                    onChange={(e) => setQuizName(e.target.value)} 
                    placeholder="My Quiz" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">Test Type</Label>
                  <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (Selected Content)</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive (All Folder Content)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Questions</Label>
                    <span className="text-sm text-muted-foreground">{numQuestions[0]}</span>
                  </div>
                  <Slider
                    value={numQuestions}
                    onValueChange={setNumQuestions}
                    max={50}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Question Types</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries({
                      mcq: "Multiple Choice",
                      tf: "True/False", 
                      short: "Short Answer",
                      long: "Long Answer"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center space-x-2">
                        <Checkbox
                          checked={qTypes[key as keyof typeof qTypes]}
                          onCheckedChange={(checked) => 
                            setQTypes(prev => ({ ...prev, [key]: !!checked }))
                          }
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Difficulty</Label>
                    <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Time Limit</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={timeLimit}
                        onCheckedChange={(checked) => setTimeLimit(!!checked)}
                      />
                      {timeLimit && (
                        <div className="flex items-center gap-1">
                          <Input
                            value={timeLimitValue}
                            onChange={(e) => setTimeLimitValue(e.target.value)}
                            className="h-8 w-16 text-xs"
                            type="number"
                            min="5"
                            max="300"
                          />
                          <span className="text-xs">min</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={detailedTags}
                    onCheckedChange={(checked) => setDetailedTags(!!checked)}
                  />
                  <Label className="text-sm">Detailed Tags & Analytics</Label>
                </div>

                <div className="text-sm text-muted-foreground">
                  {testType === 'comprehensive' ? 'All folder content' : `Selected content: ${selected.length} items`}
                </div>
              </div>

              {/* Preview Area */}
              <div className="flex-1 space-y-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Quiz Preview</h4>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span>{numQuestions[0]} questions</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Types:</span>
                      <span>{quizPreview.questionTypes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Difficulty:</span>
                      <span className="capitalize">{difficulty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{quizPreview.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span>{quizPreview.sourceType}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Tips for Better Quizzes</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Mix question types for comprehensive assessment</li>
                    <li>• Use comprehensive mode to test all folder content</li>
                    <li>• Set appropriate time limits based on difficulty</li>
                    <li>• Enable detailed tags for better performance tracking</li>
                  </ul>
                </div>

                {testType === 'comprehensive' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-800">Comprehensive Test Mode</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      This will use all content from your folder to generate questions, 
                      providing detailed analytics and performance tracking.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowGenModal(false)}>
                Cancel
              </Button>
              <Button onClick={submitGen} disabled={genTestMut.isPending} className="min-w-32">
                {genTestMut.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Generating...
                  </div>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate & Start Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}