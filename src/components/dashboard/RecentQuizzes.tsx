import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, MoreHorizontal } from "lucide-react";
import { getAllQuizzes } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

export function RecentQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadQuizzes() {
      try {
        const data = await getAllQuizzes();
        if (!mounted) return;

        // map backend data to UI shape
        const mapped = data.map((q: any) => ({
          id: q.quiz_id,
          name: q.title || "Untitled Quiz",
          score: q.score ?? null,
          date: q.created_at ? new Date(q.created_at).toLocaleDateString() : "-",
          folder: q.folder_name || "Uncategorized",
          questions: q.question_count ?? 0,
          status: q.status || (q.completed ? "completed" : "draft"),
        }));

        setQuizzes(mapped);
      } catch (err) {
        console.error("Failed to load quizzes:", err);
        toast({
          title: "Error",
          description: "Could not load recent quizzes.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadQuizzes();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Quizzes</h3>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          View All
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr,80px,100px,120px,80px] gap-4 px-4 py-2 bg-background-secondary border-b border-card-border text-xs font-medium text-muted-foreground">
          <div>Name</div>
          <div>Score</div>
          <div>Date</div>
          <div>Folder</div>
          <div>Actions</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No quizzes found.</div>
        ) : (
          <div className="divide-y divide-card-border">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="grid grid-cols-[2fr,80px,100px,120px,80px] gap-4 px-4 py-3 hover:bg-background-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {quiz.name}
                  </span>
                  {quiz.status === "draft" && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Draft
                    </Badge>
                  )}
                </div>

                <div className="flex items-center">
                  {quiz.score !== null ? (
                    <span
                      className={`text-sm font-medium ${
                        quiz.score >= 90
                          ? "text-success"
                          : quiz.score >= 70
                          ? "text-primary"
                          : "text-warning"
                      }`}
                    >
                      {quiz.score}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>

                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">{quiz.date}</span>
                </div>

                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground truncate">
                    📚 {quiz.folder}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title={quiz.status === "draft" ? "Continue editing" : "Take again"}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="View details"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="More options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
