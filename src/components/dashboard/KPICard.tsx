import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  glowClass?: string;
  gradientClass?: string;
}

const KPICard = ({ title, value, icon: Icon, trend, trendUp, glowClass = "", gradientClass = "" }: KPICardProps) => {
  return (
    <div className={`glass-card p-5 transition-all duration-300 hover:scale-[1.02] ${glowClass}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={`p-2 rounded-lg ${gradientClass}`}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`text-xs font-medium ${trendUp ? "text-profit" : "text-loss"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
          <span className="text-xs text-muted-foreground">vs anterior</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
