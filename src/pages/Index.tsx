import { useEffect, useMemo, useState, useCallback } from "react";
import { DollarSign, Users, Target, BarChart3, Percent, TrendingUp, Receipt, Wallet, Activity, RefreshCw, Eye, EyeOff, Clock, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/dashboard/KPICard";
import DateFilter from "@/components/dashboard/DateFilter";
import AdsTable from "@/components/dashboard/AdsTable";
import SpendChart from "@/components/dashboard/SpendChart";

interface SaleEntry {
  date: string;
  creative: string;
  sales: number;
  revenue: number;
  country: string;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDateRange = (range: string) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  switch (range) {
    case "yesterday":
      return { from: yesterday, to: yesterday };
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

const getPreviousDateRange = (from: Date, to: Date) => {
  const days = differenceInDays(to, from) + 1;
  return {
    from: subDays(from, days),
    to: subDays(from, 1),
  };
};

const UYU_TO_BRL = 7.49;
const ARS_TO_BRL = 266;

const convertRevenue = (sale: SaleEntry) => {
  const raw = Number(sale.revenue || 0);
  const country = (sale.country || "").toLowerCase();
  const creative = (sale.creative || "").toLowerCase().trim();
  const isArgentina = country.includes("argentin") || creative.endsWith(" ar");
  const isBrasil = country.includes("brasil") || country.includes("brazil") || creative.endsWith(" br");
  if (isArgentina) return raw / ARS_TO_BRL;
  if (isBrasil) return raw; // Already in BRL
  return raw / UYU_TO_BRL;
};

const calcKpis = (data: any[], salesData: SaleEntry[]) => {
  const totalSpent = data.reduce((sum, d) => sum + Number(d.spend || 0), 0);
  const totalLeads = data.reduce((sum, d) => sum + Number(d.leads || 0), 0);
  const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const totalRevenue = salesData.reduce((sum, s) => sum + convertRevenue(s), 0);
  const totalSales = salesData.reduce((sum, s) => sum + Number(s.sales || 0), 0);
  const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const roi = totalSpent > 0 ? totalRevenue / totalSpent : 0;
  const lucro70 = totalRevenue * 0.7 - totalSpent;
  const lucro60 = totalRevenue * 0.6 - totalSpent;
  const lucro50 = totalRevenue * 0.5 - totalSpent;
  const lucro40 = totalRevenue * 0.4 - totalSpent;
  const cpa = totalSales > 0 ? totalSpent / totalSales : 0;

  return { totalSpent, totalLeads, costPerLead, cpa, roi, conversionRate, averageTicket, totalSales, totalRevenue, lucro70, lucro60, lucro50, lucro40 };
};

const calcTrend = (current: number, previous: number, invertColors = false) => {
  if (previous === 0 && current === 0) return { trend: "0%", trendUp: false, trendNeutral: true };
  if (previous === 0) return { trend: "+100%", trendUp: !invertColors, trendNeutral: false };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct > 0;
  return {
    trend: `${isUp ? "+" : ""}${pct.toFixed(1)}%`,
    trendUp: invertColors ? !isUp : isUp,
    trendNeutral: Math.abs(pct) < 0.5,
  };
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
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState("today");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [data, setData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [prevData, setPrevData] = useState<any[]>([]);
  const [prevSalesData, setPrevSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countryFilter, setCountryFilter] = useState<"all" | "uruguay" | "argentina" | "brasil">("all");
  const [nichoFilter, setNichoFilter] = useState<"all" | "adulto" | "prosta" | "emagrecimento" | "diabetes">("all");
  const [campaignBudgets, setCampaignBudgets] = useState<Record<string, { daily_budget: number; name: string; status: string }>>({});

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

      const prev = getPreviousDateRange(from, to);

      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      const prevFromStr = format(prev.from, "yyyy-MM-dd");
      const prevToStr = format(prev.to, "yyyy-MM-dd");

      const [metricsRes, prevMetricsRes, salesRes, budgetsRes] = await Promise.all([
        supabase.functions.invoke("facebookMetrics", {
          body: { from: fromStr, to: toStr },
        }),
        supabase.functions.invoke("facebookMetrics", {
          body: { from: prevFromStr, to: prevToStr },
        }),
        supabase.functions.invoke("salesFromSheet"),
        supabase.functions.invoke("getCampaignBudgets"),
      ]);

      if (metricsRes.error) throw new Error("Erro ao buscar métricas");

      const items = metricsRes.data?.data ?? [];
      setData(Array.isArray(items) ? items : []);

      const prevItems = prevMetricsRes.data?.data ?? [];
      setPrevData(Array.isArray(prevItems) ? prevItems : []);

      // Filter sales by date range
      const allSales = Array.isArray(salesRes.data) ? salesRes.data : [];
      const filtered = allSales.filter((s: any) => s.date >= fromStr && s.date <= toStr);
      setSalesData(filtered);

      const prevFiltered = allSales.filter((s: any) => s.date >= prevFromStr && s.date <= prevToStr);
      setPrevSalesData(prevFiltered);

      // Set campaign budgets
      if (budgetsRes.data?.budgets) {
        setCampaignBudgets(budgetsRes.data.budgets);
      }
    } catch (err: any) {
      console.error("Erro:", err);
      setError(err.message || "Erro inesperado");
      setData([]);
      setSalesData([]);
      setPrevData([]);
      setPrevSalesData([]);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, customRange]);

  const isAdCountry = (ad: any, country: "uruguay" | "argentina" | "brasil") => {
    const campaignName = (ad.campaign_name || "").toUpperCase();
    const isAR = campaignName.includes("(AR-") || campaignName.includes("(AR ");
    const isUY = campaignName.includes("(UY-") || campaignName.includes("(UY ");
    const isBR = campaignName.includes("(BR-") || campaignName.includes("(BR ");
    if (country === "argentina") return isAR;
    if (country === "brasil") return isBR;
    return isUY || (!isAR && !isBR);
  };

  const isAdNicho = (ad: any, nicho: "adulto" | "prosta" | "emagrecimento" | "diabetes") => {
    const campaignName = (ad.campaign_name || "").toLowerCase();
    if (nicho === "adulto") return campaignName.includes("adulto");
    if (nicho === "prosta") return campaignName.includes("prosta");
    if (nicho === "emagrecimento") return campaignName.includes("ema");
    if (nicho === "diabetes") return campaignName.includes("diabet");
    return true;
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (countryFilter !== "all") result = result.filter(ad => isAdCountry(ad, countryFilter));
    if (nichoFilter !== "all") result = result.filter(ad => isAdNicho(ad, nichoFilter));
    return result;
  }, [data, countryFilter, nichoFilter]);

  // Get ad names from filtered data to filter sales by nicho
  const filteredAdNames = useMemo(() => {
    return new Set(filteredData.map(ad => (ad.ad_name || ad.name || "").toLowerCase().trim()).filter(Boolean));
  }, [filteredData]);

  const filteredSalesData = useMemo(() => {
    let result = salesData;
    if (countryFilter !== "all") {
      result = result.filter(s => {
        const country = (s.country || "").toLowerCase();
        const creative = (s.creative || "").toLowerCase().trim();
        const isAR = country.includes("argentin") || creative.endsWith(" ar");
        const isBR = country.includes("brasil") || country.includes("brazil") || creative.endsWith(" br");
        if (countryFilter === "argentina") return isAR;
        if (countryFilter === "brasil") return isBR;
        return !isAR && !isBR;
      });
    }
    if (nichoFilter !== "all") {
      result = result.filter(s => {
        const creative = (s.creative || "").toLowerCase().trim();
        if (!creative) return false;
        // Match sale to filtered ads by creative name
        if (filteredAdNames.has(creative)) return true;
        const stripped = creative.replace(/ ar$/, "");
        if (stripped !== creative && filteredAdNames.has(stripped)) return true;
        return false;
      });
    }
    return result;
  }, [salesData, countryFilter, nichoFilter, filteredAdNames]);

  const filteredPrevData = useMemo(() => {
    let result = prevData;
    if (countryFilter !== "all") result = result.filter(ad => isAdCountry(ad, countryFilter));
    if (nichoFilter !== "all") result = result.filter(ad => isAdNicho(ad, nichoFilter));
    return result;
  }, [prevData, countryFilter, nichoFilter]);

  const filteredPrevAdNames = useMemo(() => {
    return new Set(filteredPrevData.map(ad => (ad.ad_name || ad.name || "").toLowerCase().trim()).filter(Boolean));
  }, [filteredPrevData]);

  const filteredPrevSalesData = useMemo(() => {
    let result = prevSalesData;
    if (countryFilter !== "all") {
      result = result.filter(s => {
        const country = (s.country || "").toLowerCase();
        const creative = (s.creative || "").toLowerCase().trim();
        const isAR = country.includes("argentin") || creative.endsWith(" ar");
        return countryFilter === "argentina" ? isAR : !isAR;
      });
    }
    if (nichoFilter !== "all") {
      result = result.filter(s => {
        const creative = (s.creative || "").toLowerCase().trim();
        if (!creative) return false;
        if (filteredPrevAdNames.has(creative)) return true;
        const stripped = creative.replace(/ ar$/, "");
        if (stripped !== creative && filteredPrevAdNames.has(stripped)) return true;
        return false;
      });
    }
    return result;
  }, [prevSalesData, countryFilter, nichoFilter, filteredPrevAdNames]);

  const deduplicatedAds = useMemo(() => {
    const map = new Map<string, any>();
    filteredData.forEach((ad) => {
      const name = (ad.ad_name || ad.name || "").toLowerCase().trim();
      if (!name) return;
      const existing = map.get(name);
      if (existing) {
        existing.spend = (existing.spend || 0) + Number(ad.spend || 0);
        existing.leads = (existing.leads || 0) + Number(ad.leads || 0);
        existing.impressions = (existing.impressions || 0) + Number(ad.impressions || 0);
        existing.clicks = (existing.clicks || 0) + Number(ad.clicks || 0);
        existing.reach = (existing.reach || 0) + Number(ad.reach || 0);
        if (ad.status === "active") existing.status = "active";
        existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.costPerLead = existing.leads > 0 ? existing.spend / existing.leads : 0;
        existing.cpl = existing.costPerLead;
        const totalImpressions = existing.impressions;
        if (ad.hookRate != null) {
          existing._hookWeighted = (existing._hookWeighted || 0) + (ad.hookRate || 0) * Number(ad.impressions || 0);
          existing.hookRate = totalImpressions > 0 ? existing._hookWeighted / totalImpressions : 0;
        }
        if (ad.bodyRate != null) {
          existing._bodyWeighted = (existing._bodyWeighted || 0) + (ad.bodyRate || 0) * Number(ad.impressions || 0);
          existing.bodyRate = totalImpressions > 0 ? existing._bodyWeighted / totalImpressions : 0;
        }
        // Collect unique campaign_ids
        if (ad.campaign_id && !existing._campaignIds.has(ad.campaign_id)) {
          existing._campaignIds.add(ad.campaign_id);
        }
      } else {
        const campaignIds = new Set<string>();
        if (ad.campaign_id) campaignIds.add(ad.campaign_id);
        map.set(name, { ...ad, _hookWeighted: (ad.hookRate || 0) * Number(ad.impressions || 0), _bodyWeighted: (ad.bodyRate || 0) * Number(ad.impressions || 0), _campaignIds: campaignIds });
      }
    });
    return Array.from(map.values()).map(ad => ({
      ...ad,
      campaignIds: Array.from(ad._campaignIds || []),
    }));
  }, [filteredData]);

  const deduplicatedPrevAds = useMemo(() => {
    const map = new Map<string, any>();
    filteredPrevData.forEach((ad) => {
      const name = (ad.ad_name || ad.name || "").toLowerCase().trim();
      if (!name) return;
      const existing = map.get(name);
      if (existing) {
        existing.spend = (existing.spend || 0) + Number(ad.spend || 0);
        existing.leads = (existing.leads || 0) + Number(ad.leads || 0);
        existing.impressions = (existing.impressions || 0) + Number(ad.impressions || 0);
        existing.clicks = (existing.clicks || 0) + Number(ad.clicks || 0);
        existing.reach = (existing.reach || 0) + Number(ad.reach || 0);
        if (ad.status === "active") existing.status = "active";
        existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.costPerLead = existing.leads > 0 ? existing.spend / existing.leads : 0;
        existing.cpl = existing.costPerLead;
        const totalImpressions = existing.impressions;
        if (ad.hookRate != null) {
          existing._hookWeighted = (existing._hookWeighted || 0) + (ad.hookRate || 0) * Number(ad.impressions || 0);
          existing.hookRate = totalImpressions > 0 ? existing._hookWeighted / totalImpressions : 0;
        }
        if (ad.bodyRate != null) {
          existing._bodyWeighted = (existing._bodyWeighted || 0) + (ad.bodyRate || 0) * Number(ad.impressions || 0);
          existing.bodyRate = totalImpressions > 0 ? existing._bodyWeighted / totalImpressions : 0;
        }
      } else {
        map.set(name, { ...ad, _hookWeighted: (ad.hookRate || 0) * Number(ad.impressions || 0), _bodyWeighted: (ad.bodyRate || 0) * Number(ad.impressions || 0) });
      }
    });
    return Array.from(map.values());
  }, [filteredPrevData]);

  const kpi = useMemo(() => calcKpis(filteredData, filteredSalesData), [filteredData, filteredSalesData]);
  const prevKpi = useMemo(() => calcKpis(filteredPrevData, filteredPrevSalesData), [filteredPrevData, filteredPrevSalesData]);

  // Metrics where lower is better (invert trend colors)
  const spentTrend = calcTrend(kpi.totalSpent, prevKpi.totalSpent, true);
  const leadsTrend = calcTrend(kpi.totalLeads, prevKpi.totalLeads);
  const cplTrend = calcTrend(kpi.costPerLead, prevKpi.costPerLead, true);
  const salesTrend = calcTrend(kpi.totalSales, prevKpi.totalSales);
  const cpaTrend = calcTrend(kpi.cpa, prevKpi.cpa, true);
  const revenueTrend = calcTrend(kpi.totalRevenue, prevKpi.totalRevenue);
  const roiTrend = calcTrend(kpi.roi, prevKpi.roi);
  const convTrend = calcTrend(kpi.conversionRate, prevKpi.conversionRate);
  const ticketTrend = calcTrend(kpi.averageTicket, prevKpi.averageTicket);
  const lucro70Trend = calcTrend(kpi.lucro70, prevKpi.lucro70);
  const lucro60Trend = calcTrend(kpi.lucro60, prevKpi.lucro60);
  const lucro50Trend = calcTrend(kpi.lucro50, prevKpi.lucro50);

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

          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdate && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <Tabs value={countryFilter} onValueChange={(v) => setCountryFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Todos</TabsTrigger>
                <TabsTrigger value="uruguay" className="text-xs px-3 h-6">🇺🇾 Uruguai</TabsTrigger>
                <TabsTrigger value="argentina" className="text-xs px-3 h-6">🇦🇷 Argentina</TabsTrigger>
                <TabsTrigger value="brasil" className="text-xs px-3 h-6">🇧🇷 Brasil</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={nichoFilter} onValueChange={(v) => setNichoFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Todos</TabsTrigger>
                <TabsTrigger value="adulto" className="text-xs px-3 h-6">Adulto</TabsTrigger>
                <TabsTrigger value="prosta" className="text-xs px-3 h-6">Prósta</TabsTrigger>
                <TabsTrigger value="emagrecimento" className="text-xs px-3 h-6">Emagrecimento</TabsTrigger>
                <TabsTrigger value="diabetes" className="text-xs px-3 h-6">Diabetes</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setHideValues((v) => !v)}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={hideValues ? "Mostrar valores" : "Esconder valores"}
            >
              {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <DateFilter selected={range} onSelect={setRange} customRange={customRange} onCustomRange={setCustomRange} />
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Gerenciar Usuários"
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={signOut}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
                <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} variant="blue"
                  trend={spentTrend.trend} trendUp={spentTrend.trendUp} trendNeutral={spentTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.totalSpent)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} variant="cyan"
                  trend={leadsTrend.trend} trendUp={leadsTrend.trendUp} trendNeutral={leadsTrend.trendNeutral}
                  previousValue={prevKpi.totalLeads.toLocaleString("pt-BR")} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} variant="orange"
                  trend={cplTrend.trend} trendUp={cplTrend.trendUp} trendNeutral={cplTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.costPerLead)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <KPICard title="Vendas" value={kpi.totalSales.toLocaleString("pt-BR")} icon={Receipt} variant="purple"
                  trend={salesTrend.trend} trendUp={salesTrend.trendUp} trendNeutral={salesTrend.trendNeutral}
                  previousValue={prevKpi.totalSales.toLocaleString("pt-BR")} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "175ms" }}>
                <KPICard title="CPA" value={`R$ ${fmt(kpi.cpa)}`} icon={Target} variant="orange"
                  trend={cpaTrend.trend} trendUp={cpaTrend.trendUp} trendNeutral={cpaTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.cpa)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <KPICard title="Faturamento" value={`R$ ${fmt(kpi.totalRevenue)}`} icon={Wallet} variant="green"
                  trend={revenueTrend.trend} trendUp={revenueTrend.trendUp} trendNeutral={revenueTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.totalRevenue)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
                <KPICard title="ROAS" value={`${fmt(kpi.roi)}x`} icon={Percent} variant="green"
                  trend={roiTrend.trend} trendUp={roiTrend.trendUp} trendNeutral={roiTrend.trendNeutral}
                  previousValue={`${fmt(prevKpi.roi)}x`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <KPICard title="Tx. Conversão" value={`${fmt(kpi.conversionRate)}%`} icon={TrendingUp} variant="cyan"
                  trend={convTrend.trend} trendUp={convTrend.trendUp} trendNeutral={convTrend.trendNeutral}
                  previousValue={`${fmt(prevKpi.conversionRate)}%`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
                <KPICard title="Ticket Médio" value={`R$ ${fmt(kpi.averageTicket)}`} icon={Receipt} variant="blue"
                  trend={ticketTrend.trend} trendUp={ticketTrend.trendUp} trendNeutral={ticketTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.averageTicket)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <KPICard title="Lucro 70%" value={`R$ ${fmt(kpi.lucro70)}`} icon={Wallet} variant="green"
                  trend={lucro70Trend.trend} trendUp={lucro70Trend.trendUp} trendNeutral={lucro70Trend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.lucro70)}`} hidden={hideValues || !isAdmin} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "450ms" }}>
                <KPICard title="Lucro 60%" value={`R$ ${fmt(kpi.lucro60)}`} icon={Wallet} variant="green"
                  trend={lucro60Trend.trend} trendUp={lucro60Trend.trendUp} trendNeutral={lucro60Trend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.lucro60)}`} hidden={hideValues || !isAdmin} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
                <KPICard title="Lucro 50%" value={`R$ ${fmt(kpi.lucro50)}`} icon={Wallet} variant="orange"
                  trend={lucro50Trend.trend} trendUp={lucro50Trend.trendUp} trendNeutral={lucro50Trend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.lucro50)}`} hidden={hideValues || !isAdmin} />
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
            <SpendChart data={filteredData} range={range} />
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
            <AdsTable ads={deduplicatedAds} salesData={filteredSalesData} prevAds={deduplicatedPrevAds} prevSalesData={filteredPrevSalesData} isAdmin={isAdmin} campaignBudgets={campaignBudgets} />
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
