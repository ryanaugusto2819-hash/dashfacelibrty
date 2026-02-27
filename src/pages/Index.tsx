import { useState } from "react";
import {
  DollarSign,
  Users,
  Target,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Percent,
  ArrowRightLeft,
  Receipt,
  Wallet,
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import DateFilter from "@/components/dashboard/DateFilter";
import AdsTable from "@/components/dashboard/AdsTable";
import SpendChart from "@/components/dashboard/SpendChart";
import { kpiDataByRange, adsMetrics, dailyData } from "@/data/mockData";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Index = () => {
  const [range, setRange] = useState("30days");
  const kpi = kpiDataByRange[range] ?? kpiDataByRange["30days"];

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
              <h1 className="text-xl font-display font-bold tracking-tight">Facebook Ads</h1>
              <p className="text-xs text-muted-foreground">Dashboard de Performance</p>
            </div>
          </div>
          <DateFilter selected={range} onSelect={setRange} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} trend="12.5%" trendUp={false} glowClass="metric-glow-blue" gradientClass="bg-primary" />
          <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} trend="8.3%" trendUp glowClass="metric-glow-cyan" gradientClass="bg-info" />
          <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} trend="3.1%" trendUp={false} glowClass="metric-glow-orange" gradientClass="bg-warning" />
          <KPICard title="Custo / Venda" value={`R$ ${fmt(kpi.costPerSale)}`} icon={ShoppingCart} trend="5.2%" trendUp={false} glowClass="metric-glow-purple" gradientClass="bg-[hsl(280_65%_60%)]" />
          <KPICard title="Faturamento" value={`R$ ${fmt(kpi.totalRevenue)}`} icon={TrendingUp} trend="15.7%" trendUp glowClass="metric-glow-green" gradientClass="bg-success" />
          <KPICard title="Vendas" value={kpi.totalSales.toLocaleString("pt-BR")} icon={ShoppingCart} trend="10.2%" trendUp glowClass="metric-glow-cyan" gradientClass="bg-info" />
          <KPICard title="ROI" value={`${fmt(kpi.roi)}%`} icon={Percent} trend="4.8%" trendUp glowClass="metric-glow-green" gradientClass="bg-success" />
        </div>

        {/* KPI Grid 2 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Taxa de Conversão" value={`${fmt(kpi.conversionRate)}%`} icon={ArrowRightLeft} trend="2.1%" trendUp glowClass="metric-glow-cyan" gradientClass="bg-info" />
          <KPICard title="Ticket Médio" value={`R$ ${fmt(kpi.averageTicket)}`} icon={Receipt} trend="3.4%" trendUp glowClass="metric-glow-purple" gradientClass="bg-[hsl(280_65%_60%)]" />
          <KPICard title="Lucro Est. 70%" value={`R$ ${fmt(kpi.totalRevenue * 0.7 - kpi.totalSpent)}`} icon={Wallet} glowClass="metric-glow-green" gradientClass="bg-success" />
          <KPICard title="Lucro Est. 60%" value={`R$ ${fmt(kpi.totalRevenue * 0.6 - kpi.totalSpent)}`} icon={Wallet} glowClass="metric-glow-green" gradientClass="bg-success" />
          <KPICard title="Lucro Est. 50%" value={`R$ ${fmt(kpi.totalRevenue * 0.5 - kpi.totalSpent)}`} icon={Wallet} glowClass="metric-glow-orange" gradientClass="bg-warning" />
          <KPICard title="Lucro Est. 40%" value={`R$ ${fmt(kpi.totalRevenue * 0.4 - kpi.totalSpent)}`} icon={Wallet} glowClass="metric-glow-orange" gradientClass="bg-warning" />
        </div>
        <SpendChart data={dailyData} range={range} />

        {/* Ads Table */}
        <AdsTable ads={adsMetrics} />
      </main>
    </div>
  );
};

export default Index;
