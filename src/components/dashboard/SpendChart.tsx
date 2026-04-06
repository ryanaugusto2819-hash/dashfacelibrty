import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SpendChartProps {
  data: any[];
  range: string;
}

const SpendChart = ({ data, range }: SpendChartProps) => {
  const chartData = (() => {
    const byDate: Record<string, { date: string; spend: number; leads: number }> = {};
    for (const row of data) {
      const d = row.date || row.date_start;
      if (!d) continue;
      if (!byDate[d]) byDate[d] = { date: d, spend: 0, leads: 0 };
      byDate[d].spend += Number(row.spend || 0);
      byDate[d].leads += Number(row.leads || 0);
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const sliced =
    range === "today" ? chartData.slice(-1) : range === "7days" ? chartData.slice(-7) : chartData;

  if (sliced.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground/60 text-sm">Sem dados de evolução para o período.</p>
      </div>
    );
  }

  const PURPLE = "#a78bfa";
  const TEAL = "#2dd4bf";
  const GRID = "hsl(258, 20%, 14%)";
  const TICK = "hsl(258, 12%, 45%)";

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-[3px] accent-bar-purple opacity-90" />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-display font-semibold text-foreground">Investimento Diário</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">
            Evolução do gasto e leads no período
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: PURPLE }} />
            <span className="text-[11px] text-muted-foreground">Gasto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: TEAL }} />
            <span className="text-[11px] text-muted-foreground">Leads</span>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PURPLE} stopOpacity={0.4} />
                <stop offset="85%" stopColor={PURPLE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                <stop offset="85%" stopColor={TEAL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: TICK, fontSize: 11, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: TICK, fontSize: 11, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(258, 30%, 9%)",
                border: "1px solid hsl(258, 25%, 18%)",
                borderRadius: "10px",
                fontSize: "12px",
                fontFamily: 'Inter',
                boxShadow: "0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px hsl(271 76% 62% / 0.1)",
              }}
              labelStyle={{ color: "hsl(0, 0%, 90%)", fontWeight: 600 }}
              formatter={(value: number, name: string) => [
                name === "spend"
                  ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : value.toLocaleString("pt-BR"),
                name === "spend" ? "Gasto" : "Leads",
              ]}
            />
            <Legend content={() => null} />
            <Area
              type="monotone"
              dataKey="spend"
              stroke={PURPLE}
              fill="url(#colorSpend)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: PURPLE }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke={TEAL}
              fill="url(#colorLeads)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: TEAL }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendChart;
