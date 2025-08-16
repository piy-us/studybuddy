// src/pages/Folders.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Search,
  FolderOpen,
  Plus,
  Check,
  X,
  MoreHorizontal,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getFolders, createFolder } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type Folder = {
  folder_id: string;
  folder_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  link_count: number;
};

export default function Folders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const navigate = useNavigate();

  // Load folders
  useEffect(() => {
    (async () => {
      try {
        const data = await getFolders();
        setFolders(data);
      } catch (err) {
        console.error("Failed to load folders", err);
      }
    })();
  }, []);

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await createFolder({ folder_name: newFolderName });
      const newFolder: Folder = {
        folder_id: res.folder_id,
        folder_name: newFolderName,
        description: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        link_count: 0,
      };
      setFolders((prev) => [newFolder, ...prev]);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err) {
      console.error("Error creating folder", err);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="h-12 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Folders</h1>
            {!showNewFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFolder(true)}
                className="h-8 px-2 text-sm"
              >
                <Plus className="h-4 w-4 mr-1" /> New Folder
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="h-8 pl-8 w-48" />
          </div>
        </div>

        {/* New Folder Input */}
        {showNewFolder && (
          <div className="h-10 flex items-center gap-2 px-4 bg-muted/30 rounded-lg">
            <FolderOpen className="h-4 w-4 text-primary" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="h-8 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateFolder}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}

        {/* Folder Grid */}
        <div className="grid grid-cols-6 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.folder_id}
              onClick={() => navigate(`/folders/${folder.folder_id}`)}
              className="w-45 h-25 bg-card border border-card-border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group hover:border-primary/30"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-base">📚</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm truncate">
                  {folder.folder_name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{folder.link_count} docs</span>
                  <span>•</span>
                  <span>{new Date(folder.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Folder Card */}
          <div
            className="w-45 h-25 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group"
            onClick={() => setShowNewFolder(true)}
          >
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary mb-1" />
            <span className="text-xs text-muted-foreground group-hover:text-primary font-medium">
              Create New Folder
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
