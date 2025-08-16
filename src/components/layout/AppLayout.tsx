import React from 'react';
import { Header } from "./Header";
import { ContextAwareChatbot } from '@/components/ContextAwareChatbot';
import { ChatbotFAB } from '@/components/ChatbotFAB';
import { useChatbot } from '@/hooks/useChatbotIntegration';
import { cn } from "@/lib/utils";
 
interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string; // Optional prop to determine current route
}

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  const { isOpen, openChatbot, closeChatbot, initialContext } = useChatbot();

  // Don't show FAB on the dedicated chat page
  const shouldShowFAB = currentPath !== '/chat';

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Fixed topbar */}
      <Header />

      {/* Main content area */}
      <main
        className={cn(
          "flex-1 overflow-auto transition-smooth min-h-0",
          "pt-10" // accounts for fixed header height
        )}
      >
        <div className="h-full overflow-auto">
          {children}
        </div>
      </main>

      {/* Floating Action Button for Chatbot - only show when chatbot is closed and not on chat page */}
      {!isOpen && shouldShowFAB && (
        <ChatbotFAB onClick={() => openChatbot()} />
      )}

      {/* Context-Aware Chatbot Widget - only show when not on dedicated chat page */}
      {isOpen && shouldShowFAB && (
        <ContextAwareChatbot
          isVisible={isOpen}
          onClose={closeChatbot}
          initialContext={initialContext}
        />
      )}
    </div>
  );
}