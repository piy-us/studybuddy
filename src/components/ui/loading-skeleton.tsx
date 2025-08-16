import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Folder Card Skeleton (180px x 100px)
export function FolderCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-45 h-25 bg-card border border-card-border rounded-lg p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1 rounded" />
      </div>
      <Skeleton className="h-3 w-20 mb-3 rounded" />
      <div className="flex gap-1">
        <Skeleton className="h-6 w-12 rounded" />
        <Skeleton className="h-6 w-12 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border border-card-border rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-6 w-12 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
  );
}

// Quiz List Skeleton (Table rows)
export function QuizListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-2 h-9">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <div className="flex gap-1 ml-auto">
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat Message Skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-2 p-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />}
      <div className={cn("max-w-[70%] space-y-1", isUser ? "items-end" : "items-start")}>
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    </div>
  );
}

// Link Item Skeleton (Table row)
export function LinkItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 h-9 border-b border-card-border">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-40 rounded" />
      <Skeleton className="h-4 w-48 rounded" />
      <div className="flex gap-1 ml-auto">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}

// Quiz Generation Progress
export function QuizGenerationSkeleton() {
  return (
    <div className="w-100 h-55 bg-card border border-card-border rounded-lg p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <div className="bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full w-1/3 animate-pulse" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-8 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        </div>
        
        <Skeleton className="h-10 w-full rounded" />
      </div>
    </div>
  );
}