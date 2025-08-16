import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  Bot,
  User,
  FolderOpen,
  FileText,
  Zap,
  Lightbulb,
  BookOpen,
  Target,
  Minimize2,
  X,
  ChevronDown,
  Maximize2,
  HelpCircle,
  GraduationCap,
  PlusCircle,
  BarChart3,
  RefreshCw,
  Brain
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const contexts = [
  { id: "general", name: "General Study Help", icon: "🌐", type: "general" },
  { id: "ml", name: "ML Notes", icon: "📚", type: "folder", docCount: 12 },
  { id: "physics", name: "Physics Notes", icon: "📚", type: "folder", docCount: 8 },
  { id: "history", name: "History Notes", icon: "📚", type: "folder", docCount: 15 },
  { id: "recent-quiz", name: "Neural Networks Quiz (85%)", icon: "📝", type: "quiz" },
  { id: "physics-quiz", name: "Physics Test (92%)", icon: "📝", type: "quiz" }
];

const messages = [
  {
    id: 1,
    type: "ai",
    content: "Hi! I'm your AI study buddy. I can help you understand concepts, generate practice questions, or explain topics from your study materials. What would you like to work on today?",
    timestamp: "10:30 AM"
  },
  {
    id: 2,
    type: "user",
    content: "Can you explain activation functions in neural networks?",
    timestamp: "10:32 AM"
  },
  {
    id: 3,
    type: "ai",
    content: "Based on your ML Notes folder, activation functions are mathematical functions that determine the output of a neural network node. They introduce non-linearity into the network, which is crucial for learning complex patterns.\n\nKey types from your materials:\n• **ReLU** (Rectified Linear Unit): f(x) = max(0, x)\n• **Sigmoid**: f(x) = 1/(1 + e^(-x))\n• **Tanh**: f(x) = (e^x - e^(-x))/(e^x + e^(-x))\n\nWould you like me to create practice questions on this topic?",
    timestamp: "10:32 AM",
    context: "📚 ML Notes"
  }
];

// Context-specific quick actions
const getQuickActions = (contextType: string) => {
  switch (contextType) {
    case 'general':
      return [
        { label: "Help", icon: HelpCircle, variant: "outline" as const },
        { label: "Study Tips", icon: GraduationCap, variant: "outline" as const },
        { label: "Create Quiz", icon: PlusCircle, variant: "outline" as const }
      ];
    case 'folder':
      return [
        { label: "Explain", icon: Lightbulb, variant: "outline" as const },
        { label: "Quiz Me", icon: Zap, variant: "outline" as const },
        { label: "Summarize", icon: BookOpen, variant: "outline" as const },
        { label: "Key Points", icon: Target, variant: "outline" as const }
      ];
    case 'quiz':
      return [
        { label: "Explain Wrong", icon: Target, variant: "outline" as const },
        { label: "Practice More", icon: RefreshCw, variant: "outline" as const },
        { label: "Concept Review", icon: Brain, variant: "outline" as const }
      ];
    default:
      return [
        { label: "Explain", icon: Lightbulb, variant: "outline" as const },
        { label: "Quiz Me", icon: Zap, variant: "outline" as const },
        { label: "Summarize", icon: BookOpen, variant: "outline" as const },
        { label: "Key Points", icon: Target, variant: "outline" as const }
      ];
  }
};

const promptSuggestions = [
  "Explain this concept in simple terms",
  "Give me practice questions on...", 
  "What are the main points?",
  "How does this relate to other topics?"
];

// Auto-context detection based on route
const getAutoContext = (pathname: string) => {
  if (pathname.includes('/folders')) return 'ml';
  if (pathname.includes('/quiz')) return 'recent-quiz';
  if (pathname.includes('/take-quiz')) return 'recent-quiz';
  return 'general';
};

