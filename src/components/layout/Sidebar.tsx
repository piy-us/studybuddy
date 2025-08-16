import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Clock, 
  MessageSquare,
  ChevronLeft,
  Plus
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Folders", href: "/folders", icon: FolderOpen },
  { name: "Recent", href: "/recent", icon: Clock },
  { name: "Chat", href: "/chat", icon: MessageSquare },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
      
      <aside className={cn(
        "bg-background-secondary border-r border-card-border flex flex-col transition-smooth relative z-40",
        "md:relative fixed inset-y-0 left-0",
        isCollapsed ? "w-14 -translate-x-full md:translate-x-0" : "w-70"
      )}>
        {/* Collapse Toggle */}
        <div className="h-10 md:h-10 flex items-center justify-end px-2 border-b border-card-border">
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-1 hover:bg-muted touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => {
                  // Auto-collapse on mobile after navigation
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-smooth touch-manipulation",
                    "hover:bg-muted hover:text-accent-foreground",
                    (isActive || navIsActive) 
                      ? "bg-accent text-accent-foreground shadow-sm" 
                      : "text-muted-foreground"
                  )
                }
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-2 border-t border-card-border">
          <Button
            size="sm"
            className={cn(
              "w-full justify-start gap-3 h-9 bg-gradient-primary hover:opacity-90 touch-manipulation",
              isCollapsed && "justify-center gap-0"
            )}
            title={isCollapsed ? "New Quiz" : undefined}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm">New Quiz</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}