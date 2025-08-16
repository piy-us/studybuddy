import { useState } from "react";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { name: "Dashboard", href: "/" },
    { name: "Folders", href: "/folders" },
    { name: "Chatbot", href: "/chat" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-10 bg-primary text-primary-foreground border-b border-card-border flex items-center px-2 md:px-4 gap-4 z-50">
      {/* Logo */}
      <div className="font-semibold text-xs md:text-sm truncate w-auto">
        AI Quiz Gen
      </div>

      {/* Nav Links */}
      <nav className="flex items-center gap-2 md:gap-4">
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.href}
            className={({ isActive }) =>
              cn(
                "px-2 py-1 rounded-md text-xs md:text-sm font-medium transition-colors",
                "hover:bg-primary-variant/20 hover:text-primary-foreground",
                isActive ? "bg-accent text-accent-foreground" : ""
              )
            }
          >
            {link.name}
          </NavLink>
        ))}
      </nav>

      {/* Search Bar - Hidden on mobile */}
      <div className="hidden sm:flex flex-1 max-w-80 relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
        <Input
          placeholder="Search folders, quizzes, content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 bg-primary-variant/20 border-primary-variant/30 text-primary-foreground placeholder:text-primary-foreground/60 text-sm focus:bg-background focus:text-foreground"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        <Avatar className="h-8 w-8 touch-manipulation">
          <AvatarFallback className="bg-primary-variant text-primary-foreground text-xs font-medium">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