export default function Chat() {
  const location = useLocation();
  const [selectedContext, setSelectedContext] = useState("ml");
  const [message, setMessage] = useState("");
  const [isFloating, setIsFloating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const selectedContextData = contexts.find(c => c.id === selectedContext);
  const currentQuickActions = getQuickActions(selectedContextData?.type || 'general');

  // Auto-context switching based on current page
  useEffect(() => {
    const autoContext = getAutoContext(location.pathname);
    if (autoContext !== selectedContext) {
      setSelectedContext(autoContext);
    }
  }, [location.pathname]);

  // Toggle floating mode
  const toggleFloating = () => {
    setIsFloating(!isFloating);
  };

  if (isFloating) {
    return (
      <div className={`fixed bottom-6 right-6 w-80 h-112 bg-card border border-card-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden transition-all ${
        isMinimized ? 'h-12' : 'h-112'
      }`}>
        {/* Floating Header */}
        <div className="h-12 px-4 bg-primary text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="font-medium text-sm">Study Buddy</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-1 hover:bg-primary-variant/20 text-primary-foreground"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-1 hover:bg-primary-variant/20 text-primary-foreground"
              onClick={toggleFloating}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Context Selector */}
            <div className="h-8 px-3 bg-background-secondary border-b border-card-border flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Context:</span>
              <Select value={selectedContext} onValueChange={setSelectedContext}>
                <SelectTrigger className="h-6 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">📚 Current Folder</div>
                  {contexts.filter(c => c.type === 'folder').map((context) => (
                    <SelectItem key={context.id} value={context.id} className="text-xs pl-4">
                      <div className="flex items-center gap-2">
                        <span>{context.icon}</span>
                        <span>{context.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-t border-border">📝 Recent Tests</div>
                  {contexts.filter(c => c.type === 'quiz').map((context) => (
                    <SelectItem key={context.id} value={context.id} className="text-xs pl-4">
                      <div className="flex items-center gap-2">
                        <span>{context.icon}</span>
                        <span>{context.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-t border-border">🌐 General</div>
                  {contexts.filter(c => c.type === 'general').map((context) => (
                    <SelectItem key={context.id} value={context.id} className="text-xs pl-4">
                      <div className="flex items-center gap-2">
                        <span>{context.icon}</span>
                        <span>{context.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.slice(-3).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'ai' && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-60 ${msg.type === 'user' ? 'order-1' : ''}`}>
                    <div className={`
                      p-2 rounded-lg text-xs
                      ${msg.type === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-background-secondary text-foreground'}
                    `}>
                      {msg.context && (
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <span>{msg.context}</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>

                  {msg.type === 'user' && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="px-3 py-2 border-t border-card-border">
              <div className="flex gap-1 mb-2 flex-wrap">
                {currentQuickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant}
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-card-border">
              {showSuggestions && message === "" && (
                <div className="mb-2 space-y-1">
                  {promptSuggestions.slice(0, 2).map((suggestion, i) => (
                    <button
                      key={i}
                      className="block w-full text-left text-xs text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/50"
                      onClick={() => {
                        setMessage(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      • {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={`Ask about ${selectedContextData?.name.toLowerCase() || 'anything'}...`}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setShowSuggestions(e.target.value === "");
                  }}
                  className="flex-1 h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      console.log('Send message:', message);
                      setMessage("");
                      setShowSuggestions(true);
                    }
                  }}
                />
                <Button size="sm" className="h-8 px-2">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              AI Study Chat
            </h1>
            <p className="text-sm text-muted-foreground">
              Get personalized help with your study materials
            </p>
          </div>

          {/* Context Selector & Float Toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFloating}
              className="h-8 px-3 text-xs"
            >
              <Minimize2 className="h-3 w-3 mr-1" />
              Float
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Context:</span>
            <Select value={selectedContext} onValueChange={setSelectedContext}>
              <SelectTrigger className="w-64 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">📚 Current Folder</div>
                {contexts.filter(c => c.type === 'folder').map((context) => (
                  <SelectItem key={context.id} value={context.id} className="pl-4">
                    <div className="flex items-center gap-2">
                      <span>{context.icon}</span>
                      <span>{context.name}</span>
                      {context.docCount && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {context.docCount} docs
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-t border-border">📝 Recent Tests</div>
                {contexts.filter(c => c.type === 'quiz').map((context) => (
                  <SelectItem key={context.id} value={context.id} className="pl-4">
                    <div className="flex items-center gap-2">
                      <span>{context.icon}</span>
                      <span>{context.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <div className="text-xs font-medium text-muted-foreground px-2 py-1 border-t border-border">🌐 General</div>
                {contexts.filter(c => c.type === 'general').map((context) => (
                  <SelectItem key={context.id} value={context.id} className="pl-4">
                    <div className="flex items-center gap-2">
                      <span>{context.icon}</span>
                      <span>{context.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col bg-card border border-card-border rounded-lg overflow-hidden">
          {/* Smart Context Bar */}
          <div className="h-8 px-4 bg-background-secondary border-b border-card-border flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active context:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{selectedContextData?.icon}</span>
              <span className="text-sm font-medium text-foreground">
                {selectedContextData?.name}
                {selectedContextData?.type === 'folder' && selectedContextData.docCount && 
                  ` • ${selectedContextData.docCount} docs`
                }
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'ai' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-2xl ${msg.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`
                    p-3 rounded-lg text-sm
                    ${msg.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-background-secondary text-foreground'}
                  `}>
                    {msg.context && (
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span>{msg.context}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 ${
                    msg.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.type === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Context-Specific Quick Actions */}
          <div className="px-4 py-2 border-t border-card-border">
            <div className="flex gap-2 mb-3 flex-wrap">
              {currentQuickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  size="sm"
                  className="h-7 px-3 text-xs"
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message Input with Suggestions */}
          <div className="p-4 border-t border-card-border">
            {showSuggestions && message === "" && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {promptSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded hover:bg-muted/50 border border-border"
                    onClick={() => {
                      setMessage(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    • {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder={`Ask about ${selectedContextData?.name.toLowerCase() || 'anything'}...`}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setShowSuggestions(e.target.value === "");
                }}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    console.log('Send message:', message);
                    setMessage("");
                    setShowSuggestions(true);
                  }
                }}
              />
              <Button size="sm" className="px-3">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}