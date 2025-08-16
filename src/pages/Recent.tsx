import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  Search, 
  Play,
  Eye,
  MoreHorizontal,
  FolderOpen,
  FileText,
  Zap
} from "lucide-react";

const recentItems = [
  {
    id: 1,
    type: "quiz",
    name: "Neural Networks Basics",
    folder: "ML Notes",
    score: 85,
    date: "2 hours ago",
    status: "completed",
    icon: Zap
  },
  {
    id: 2,
    type: "folder",
    name: "Physics Notes",
    docCount: 8,
    date: "4 hours ago",
    status: "accessed",
    icon: FolderOpen
  },
  {
    id: 3,
    type: "quiz",
    name: "Physics Laws Test",
    folder: "Physics",
    score: 92,
    date: "Yesterday",
    status: "completed",
    icon: Zap
  },
  {
    id: 4,
    type: "document",
    name: "Quantum Mechanics.pdf",
    folder: "Physics Notes",
    size: "2.4 MB",
    date: "Yesterday",
    status: "uploaded",
    icon: FileText
  },
  {
    id: 5,
    type: "quiz",
    name: "World War II Quiz",
    folder: "History",
    score: 78,
    date: "2 days ago",
    status: "completed",
    icon: Zap
  },
  {
    id: 6,
    type: "folder",
    name: "Mathematics",
    docCount: 6,
    date: "3 days ago",
    status: "accessed",
    icon: FolderOpen
  },
  {
    id: 7,
    type: "quiz",
    name: "Calculus Practice",
    folder: "Math",
    score: null,
    date: "3 days ago",
    status: "draft",
    icon: Zap
  },
  {
    id: 8,
    type: "document",
    name: "Linear Algebra Notes.pdf",
    folder: "Mathematics",
    size: "1.8 MB",
    date: "4 days ago",
    status: "uploaded",
    icon: FileText
  }
];

export default function Recent() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              Recent Activity
            </h1>
            <p className="text-sm text-muted-foreground">
              Quick access to your latest quizzes, folders, and documents
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recent items..."
                className="h-9 pl-8 w-64"
              />
            </div>
          </div>
        </div>

        {/* Recent Items Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[40px,3fr,1fr,120px,100px,80px] gap-4 px-4 py-3 bg-background-secondary border-b border-card-border text-xs font-medium text-muted-foreground">
            <div></div>
            <div>Item</div>
            <div>Location</div>
            <div>Status</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-card-border">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[40px,3fr,1fr,120px,100px,80px] gap-4 px-4 py-3 hover:bg-background-secondary/50 transition-colors"
              >
                {/* Icon */}
                <div className="flex items-center">
                  <div className={`
                    h-8 w-8 rounded-md flex items-center justify-center
                    ${item.type === 'quiz' ? 'bg-primary/10 text-primary' : 
                      item.type === 'folder' ? 'bg-warning/10 text-warning' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>

                {/* Item Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      {item.type === 'quiz' && item.status === 'draft' && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.type === 'quiz' && item.score !== null && (
                        <span className={`font-medium ${
                          item.score >= 90 ? 'text-success' : 
                          item.score >= 70 ? 'text-primary' : 'text-warning'
                        }`}>
                          Score: {item.score}%
                        </span>
                      )}
                      {item.type === 'folder' && (
                        <span>{item.docCount} documents</span>
                      )}
                      {item.type === 'document' && (
                        <span>{item.size}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground truncate">
                    {item.type === 'quiz' && `📚 ${item.folder}`}
                    {item.type === 'document' && `📁 ${item.folder}`}
                    {item.type === 'folder' && 'Root'}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <Badge 
                    variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'draft' ? 'secondary' :
                      item.status === 'accessed' ? 'outline' : 'secondary'
                    }
                    className="text-xs capitalize"
                  >
                    {item.status}
                  </Badge>
                </div>

                {/* Date */}
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {item.type === 'quiz' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title={item.status === 'draft' ? 'Continue editing' : 'Take again'}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
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
        </div>
      </div>
    </AppLayout>
  );
}