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
  // Group data by date for the chart
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
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        Sem dados de evolução para o período.
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-display font-semibold mb-1">Investimento Diário</h2>
      <p className="text-[11px] text-muted-foreground mb-5 tracking-wide">Evolução do gasto e leads no período</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152, 69%, 46%)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(152, 69%, 46%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 16%, 14%)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 16%, 50%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: "hsl(215, 16%, 50%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(228, 22%, 10%)",
                border: "1px solid hsl(228, 16%, 18%)",
                borderRadius: "10px",
                fontSize: "12px",
                boxShadow: "0 8px 32px -8px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "hsl(210, 40%, 96%)", fontWeight: 600 }}
              formatter={(value: number, name: string) => [
                name === "spend"
                  ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : value.toLocaleString("pt-BR"),
                name === "spend" ? "Gasto" : "Leads",
              ]}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: "hsl(215, 16%, 50%)", fontSize: 11 }}>
                  {value === "spend" ? "Gasto" : "Leads"}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="hsl(217, 91%, 60%)"
              fill="url(#colorSpend)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="hsl(152, 69%, 46%)"
              fill="url(#colorLeads)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendChart;
