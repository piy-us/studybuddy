import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Folder, FileText, ClipboardList, BarChart3, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
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

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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
    loadFolders();
    loadChatHistory();
  }, []);

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

  const loadChatHistory = async () => {
    try {
      const history = await api.getChatHistory(sessionId);
      if (history.chat_history && Array.isArray(history.chat_history)) {
        const formattedMessages = history.chat_history.flatMap((entry: any, index: number) => [
          {
            id: `user-${index}`,
            type: 'user' as const,
            message: entry.user,
            timestamp: entry.timestamp || new Date().toISOString()
          },
          {
            id: `ai-${index}`,
            type: 'ai' as const,
            message: entry.ai,
            timestamp: entry.timestamp || new Date().toISOString(),
            context_type: entry.context_type
          }
        ]);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
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
    // Handle the "none" case for general assistance
    if (folderId === "none") {
      setSelectedFolder('');
      setContext(prev => ({
        selected_link_ids: [],
        selected_test_ids: [],
        selected_submission_ids: []
      }));
      setFolderContent(null);
    } else {
      setSelectedFolder(folderId);
      setContext(prev => ({
        folder_id: folderId,
        selected_link_ids: [],
        selected_test_ids: [],
        selected_submission_ids: []
      }));
    }
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Context Panel */}
      <div className={cn(
        "transition-all duration-300 border-r bg-card/50",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Context Selection</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Folder Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Folder</label>
              <Select value={selectedFolder || "none"} onValueChange={handleFolderChange} disabled={loadingFolders}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose folder for context..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General Assistance</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.folder_id} value={folder.folder_id}>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder.folder_name}
                        <Badge variant="outline" className="text-xs ml-auto">
                          {folder.link_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Context Summary */}
            {(selectedFolder || context.selected_link_ids.length > 0 || context.selected_test_ids.length > 0 || context.selected_submission_ids.length > 0) && (
              <div className="mt-3 p-2 bg-primary/10 rounded-md">
                <div className="text-xs font-medium text-primary mb-1">Active Context:</div>
                <div className="text-xs text-muted-foreground">{getContextSummary()}</div>
              </div>
            )}
          </div>

          {/* Content Selection */}
          {selectedFolder && folderContent && (
            <ScrollArea className="flex-1 p-4">
              <Tabs defaultValue="links" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="links" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Content ({folderContent.links.length})
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="text-xs">
                    <ClipboardList className="h-3 w-3 mr-1" />
                    Tests ({folderContent.tests.length})
                  </TabsTrigger>
                  <TabsTrigger value="results" className="text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Results ({folderContent.submissions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="links" className="space-y-3">
                  {folderContent.links.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No content sources in this folder</p>
                    </div>
                  ) : (
                    folderContent.links.map((link) => (
                      <Card key={link.link_id} className="p-3">
                        <div className="flex items-start space-x-2">
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
                              className="text-sm font-medium cursor-pointer block"
                            >
                              {link.display_name}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {link.content_preview}
                            </p>
                            <div className="flex gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {link.link_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {new Date(link.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="tests" className="space-y-3">
                  {folderContent.tests.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tests in this folder</p>
                    </div>
                  ) : (
                    folderContent.tests.map((test) => (
                      <Card key={test.test_id} className="p-3">
                        <div className="flex items-start space-x-2">
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
                              className="text-sm font-medium cursor-pointer block"
                            >
                              {test.test_name}
                            </label>
                            <div className="flex gap-1 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {test.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {test.num_questions} questions
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {test.test_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {test.question_types.join(', ')}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="results" className="space-y-3">
                  {folderContent.submissions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No test results in this folder</p>
                    </div>
                  ) : (
                    folderContent.submissions.map((submission) => (
                      <Card key={submission.submission_id} className="p-3">
                        <div className="flex items-start space-x-2">
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
                              className="text-sm font-medium cursor-pointer block"
                            >
                              {submission.test_name}
                            </label>
                            <div className="flex gap-1 mt-2">
                              <Badge 
                                variant={submission.average_score >= 80 ? "default" : submission.average_score >= 60 ? "secondary" : "destructive"} 
                                className="text-xs"
                              >
                                Score: {submission.average_score}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {submission.num_questions} questions answered
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}

          {loadingContent && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading folder content...</p>
              </div>
            </div>
          )}

          {selectedFolder && !folderContent && !loadingContent && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No content available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="border-b p-4 bg-card/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Context
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  AI Learning Assistant
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {getContextSummary()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadChatHistory}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <MessageCircle className="h-16 w-16 mx-auto mb-6 opacity-40" />
                <h3 className="text-lg font-medium mb-2">Welcome to your AI Learning Assistant!</h3>
                <p className="text-sm mb-4 max-w-md mx-auto">
                  {selectedFolder 
                    ? "I'm ready to help you with your selected content, tests, and results. What would you like to know?"
                    : "Select a folder and content from the sidebar for context-aware assistance, or ask me any general questions about learning and studying."
                  }
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Badge variant="outline" className="text-xs">Content Analysis</Badge>
                  <Badge variant="outline" className="text-xs">Test Review</Badge>
                  <Badge variant="outline" className="text-xs">Performance Insights</Badge>
                  <Badge variant="outline" className="text-xs">Study Guidance</Badge>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 max-w-4xl",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-3",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-card border'
                  )}
                >
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: message.message }} 
                  />
                  <div className={cn(
                    "text-xs opacity-70 mt-2 flex items-center justify-between",
                    message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {message.context_type && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {message.context_type.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-card/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about your content, tests, performance, or general study questions..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="min-h-[44px] pr-12 resize-none"
                />
                {inputMessage.trim() && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Press Enter to send
                  </div>
                )}
              </div>
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isLoading}
                size="lg"
                className="h-[44px] px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}