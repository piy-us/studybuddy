import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className, 
  showPercentage = false,
  size = "md",
  variant = "default"
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: "h-1",
    md: "h-2", 
    lg: "h-3"
  };
  
  const variantClasses = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning", 
    error: "bg-destructive"
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn(
        "w-full bg-muted rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div 
          className={cn(
            "h-full transition-smooth rounded-full",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-muted-foreground text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}