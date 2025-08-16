// src/hooks/useChatbotIntegration.ts
import { useState, useCallback } from 'react';

interface ChatbotContext {
  folderId?: string;
  selectedLinkIds?: string[];
  selectedTestIds?: string[];
  selectedSubmissionIds?: string[];
}

interface UseChatbotReturn {
  isOpen: boolean;
  initialContext: ChatbotContext | undefined;
  openChatbot: (context?: ChatbotContext) => void;
  closeChatbot: () => void;
  updateContext: (context: ChatbotContext) => void;
}

export function useChatbot(): UseChatbotReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [initialContext, setInitialContext] = useState<ChatbotContext | undefined>();

  const openChatbot = useCallback((context?: ChatbotContext) => {
    if (context) {
      setInitialContext(context);
    }
    setIsOpen(true);
  }, []);

  const closeChatbot = useCallback(() => {
    setIsOpen(false);
    // Don't clear context immediately to allow smooth reopening
    setTimeout(() => {
      if (!isOpen) {
        setInitialContext(undefined);
      }
    }, 300);
  }, [isOpen]);

  const updateContext = useCallback((context: ChatbotContext) => {
    setInitialContext(context);
  }, []);

  return {
    isOpen,
    initialContext,
    openChatbot,
    closeChatbot,
    updateContext
  };
}