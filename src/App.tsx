// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Layout and chatbot
import { AppLayout } from './components/layout/AppLayout';
import { ContextAwareChatbot } from './components/ContextAwareChatbot';
import { ChatbotFAB } from './components/ChatbotFAB';
import { useChatbot } from './hooks/useChatbotIntegration';
import { ChatPage } from './pages/ChatPage';

// Your existing pages
import Index from "@/pages/Index";
import Folders from "@/pages/Folders";
import FolderDetailsPage from "@/pages/FolderDetails";
import Recent from "@/pages/Recent";
import Quiz from "@/pages/Quiz";
import TakeQuiz from "@/pages/TakeQuiz";
import NotFound from "@/pages/NotFound";
import QuizResults from '@/pages/QuizResults';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const { isOpen, openChatbot, closeChatbot, initialContext } = useChatbot();
  
  // Don't show FAB on the chat page
  const shouldShowFAB = location.pathname !== '/chat';

  return (
    <AppLayout currentPath={location.pathname}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/folders" element={<Folders />} />
        <Route path="/folders/:folderId" element={<FolderDetailsPage />} />
        <Route path="/recent" element={<Recent />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/take-quiz/:testId" element={<TakeQuiz />} />
        <Route path="/quiz-results/:submissionId" element={<QuizResults />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Floating Action Button for Chatbot */}
      {shouldShowFAB && !isOpen && (
        <ChatbotFAB onClick={() => openChatbot()} />
      )}

      {/* Context-Aware Chatbot Widget */}
      {isOpen && shouldShowFAB && (
        <ContextAwareChatbot
          isVisible={isOpen}
          onClose={closeChatbot}
          initialContext={initialContext}
        />
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <AppContent />
          </Router>

          <Toaster />
          <Sonner />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}