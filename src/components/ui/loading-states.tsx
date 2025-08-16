import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Dashboard Loading State
export function DashboardLoading() {
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 md:h-8 w-32 md:w-40" />
        <Skeleton className="h-4 w-80 hidden sm:block" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-card-border rounded-lg p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-5 md:h-6 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Quiz Generator */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="w-full bg-card border border-card-border rounded-lg p-3 md:p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>

        {/* Recent Items */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6 order-1 lg:order-2">
          {/* Recent Folders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex gap-2 md:gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="flex-shrink-0 w-28 md:w-30 h-18 md:h-20" />
              ))}
            </div>
          </div>

          {/* Recent Quizzes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2 h-9">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-1 ml-auto">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quiz Taking Loading State
export function QuizLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-10 bg-card border-b border-card-border p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-2 w-48" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          <Skeleton className="h-6 md:h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border border-card-border rounded-lg">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Folders Page Loading State
export function FoldersLoading() {
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 md:h-8 w-24" />
          <Skeleton className="h-4 w-64 hidden sm:block" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-9 flex-1 max-w-80" />
        <Skeleton className="h-9 w-20" />
      </div>

      {/* Folder Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-25" />
        ))}
      </div>
    </div>
  );
}

// Chat Loading State  
export function ChatLoading() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b border-card-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(
            "flex gap-3",
            i % 2 === 0 ? "justify-start" : "justify-end"
          )}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            <div className="max-w-[70%] space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-card-border p-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

// Generic Page Loading
export function PageLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
      <div className="text-center space-y-4">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}