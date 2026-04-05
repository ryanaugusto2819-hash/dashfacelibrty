import { useState } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from "lucide-react";

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

const variantMap: Record<string, {
  glow: string;
  accentBar: string;
  iconBox: string;
  iconColor: string;
  trendBg: string;
  trendText: string;
}> = {
  blue: {
    glow: "metric-glow-blue",
    accentBar: "accent-bar-blue",
    iconBox: "icon-box icon-box-blue",
    iconColor: "text-blue-400",
    trendBg: "bg-blue-500/10",
    trendText: "text-blue-400",
  },
  green: {
    glow: "metric-glow-green",
    accentBar: "accent-bar-green",
    iconBox: "icon-box icon-box-green",
    iconColor: "text-emerald-400",
    trendBg: "bg-emerald-500/10",
    trendText: "text-emerald-400",
  },
  orange: {
    glow: "metric-glow-orange",
    accentBar: "accent-bar-amber",
    iconBox: "icon-box icon-box-amber",
    iconColor: "text-amber-400",
    trendBg: "bg-amber-500/10",
    trendText: "text-amber-400",
  },
  purple: {
    glow: "metric-glow-purple",
    accentBar: "accent-bar-purple",
    iconBox: "icon-box icon-box-purple",
    iconColor: "text-violet-400",
    trendBg: "bg-violet-500/10",
    trendText: "text-violet-400",
  },
  cyan: {
    glow: "metric-glow-cyan",
    accentBar: "accent-bar-cyan",
    iconBox: "icon-box icon-box-cyan",
    iconColor: "text-teal-400",
    trendBg: "bg-teal-500/10",
    trendText: "text-teal-400",
  },
  default: {
    glow: "",
    accentBar: "accent-bar-purple",
    iconBox: "icon-box",
    iconColor: "text-muted-foreground",
    trendBg: "bg-muted/50",
    trendText: "text-muted-foreground",
  },
};

const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  trendNeutral,
  previousValue,
  variant = "default",
  hidden: globalHidden = false,
}: KPICardProps) => {
  const style = variantMap[variant] ?? variantMap.default;
  const [localHidden, setLocalHidden] = useState(false);
  const isHidden = globalHidden || localHidden;

  return (
    <div
      className={`glass-card relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.025] group cursor-default ${style.glow}`}
    >
      {/* Top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${style.accentBar} opacity-90`} />

      {/* Subtle inner glow at top */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate">
            {title}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setLocalHidden((v) => !v); }}
            className="p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors flex-shrink-0"
          >
            {localHidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
          </button>
        </div>
        <div className={style.iconBox}>
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>
      </div>

      <p className="text-[1.6rem] font-display font-bold tracking-tight leading-none mb-3 text-foreground">
        {isHidden ? (
          <span className="tracking-widest text-muted-foreground/40">••••••</span>
        ) : (
          value
        )}
      </p>

      {trend && (
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              trendNeutral
                ? "bg-muted/40 text-muted-foreground border-muted/50"
                : trendUp
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {trendNeutral ? (
              <Minus className="h-3 w-3" />
            ) : trendUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isHidden ? "••••" : trend}
          </div>
          {previousValue && !isHidden && (
            <span className="text-[10px] text-muted-foreground/60 truncate">
              ant: {previousValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
