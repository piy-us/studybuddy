import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { getAllFolders } from "@/lib/api"; // We'll add this new helper
import { useToast } from "@/components/ui/use-toast";

interface Folder {
  id: string | number;
  name: string;
  icon?: string;
  docCount?: number;
  lastAccessed?: string;
}

export function RecentFolders() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all folders directly
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const data = await getAllFolders();
        if (isMounted) {
          const mapped = data.map((f: any) => ({
            id: f.folder_id,
            name: f.folder_name,
            icon: "📚",
            docCount: f.link_count ?? 0,
            lastAccessed: "", // backend doesn’t send this yet
          }));
          setFolders(mapped);
        }
      } catch (err) {
        console.error("Failed to load folders:", err);
        toast({
          title: "Error",
          description: "Could not load folders.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs touch-manipulation"
          onClick={() => window.location.href = "/folders"}
        >
          View All
        </Button>
      </div>

      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
        {!loading && folders.length === 0 && (
          <span className="text-xs text-muted-foreground">No folders found</span>
        )}

        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => window.location.href = `/folders/${folder.id}`}
            className="flex-shrink-0 w-28 md:w-30 h-18 md:h-20 bg-card border border-card-border rounded-lg p-2 md:p-3 hover:shadow-md transition-smooth cursor-pointer group touch-manipulation"
          >
            <div className="flex items-start justify-between mb-1 md:mb-2">
              <span className="text-sm md:text-base">{folder.icon}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-smooth md:transition-opacity touch-manipulation"
              >
                <FolderOpen className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-foreground truncate">{folder.name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {folder.docCount} docs {folder.lastAccessed && `• ${folder.lastAccessed}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
