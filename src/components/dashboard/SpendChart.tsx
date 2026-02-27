import { DailyData } from "@/data/mockData";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpendChartProps {
  data: DailyData[];
  range: string;
}

const SpendChart = ({ data, range }: SpendChartProps) => {
  const sliced =
    range === "today" ? data.slice(-1) : range === "7days" ? data.slice(-7) : data;

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-display font-semibold mb-1">Investimento vs Faturamento</h2>
      <p className="text-xs text-muted-foreground mb-4">Evolução diária do período</p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(222 44% 9%)",
                border: "1px solid hsl(222 30% 16%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(210 40% 96%)" }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                name === "spent" ? "Gasto" : "Faturamento",
              ]}
            />
            <Area type="monotone" dataKey="spent" stroke="hsl(217 91% 60%)" fill="url(#colorSpent)" strokeWidth={2} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" fill="url(#colorRevenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendChart;
