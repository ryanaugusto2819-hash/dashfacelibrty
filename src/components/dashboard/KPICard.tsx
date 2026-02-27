import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  previousValue?: string;
  variant?: "blue" | "green" | "orange" | "purple" | "cyan" | "default";
  hidden?: boolean;
}

const variantStyles: Record<string, { glow: string; iconBg: string; iconColor: string; accent: string }> = {
  blue: {
    glow: "metric-glow-blue",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    accent: "from-primary/5 to-transparent",
  },
  green: {
    glow: "metric-glow-green",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    accent: "from-success/5 to-transparent",
  },
  orange: {
    glow: "metric-glow-orange",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    accent: "from-warning/5 to-transparent",
  },
  purple: {
    glow: "metric-glow-purple",
    iconBg: "bg-[hsl(280_65%_60%)]/10",
    iconColor: "text-[hsl(280_65%_60%)]",
    accent: "from-[hsl(280_65%_60%)]/5 to-transparent",
  },
  cyan: {
    glow: "metric-glow-cyan",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    accent: "from-info/5 to-transparent",
  },
  default: {
    glow: "",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    accent: "from-muted/5 to-transparent",
  },
};

const KPICard = ({ title, value, icon: Icon, trend, trendUp, trendNeutral, previousValue, variant = "default", hidden = false }: KPICardProps) => {
  const style = variantStyles[variant] ?? variantStyles.default;

  return (
    <div className={`glass-card relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.02] hover:border-border/80 group ${style.glow}`}>
      {/* Subtle accent gradient at top */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${style.accent} opacity-60`} />

      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${style.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
      </div>

      <p className="text-2xl font-display font-bold tracking-tight leading-none">
        {hidden ? "••••••" : value}
      </p>

      {trend && (
        <div className="flex items-center gap-2 mt-3">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              trendNeutral
                ? "bg-muted/50 text-muted-foreground"
                : trendUp
                ? "bg-profit/10 text-profit"
                : "bg-loss/10 text-loss"
            }`}
          >
            {trendNeutral ? (
              <Minus className="h-3 w-3" />
            ) : trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend}
          </div>
          {previousValue && !hidden && (
            <span className="text-[10px] text-muted-foreground truncate">
              ant: {previousValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
