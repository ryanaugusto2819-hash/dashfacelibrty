import { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, Target, BarChart3, Percent, TrendingUp, Receipt, Wallet, Activity, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/dashboard/KPICard";
import DateFilter from "@/components/dashboard/DateFilter";
import AdsTable from "@/components/dashboard/AdsTable";
import SpendChart from "@/components/dashboard/SpendChart";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDateRange = (range: string) => {
  const today = new Date();
  switch (range) {
    case "7days":
      return { from: subDays(today, 6), to: today };
    case "30days":
      return { from: subDays(today, 29), to: today };
    case "today":
      return { from: today, to: today };
    default:
      return { from: subDays(today, 29), to: today };
  }
};

const SkeletonCard = () => (
  <div className="glass-card p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="shimmer h-3 w-20 rounded" />
      <div className="shimmer h-8 w-8 rounded-lg" />
    </div>
    <div className="shimmer h-7 w-28 rounded mt-1" />
  </div>
);

const Index = () => {
  const [range, setRange] = useState("30days");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [data, setData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let from: Date, to: Date;
        if (range === "custom" && customRange) {
          from = customRange.from;
          to = customRange.to;
        } else {
          const dates = getDateRange(range);
          from = dates.from;
          to = dates.to;
        }

        const fromStr = format(from, "yyyy-MM-dd");
        const toStr = format(to, "yyyy-MM-dd");

        const [metricsRes, salesRes] = await Promise.all([
          supabase.functions.invoke("facebookMetrics", {
            body: { from: fromStr, to: toStr },
          }),
          supabase.functions.invoke("salesFromSheet"),
        ]);

        if (metricsRes.error) throw new Error("Erro ao buscar métricas");

        const items = metricsRes.data?.data ?? [];
        setData(Array.isArray(items) ? items : []);

        // Filter sales by date range
        const allSales = Array.isArray(salesRes.data) ? salesRes.data : [];
        const filtered = allSales.filter((s: any) => s.date >= fromStr && s.date <= toStr);
        setSalesData(filtered);
      } catch (err: any) {
        console.error("Erro:", err);
        setError(err.message || "Erro inesperado");
        setData([]);
        setSalesData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range, customRange]);

  const kpi = useMemo(() => {
    const totalSpent = data.reduce((sum, d) => sum + Number(d.spend || 0), 0);
    const totalLeads = data.reduce((sum, d) => sum + Number(d.leads || 0), 0);
    const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    const totalSales = salesData.reduce((sum, s) => sum + Number(s.sales || 0), 0);
    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
    const lucro70 = totalRevenue * 0.7 - totalSpent;
    const lucro60 = totalRevenue * 0.6 - totalSpent;
    const lucro50 = totalRevenue * 0.5 - totalSpent;
    const lucro40 = totalRevenue * 0.4 - totalSpent;

    return { totalSpent, totalLeads, costPerLead, roi, conversionRate, averageTicket, totalSales, totalRevenue, lucro70, lucro60, lucro50, lucro40 };
  }, [data, salesData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight">Facebook Ads</h1>
              <p className="text-[11px] text-muted-foreground tracking-wide">Dashboard de Performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            )}
            <DateFilter selected={range} onSelect={setRange} customRange={customRange} onCustomRange={setCustomRange} />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="glass-card border-loss/30 bg-loss/5 p-4 flex items-center gap-3 animate-fade-in-up">
            <Activity className="h-4 w-4 text-loss flex-shrink-0" />
            <p className="text-sm text-loss">{error}</p>
          </div>
        )}

        {/* Section: KPIs */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Visão Geral
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
                <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} variant="blue" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} variant="cyan" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} variant="orange" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <KPICard title="Vendas" value={kpi.totalSales.toLocaleString("pt-BR")} icon={Receipt} variant="purple" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <KPICard title="Faturamento" value={`R$ ${fmt(kpi.totalRevenue)}`} icon={Wallet} variant="green" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
                <KPICard title="ROI" value={`${fmt(kpi.roi)}%`} icon={Percent} variant="green" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <KPICard title="Tx. Conversão" value={`${fmt(kpi.conversionRate)}%`} icon={TrendingUp} variant="cyan" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
                <KPICard title="Ticket Médio" value={`R$ ${fmt(kpi.averageTicket)}`} icon={Receipt} variant="blue" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <KPICard title="Lucro 70%" value={`R$ ${fmt(kpi.lucro70)}`} icon={Wallet} variant="green" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "450ms" }}>
                <KPICard title="Lucro 60%" value={`R$ ${fmt(kpi.lucro60)}`} icon={Wallet} variant="green" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
                <KPICard title="Lucro 50%" value={`R$ ${fmt(kpi.lucro50)}`} icon={Wallet} variant="orange" />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "550ms" }}>
                <KPICard title="Lucro 40%" value={`R$ ${fmt(kpi.lucro40)}`} icon={Wallet} variant="orange" />
              </div>
            </div>
          )}
        </section>

        {/* Section: Chart */}
        {!loading && (
          <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-success" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Evolução
              </h2>
            </div>
            <SpendChart data={data} range={range} />
          </section>
        )}

        {/* Section: Table */}
        {!loading && (
          <section className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-warning" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Detalhamento
              </h2>
            </div>
            <AdsTable ads={data} salesData={salesData} />
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
