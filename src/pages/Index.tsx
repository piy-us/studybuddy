import { AppLayout } from "@/components/layout/AppLayout";
import { QuizGenerator } from "@/components/dashboard/QuizGenerator";
import { RecentFolders } from "@/components/dashboard/RecentFolders";
import { RecentQuizzes } from "@/components/dashboard/RecentQuizzes";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { FloatingChatWidget } from "@/components/chat/FloatingChatWidget";

const Index = () => {
  return (
    <AppLayout>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Generate quizzes, manage your study materials, and track your progress
          </p>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Quiz Generator */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <QuizGenerator />
          </div>

          {/* Right Column - Recent Items */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6 order-1 lg:order-2">
            <RecentFolders />
            <RecentQuizzes />
          </div>
        </div>
      </div>
      
      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </AppLayout>
  );
};

export default Index;
