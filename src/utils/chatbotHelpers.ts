// src/utils/chatbotHelpers.ts
import { useChatbot } from '@/hooks/useChatbotIntegration';

// Helper function to open chatbot with folder context
export function useFolderChatbot() {
  const { openChatbot, updateContext } = useChatbot();

  const openWithFolder = (folderId: string) => {
    openChatbot({ folderId });
  };

  const openWithContent = (folderId: string, linkIds: string[] = []) => {
    openChatbot({ 
      folderId, 
      selectedLinkIds: linkIds 
    });
  };

  const openWithTest = (folderId: string, testIds: string[] = []) => {
    openChatbot({ 
      folderId, 
      selectedTestIds: testIds 
    });
  };

  const openWithResults = (folderId: string, submissionIds: string[] = []) => {
    openChatbot({ 
      folderId, 
      selectedSubmissionIds: submissionIds 
    });
  };

  return {
    openWithFolder,
    openWithContent,
    openWithTest,
    openWithResults,
    updateContext
  };
}

// Context builders for different scenarios
export const ChatbotContextBuilders = {
  // For folder pages
  folder: (folderId: string) => ({ folderId }),
  
  // For content analysis
  content: (folderId: string, linkIds: string[]) => ({ 
    folderId, 
    selectedLinkIds: linkIds 
  }),
  
  // For test analysis
  test: (folderId: string, testIds: string[]) => ({ 
    folderId, 
    selectedTestIds: testIds 
  }),
  
  // For performance analysis
  results: (folderId: string, submissionIds: string[]) => ({ 
    folderId, 
    selectedSubmissionIds: submissionIds 
  }),
  
  // For comprehensive analysis
  comprehensive: (folderId: string, linkIds: string[], testIds: string[], submissionIds: string[]) => ({
    folderId,
    selectedLinkIds: linkIds,
    selectedTestIds: testIds,
    selectedSubmissionIds: submissionIds
  })
};

// Chat button component for integration
export function ChatButton({ 
  context, 
  variant = 'default', 
  size = 'sm', 
  children = 'Ask AI' 
}: {
  context?: any;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  children?: React.ReactNode;
}) {
  const { openChatbot } = useChatbot();

  return (
    <button
      onClick={() => openChatbot(context)}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors
        ${size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-10 px-6 text-sm' : 'h-9 px-4 text-sm'}
        ${variant === 'outline' ? 'border border-input bg-background hover:bg-accent' : 
          variant === 'ghost' ? 'hover:bg-accent' : 
          'bg-primary text-primary-foreground hover:bg-primary/90'}`}
    >
      <MessageCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {children}
    </button>
  );
}