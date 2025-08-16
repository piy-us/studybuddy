import { useEffect, useState } from "react";
import { TrendingUp, BookOpen, Award, Clock } from "lucide-react";
import { getStatsOverview } from "@/lib/api";

const iconMap: Record<string, any> = {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
};

export function StatsOverview() {
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    getStatsOverview()
      .then(setStats)
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setStats([
          { label: "Quizzes Taken", value: "0", change: "", icon: "BookOpen", trend: "neutral" },
          { label: "Avg Score", value: "—", change: "", icon: "Award", trend: "neutral" },
          { label: "Study Time", value: "—", change: "", icon: "Clock", trend: "neutral" },
          { label: "Folders", value: "0", change: "", icon: "TrendingUp", trend: "neutral" },
        ]);
      });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat) => {
        const IconComp = iconMap[stat.icon] || BookOpen;
        return (
          <div
            key={stat.label}
            className="bg-card border border-card-border rounded-lg p-3 md:p-4 hover:shadow-md transition-smooth touch-manipulation"
          >
            <div className="flex items-center justify-between mb-2">
              <IconComp className="h-4 w-4 text-primary flex-shrink-0" />
              <span className={`text-xs truncate ml-1 ${
                stat.trend === "up" ? "text-success" : "text-muted-foreground"
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-lg md:text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground truncate">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
