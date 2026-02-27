import { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, Target, BarChart3, Percent } from "lucide-react";
import { format, subDays } from "date-fns";
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

        const res = await fetch("/api/facebookMetrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: format(from, "yyyy-MM-dd"),
            to: format(to, "yyyy-MM-dd"),
          }),
        });

        if (!res.ok) {
          throw new Error("Erro ao buscar métricas");
        }

        const json = await res.json();

        console.log("Resposta da API:", json);

        setData(Array.isArray(json) ? json : []);
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
    if (!data.length) {
      return {
        totalSpent: 0,
        totalLeads: 0,
        costPerLead: 0,
        roi: 0,
      };
    }

    const totalSpent = data.reduce((sum, d) => sum + Number(d.spend || 0), 0);

    const totalLeads = data.reduce((sum, d) => sum + Number(d.messaging || 0), 0);

    const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;

    const roi = 0; // pode integrar depois com faturamento real

    return {
      totalSpent,
      totalLeads,
      costPerLead,
      roi,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} />

          <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} />

          <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} />

          <KPICard title="ROI" value={`${fmt(kpi.roi)}%`} icon={Percent} />
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
