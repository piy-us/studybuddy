import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Settings, Folder, FileText, ClipboardList, BarChart3, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
  context_type?: string;
}

interface ChatContext {
  folder_id?: string;
  selected_link_ids: string[];
  selected_test_ids: string[];
  selected_submission_ids: string[];
}

interface ContextAwareChatbotProps {
  isVisible: boolean;
  onClose: () => void;
  initialContext?: {
    folderId?: string;
    selectedLinkIds?: string[];
    selectedTestIds?: string[];
    selectedSubmissionIds?: string[];
  };
}

interface FolderContent {
  folder: {
    folder_id: string;
    name: string;
    description: string;
  };
  links: Array<{
    link_id: string;
    title: string;
    custom_name: string;
    display_name: string;
    link_type: string;
    content_preview: string;
    created_at: string;
  }>;
  tests: Array<{
    test_id: string;
    test_name: string;
    difficulty: string;
    num_questions: number;
    question_types: string[];
    tags: string[];
    test_type: string;
    created_at: string;
  }>;
  submissions: Array<{
    submission_id: string;
    test_id: string;
    test_name: string;
    submitted_at: string;
    average_score: number;
    num_questions: number;
  }>;
}

export function ContextAwareChatbot({ isVisible, onClose, initialContext }: ContextAwareChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Context state
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folderContent, setFolderContent] = useState<FolderContent | null>(null);
  const [context, setContext] = useState<ChatContext>({
    selected_link_ids: [],
    selected_test_ids: [],
    selected_submission_ids: []
  });
  
  // UI state
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load folders on mount
  useEffect(() => {
    if (isVisible) {
      loadFolders();
      // Apply initial context if provided
      if (initialContext?.folderId) {
        setSelectedFolder(initialContext.folderId);
        setContext({
          folder_id: initialContext.folderId,
          selected_link_ids: initialContext.selectedLinkIds || [],
          selected_test_ids: initialContext.selectedTestIds || [],
          selected_submission_ids: initialContext.selectedSubmissionIds || []
        });
      }
    }
  }, [isVisible, initialContext]);

  // Load folder content when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFolderContent(selectedFolder);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    setLoadingFolders(true);
    try {
      const response = await api.getFolders();
      setFolders(response);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const loadFolderContent = async (folderId: string) => {
    setLoadingContent(true);
    try {
      const content = await api.getFolderAvailableContent(folderId);
      setFolderContent(content);
    } catch (error) {
      console.error('Error loading folder content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const initializeChat = async () => {
    try {
      await api.initializeChat(context, sessionId);
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const updateChatContext = async (newContext: ChatContext) => {
    try {
      await api.updateChatContext(newContext, sessionId);
      setContext(newContext);
    } catch (error) {
      console.error('Error updating chat context:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Initialize or update context before sending message
      if (Object.keys(context).length > 0) {
        await updateChatContext(context);
      }

      const response = await api.sendChatMessage(userMessage.message, undefined, sessionId);
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        message: response.response,
        timestamp: response.timestamp,
        context_type: response.context_type
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await api.clearChatHistory(sessionId);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolder(folderId);
    setContext(prev => ({
      folder_id: folderId,
      selected_link_ids: [],
      selected_test_ids: [],
      selected_submission_ids: []
    }));
  };

  const handleContentSelection = (type: 'links' | 'tests' | 'submissions', id: string, checked: boolean) => {
    setContext(prev => {
      const key = `selected_${type.slice(0, -1)}_ids` as keyof ChatContext;
      const currentIds = prev[key] as string[];
      
      let newIds: string[];
      if (checked) {
        newIds = [...currentIds, id];
      } else {
        newIds = currentIds.filter(existingId => existingId !== id);
      }

      return {
        ...prev,
        [key]: newIds
      };
    });
  };

  const getContextSummary = () => {
    const totalSelected = context.selected_link_ids.length + 
                         context.selected_test_ids.length + 
                         context.selected_submission_ids.length;
    
    if (totalSelected === 0 && !selectedFolder) {
      return 'General AI assistance';
    }

    const parts = [];
    if (selectedFolder && folderContent) {
      parts.push(folderContent.folder.name);
    }
    if (context.selected_link_ids.length > 0) {
      parts.push(`${context.selected_link_ids.length} content source${context.selected_link_ids.length > 1 ? 's' : ''}`);
    }
    if (context.selected_test_ids.length > 0) {
      parts.push(`${context.selected_test_ids.length} test${context.selected_test_ids.length > 1 ? 's' : ''}`);
    }
    if (context.selected_submission_ids.length > 0) {
      parts.push(`${context.selected_submission_ids.length} result${context.selected_submission_ids.length > 1 ? 's' : ''}`);
    }

    return parts.join(' • ');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Learning Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextPanel(!showContextPanel)}
                className="text-xs"
              >
                <Settings className="h-4 w-4 mr-1" />
                Context
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Context Summary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getContextSummary()}
            </Badge>
          </div>
        </CardHeader>

        <div className="flex-1 flex min-h-0">
          {/* Context Panel */}
          {showContextPanel && (
            <div className="w-80 border-r bg-muted/30 flex flex-col">
              <div className="p-3 border-b">
                <h3 className="font-medium text-sm mb-3">Context Selection</h3>
                
                {/* Folder Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Select Folder</label>
                  <Select value={selectedFolder} onValueChange={handleFolderChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Choose folder..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General Assistance</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.folder_id} value={folder.folder_id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            {folder.folder_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Content Selection */}
              {selectedFolder && folderContent && (
                <ScrollArea className="flex-1 p-3">
                  <Tabs defaultValue="links" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-3">
                      <TabsTrigger value="links" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Content
                      </TabsTrigger>
                      <TabsTrigger value="tests" className="text-xs">
                        <ClipboardList className="h-3 w-3 mr-1" />
                        Tests
                      </TabsTrigger>
                      <TabsTrigger value="results" className="text-xs">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Results
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="links" className="space-y-2">
                      {folderContent.links.map((link) => (
                        <div key={link.link_id} className="flex items-start space-x-2">
                          <Checkbox
                            id={link.link_id}
                            checked={context.selected_link_ids.includes(link.link_id)}
                            onCheckedChange={(checked) => 
                              handleContentSelection('links', link.link_id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={link.link_id}
                              className="text-xs font-medium cursor-pointer"
                            >
                              {link.display_name}
                            </label>
                            <p className="text-xs text-muted-foreground truncate">
                              {link.content_preview}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {link.link_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="tests" className="space-y-2">
                      {folderContent.tests.map((test) => (
                        <div key={test.test_id} className="flex items-start space-x-2">
                          <Checkbox
                            id={test.test_id}
                            checked={context.selected_test_ids.includes(test.test_id)}
                            onCheckedChange={(checked) => 
                              handleContentSelection('tests', test.test_id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={test.test_id}
                              className="text-xs font-medium cursor-pointer"
                            >
                              {test.test_name}
                            </label>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {test.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {test.num_questions} questions
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="results" className="space-y-2">
                      {folderContent.submissions.map((submission) => (
                        <div key={submission.submission_id} className="flex items-start space-x-2">
                          <Checkbox
                            id={submission.submission_id}
                            checked={context.selected_submission_ids.includes(submission.submission_id)}
                            onCheckedChange={(checked) => 
                              handleContentSelection('submissions', submission.submission_id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={submission.submission_id}
                              className="text-xs font-medium cursor-pointer"
                            >
                              {submission.test_name}
                            </label>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Score: {submission.average_score}%
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              )}

              {loadingContent && (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      {selectedFolder 
                        ? "Ask me anything about your selected content, tests, or results!"
                        : "Hi! I'm your AI learning assistant. Select a folder and content for context-aware help, or ask me any general questions."
                      }
                    </p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <div dangerouslySetInnerHTML={{ __html: message.message }} />
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about your content, tests, or general questions..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}