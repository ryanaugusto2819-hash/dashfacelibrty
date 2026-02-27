import { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, Target, BarChart3, Percent, TrendingUp, Receipt, Wallet } from "lucide-react";
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

const Index = () => {
  const [range, setRange] = useState("30days");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===========================
  // BUSCAR DADOS DA API
  // ===========================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { from, to } = getDateRange(range);

        const { data: result, error: fnError } = await supabase.functions.invoke(
          "facebookMetrics",
          {
            body: {
              from: format(from, "yyyy-MM-dd"),
              to: format(to, "yyyy-MM-dd"),
            },
          }
        );

        if (fnError) {
          throw new Error("Erro ao buscar métricas");
        }

        console.log("Resposta da API:", result);

        const items = result?.data ?? [];
        setData(Array.isArray(items) ? items : []);
      } catch (err: any) {
        console.error("Erro:", err);
        setError(err.message || "Erro inesperado");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  // ===========================
  // CALCULAR KPIs
  // ===========================

  const kpi = useMemo(() => {
    const totalSpent = data.reduce((sum, d) => sum + Number(d.spend || 0), 0);
    const totalLeads = data.reduce((sum, d) => sum + Number(d.leads || 0), 0);
    const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const totalRevenue = 0; // integrar com faturamento real
    const totalSales = 0;   // integrar com vendas reais
    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
    const lucro70 = totalRevenue * 0.7 - totalSpent;
    const lucro60 = totalRevenue * 0.6 - totalSpent;
    const lucro50 = totalRevenue * 0.5 - totalSpent;
    const lucro40 = totalRevenue * 0.4 - totalSpent;

    return {
      totalSpent,
      totalLeads,
      costPerLead,
      roi,
      conversionRate,
      averageTicket,
      lucro70,
      lucro60,
      lucro50,
      lucro40,
    };
  }, [data]);

  if (loading) {
    return <div className="p-6">Carregando métricas...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Facebook Ads</h1>
              <p className="text-xs text-muted-foreground">Dashboard de Performance</p>
            </div>
          </div>

          <DateFilter selected={range} onSelect={setRange} />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} />
          <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} />
          <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} />
          <KPICard title="ROI" value={`${fmt(kpi.roi)}%`} icon={Percent} />
          <KPICard title="Tx. Conversão" value={`${fmt(kpi.conversionRate)}%`} icon={TrendingUp} />
          <KPICard title="Ticket Médio" value={`R$ ${fmt(kpi.averageTicket)}`} icon={Receipt} />
          <KPICard title="Lucro 70%" value={`R$ ${fmt(kpi.lucro70)}`} icon={Wallet} />
          <KPICard title="Lucro 60%" value={`R$ ${fmt(kpi.lucro60)}`} icon={Wallet} />
          <KPICard title="Lucro 50%" value={`R$ ${fmt(kpi.lucro50)}`} icon={Wallet} />
          <KPICard title="Lucro 40%" value={`R$ ${fmt(kpi.lucro40)}`} icon={Wallet} />
        </div>

        {/* Gráfico */}
        <SpendChart data={data} range={range} />

        {/* Tabela */}
        <AdsTable ads={data} />
      </main>
    </div>
  );
};

export default Index;
