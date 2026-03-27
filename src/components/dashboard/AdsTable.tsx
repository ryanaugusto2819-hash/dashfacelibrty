import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, Trash2, Play, TrendingUp, TrendingDown, Minus, Search, ArrowUp, ArrowDown, ArrowUpDown, DollarSign, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface SaleEntry {
  date: string;
  creative: string;
  campaign?: string;
  sales: number;
  revenue: number;
  country: string;
  currency?: string;
}

interface AdVideo {
  id: string;
  ad_name: string;
  video_url: string;
  file_name: string | null;
}

type CountryFilter = "all" | "uruguay" | "argentina";

type SortKey = "adName" | "spend" | "cpa" | "cpl" | "leads" | "sales" | "convRate" | "avgTicket" | "hookRate" | "bodyRate" | "ctr" | "cpm" | "revenue" | "roi" | "lucro70" | "lucro60" | "lucro50" | "lucro40";
type SortDir = "asc" | "desc";

interface AdsTableProps {
  ads: any[];
  salesData?: SaleEntry[];
  prevAds?: any[];
  prevSalesData?: SaleEntry[];
  isAdmin?: boolean;
  campaignBudgets?: Record<string, { daily_budget: number; name: string; status: string }>;
}

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AdsTable = ({ ads, salesData = [], prevAds = [], prevSalesData = [], isAdmin = false, campaignBudgets = {} }: AdsTableProps) => {
  const [adVideos, setAdVideos] = useState<Record<string, AdVideo>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [updatingBudget, setUpdatingBudget] = useState<string | null>(null);

  const handleBudgetUpdate = async (adName: string, campaignIds: string[]) => {
    const value = parseFloat(budgetValue.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setUpdatingBudget(adName);
    try {
      for (const campaignId of campaignIds) {
        const { data, error } = await supabase.functions.invoke("updateCampaignBudget", {
          body: { campaign_id: campaignId, daily_budget: value },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.details?.message || data.error);
      }
      toast.success(`Orçamento atualizado para R$${value.toFixed(2)}`);
      setEditingBudget(null);
      setBudgetValue("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar orçamento: " + (err.message || "erro desconhecido"));
    } finally {
      setUpdatingBudget(null);
    }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase.from("ad_videos").select("*");
      if (data) {
        const map: Record<string, AdVideo> = {};
        data.forEach((v: any) => { map[v.ad_name] = v; });
        setAdVideos(map);
      }
    };
    fetchVideos();
  }, []);

  const handleUpload = async (adName: string, file: File) => {
    try {
      setUploading(adName);
      const ext = file.name.split(".").pop();
      const path = `${adName.replace(/\s+/g, "_")}_${Date.now()}.${ext}`;
      const existing = adVideos[adName];
      if (existing) {
        const oldPath = existing.video_url.split("/ad-videos/")[1];
        if (oldPath) await supabase.storage.from("ad-videos").remove([oldPath]);
        await supabase.from("ad_videos").delete().eq("id", existing.id);
      }
      const { error: uploadError } = await supabase.storage.from("ad-videos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("ad-videos").getPublicUrl(path);
      const { data: insertData, error: insertError } = await supabase
        .from("ad_videos")
        .insert({ ad_name: adName, video_url: urlData.publicUrl, file_name: file.name })
        .select()
        .single();
      if (insertError) throw insertError;
      setAdVideos(prev => ({ ...prev, [adName]: insertData as AdVideo }));
      toast.success("Vídeo salvo com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (adName: string) => {
    const existing = adVideos[adName];
    if (!existing) return;
    try {
      const oldPath = existing.video_url.split("/ad-videos/")[1];
      if (oldPath) await supabase.storage.from("ad-videos").remove([oldPath]);
      await supabase.from("ad_videos").delete().eq("id", existing.id);
      setAdVideos(prev => {
        const copy = { ...prev };
        delete copy[adName];
        return copy;
      });
      toast.success("Vídeo removido");
    } catch {
      toast.error("Erro ao remover vídeo");
    }
  };

  const isEmpty = !ads || ads.length === 0;

  // Build rows data
  const allAdNames = ads.map(a => (a.ad_name || a.name || "").toLowerCase().trim()).filter(Boolean);

  const rows = ads.map((ad) => {
    const adName = ad.ad_name || ad.name || "";
    const adNameNorm = adName.toLowerCase().trim();
    const adCampaignNorm = (ad.campaign_name || "").toLowerCase().trim();
    const matchedSales = salesData.filter(s => {
      if (!adName) return false;
      const cFull = (s.creative || "").toLowerCase().trim();
      const campFull = (s.campaign || "").toLowerCase().trim();
      // Exact match by ad name
      if (cFull && adNameNorm === cFull) return true;
      // Exact match by campaign name
      if (campFull && adCampaignNorm && adCampaignNorm === campFull) return true;
      // Fuzzy match: one contains the other (handles missing parentheses/typos)
      if (campFull && adCampaignNorm && campFull.length > 5 && (adCampaignNorm.includes(campFull) || campFull.includes(adCampaignNorm))) return true;
      if (cFull && adCampaignNorm && cFull.length > 5 && (adCampaignNorm.includes(cFull) || cFull.includes(adCampaignNorm))) return true;
      // Fallback: stripped AR suffix
      if (cFull) {
        const cStripped = cFull.replace(/ ar$/, "");
        if (cStripped !== cFull && !allAdNames.includes(cFull) && adNameNorm === cStripped) return true;
      }
      return false;
    });
    const spend = ad.spend ?? ad.spent ?? 0;
    const leads = ad.leads ?? 0;
    const sales = matchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
    const revenue = matchedSales.reduce((sum, s) => {
      const raw = Number(s.revenue || 0);
      const currency = (s.currency || "").toUpperCase();
      if (currency === "UYU") return sum + raw / 7.49;
      if (currency === "ARS") return sum + raw / 266;
      return sum + raw;
    }, 0);
    const cpl = ad.costPerLead ?? ad.cpl ?? (leads > 0 ? spend / leads : 0);
    const cpa = ad.cpa ?? (sales > 0 ? spend / sales : 0);
    const convRate = leads > 0 ? (sales / leads) * 100 : 0;
    const avgTicket = sales > 0 ? revenue / sales : 0;
    const roi = spend > 0 ? revenue / spend : 0;
    const lucro70 = revenue * 0.7 - spend;
    const lucro60 = revenue * 0.6 - spend;
    const lucro50 = revenue * 0.5 - spend;
    const lucro40 = revenue * 0.4 - spend;

    const campaignName = (ad.campaign_name || "").toLowerCase().trim();
    return { ad, adName, campaignName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 };
  });

  // Build previous period rows map for comparison
  const prevAllAdNames = prevAds.map(a => (a.ad_name || a.name || "").toLowerCase().trim()).filter(Boolean);
  const prevAllCampaignNames = prevAds.map(a => (a.campaign_name || "").toLowerCase().trim()).filter(Boolean);
  const prevRowsMap = useMemo(() => {
    const map = new Map<string, typeof rows[0]>();
    prevAds.forEach((ad) => {
      const adName = ad.ad_name || ad.name || "";
      const adNameNorm = adName.toLowerCase().trim();
      const adCampaignNorm = (ad.campaign_name || "").toLowerCase().trim();
      const matchedSales = prevSalesData.filter(s => {
        if (!adName) return false;
        const cFull = (s.creative || "").toLowerCase().trim();
        const campFull = (s.campaign || "").toLowerCase().trim();
        if (cFull && adNameNorm === cFull) return true;
        if (campFull && adCampaignNorm && adCampaignNorm === campFull) return true;
        if (cFull) {
          const cStripped = cFull.replace(/ ar$/, "");
          if (cStripped !== cFull && !prevAllAdNames.includes(cFull) && adNameNorm === cStripped) return true;
        }
        return false;
      });
      const spend = ad.spend ?? ad.spent ?? 0;
      const leads = ad.leads ?? 0;
      const sales = matchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
      const revenue = matchedSales.reduce((sum, s) => {
        const raw = Number(s.revenue || 0);
        const currency = (s.currency || "").toUpperCase();
        if (currency === "UYU") return sum + raw / 7.49;
        if (currency === "ARS") return sum + raw / 266;
        return sum + raw;
      }, 0);
      const cpl = ad.costPerLead ?? ad.cpl ?? (leads > 0 ? spend / leads : 0);
      const cpa = ad.cpa ?? (sales > 0 ? spend / sales : 0);
      const convRate = leads > 0 ? (sales / leads) * 100 : 0;
      const avgTicket = sales > 0 ? revenue / sales : 0;
      const roi = spend > 0 ? revenue / spend : 0;
      const lucro70 = revenue * 0.7 - spend;
      const lucro60 = revenue * 0.6 - spend;
      const lucro50 = revenue * 0.5 - spend;
      const lucro40 = revenue * 0.4 - spend;
      const campaignName = adCampaignNorm;
      map.set(adNameNorm, { ad, adName, campaignName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 });
    });
    return map;
  }, [prevAds, prevSalesData, prevAllAdNames]);

  const allCampaignNames = ads.map(a => (a.campaign_name || "").toLowerCase().trim()).filter(Boolean);
  const unmatchedSales = salesData.filter(s => {
    const cFull = (s.creative || "").toLowerCase().trim();
    const campFull = (s.campaign || "").toLowerCase().trim();
    if (!cFull && !campFull) return true;
    if (cFull === "sem criativo" || cFull === "não identificado" || cFull === "sem crtiativo" || cFull === "criativo não identificado") return true;
    if (cFull && allAdNames.includes(cFull)) return false;
    if (campFull && allCampaignNames.includes(campFull)) return false;
    if (cFull) {
      const cStripped = cFull.replace(/ ar$/, "");
      if (cStripped !== cFull && !allAdNames.includes(cFull) && allAdNames.includes(cStripped)) return false;
    }
    return true;
  });
  const uSales = unmatchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
  const uRevenue = unmatchedSales.reduce((sum, s) => {
    const raw = Number(s.revenue || 0);
    const currency = (s.currency || "").toUpperCase();
    if (currency === "UYU") return sum + raw / 7.49;
    if (currency === "ARS") return sum + raw / 266;
    return sum + raw;
  }, 0);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (countryFilter !== "all") {
      result = result.filter(r => {
        const campaign = (r.ad.campaign_name || "").toUpperCase();
        const isAR = campaign.includes("(AR-") || campaign.includes("(AR ");
        const isUY = campaign.includes("(UY-") || campaign.includes("(UY ");
        if (countryFilter === "argentina") return isAR;
        return isUY || !isAR;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => r.adName.toLowerCase().includes(q) || (r.campaignName && r.campaignName.toLowerCase().includes(q)));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        if (sortKey === "adName") {
          aVal = a.adName.toLowerCase();
          bVal = b.adName.toLowerCase();
        } else if (sortKey === "hookRate" || sortKey === "bodyRate" || sortKey === "ctr" || sortKey === "cpm") {
          aVal = a.ad[sortKey] ?? 0;
          bVal = b.ad[sortKey] ?? 0;
        } else {
          aVal = (a as any)[sortKey] ?? 0;
          bVal = (b as any)[sortKey] ?? 0;
        }
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, searchQuery, countryFilter, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1 inline" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-primary ml-1 inline" />
      : <ArrowUp className="h-3 w-3 text-primary ml-1 inline" />;
  };

  const thBase = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors";

  const RoiIndicator = ({ value }: { value: number }) => {
    if (value > 1.5) return <TrendingUp className="h-3.5 w-3.5 text-profit inline ml-1" />;
    if (value < 1) return <TrendingDown className="h-3.5 w-3.5 text-loss inline ml-1" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />;
  };

  const ProfitCell = ({ value }: { value: number }) => (
    <span className={`font-medium ${value > 0 ? "text-profit" : "text-loss"}`}>
      R${fmt(value)}
    </span>
  );

  // Comparison cell: shows current value + prev value below in smaller text
  const MetricCell = ({ current, prev, prefix = "", suffix = "", invert = false, className = "" }: {
    current: number; prev?: number; prefix?: string; suffix?: string; invert?: boolean; className?: string;
  }) => {
    const hasPrev = prev != null && prev !== 0;
    return (
      <div className={className}>
        <div>{prefix}{fmt(current)}{suffix}</div>
        {hasPrev && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            {prefix}{fmt(prev)}{suffix}
          </div>
        )}
      </div>
    );
  };

  const ProfitCompareCell = ({ current, prev }: { current: number; prev?: number }) => {
    const hasPrev = prev != null && prev !== 0;
    return (
      <div>
        <span className={`font-medium ${current > 0 ? "text-profit" : "text-loss"}`}>R${fmt(current)}</span>
        {hasPrev && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            <span className={prev > 0 ? "text-profit/50" : "text-loss/50"}>R${fmt(prev)}</span>
          </div>
        )}
      </div>
    );
  };

  if (isEmpty) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground text-sm">
        Nenhum anúncio encontrado no período selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Métricas por Campanha</h2>
            <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">Performance individual de cada criativo</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Country filter */}
            <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/30">
              {([
                { value: "all" as CountryFilter, label: "Todos" },
                { value: "uruguay" as CountryFilter, label: "🇺🇾" },
                { value: "argentina" as CountryFilter, label: "🇦🇷" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCountryFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    countryFilter === opt.value
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 border-border/30 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Column group headers */}
            <thead>
              <tr className="border-b border-border/10">
                <th className="bg-secondary/10" />
                <th className="bg-secondary/10" />
                <th className="bg-secondary/10" />
                <th colSpan={3} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-primary/70 py-2 bg-primary/[0.03] border-x border-border/10">
                  💰 Custos
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-info/70 py-2 bg-info/[0.03] border-r border-border/10">
                  📊 Conversão
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-warning/70 py-2 bg-warning/[0.03] border-r border-border/10">
                  🎯 Engajamento
                </th>
                <th colSpan={2} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-success/70 py-2 bg-success/[0.03] border-r border-border/10">
                  📈 Receita
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-[hsl(280,65%,60%)]/70 py-2 bg-[hsl(280,65%,60%)]/[0.03] border-r border-border/10">
                  💎 Lucro Estimado
                </th>
                <th className="bg-secondary/10" />
              </tr>
              <tr className="border-b border-border/20 bg-secondary/20">
                <th onClick={() => toggleSort("adName")} className={`text-left ${thBase} min-w-[180px] sticky left-0 bg-secondary/20 z-10`}>Campanha <SortIcon col="adName" /></th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Status</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Orçamento</th>
                {/* Custos */}
                <th onClick={() => toggleSort("spend")} className={`text-right ${thBase} bg-primary/[0.02]`}>Gasto <SortIcon col="spend" /></th>
                <th onClick={() => toggleSort("cpa")} className={`text-right ${thBase} bg-primary/[0.02]`}>CPA <SortIcon col="cpa" /></th>
                <th onClick={() => toggleSort("cpl")} className={`text-right ${thBase} bg-primary/[0.02] border-r border-border/10`}>CPL <SortIcon col="cpl" /></th>
                {/* Conversão */}
                <th onClick={() => toggleSort("leads")} className={`text-right ${thBase} bg-info/[0.02]`}>Leads <SortIcon col="leads" /></th>
                <th onClick={() => toggleSort("sales")} className={`text-right ${thBase} bg-info/[0.02]`}>Vendas <SortIcon col="sales" /></th>
                <th onClick={() => toggleSort("convRate")} className={`text-right ${thBase} bg-info/[0.02]`}>Tx Conv. <SortIcon col="convRate" /></th>
                <th onClick={() => toggleSort("avgTicket")} className={`text-right ${thBase} bg-info/[0.02] border-r border-border/10`}>Ticket <SortIcon col="avgTicket" /></th>
                {/* Engajamento */}
                <th onClick={() => toggleSort("hookRate")} className={`text-right ${thBase} bg-warning/[0.02]`}>Hook <SortIcon col="hookRate" /></th>
                <th onClick={() => toggleSort("bodyRate")} className={`text-right ${thBase} bg-warning/[0.02]`}>Body <SortIcon col="bodyRate" /></th>
                <th onClick={() => toggleSort("ctr")} className={`text-right ${thBase} bg-warning/[0.02]`}>CTR <SortIcon col="ctr" /></th>
                <th onClick={() => toggleSort("cpm")} className={`text-right ${thBase} bg-warning/[0.02] border-r border-border/10`}>CPM <SortIcon col="cpm" /></th>
                {/* Receita */}
                <th onClick={() => toggleSort("revenue")} className={`text-right ${thBase} bg-success/[0.02]`}>Faturamento <SortIcon col="revenue" /></th>
                <th onClick={() => toggleSort("roi")} className={`text-right ${thBase} bg-success/[0.02] border-r border-border/10`}>ROAS <SortIcon col="roi" /></th>
                {/* Lucro */}
                <th onClick={() => toggleSort("lucro70")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>70% <SortIcon col="lucro70" /></th>
                <th onClick={() => toggleSort("lucro60")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>60% <SortIcon col="lucro60" /></th>
                <th onClick={() => toggleSort("lucro50")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>50% <SortIcon col="lucro50" /></th>
                <th onClick={() => toggleSort("lucro40")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02] border-r border-border/10`}>40% <SortIcon col="lucro40" /></th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Vídeo</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => {
                const { ad, adName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 } = row;
                const video = adVideos[adName];
                const isActive = ad.status === "active";
                const prev = prevRowsMap.get(adName.toLowerCase().trim());

                const tc = "text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap";

                return (
                  <tr
                    key={ad.ad_id || ad.id || i}
                    className="border-b border-border/[0.06] hover:bg-accent/40 transition-colors group"
                  >
                    {/* Name - sticky */}
                    <td className="px-4 py-3.5 font-medium text-sm whitespace-nowrap sticky left-0 bg-background/80 backdrop-blur-sm z-10 group-hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-profit' : 'bg-muted-foreground/40'}`} />
                        <span className="truncate max-w-[160px]" title={ad.campaign_name || adName}>{ad.campaign_name || adName || "—"}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-2 py-3.5 text-center">
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className={`text-[10px] px-2 py-0.5 ${isActive ? "bg-profit/15 text-profit border-profit/20 border" : "bg-muted/60 text-muted-foreground border-0"}`}
                      >
                        {isActive ? "Ativo" : ad.status === "paused" ? "Pausado" : "—"}
                      </Badge>
                    </td>
                    {/* Orçamento */}
                    <td className="px-2 py-3.5 text-center">
                      {(() => {
                        const campaignIds: string[] = ad.campaignIds || [];
                        // Get the max daily budget across campaigns for this ad
                        const budgetValues = campaignIds
                          .map((cid: string) => campaignBudgets[cid]?.daily_budget)
                          .filter((b: number | undefined): b is number => b != null && b > 0);
                        const currentBudget = budgetValues.length > 0 ? Math.max(...budgetValues) : null;

                        if (!isAdmin || campaignIds.length === 0) {
                          return <span className="text-muted-foreground text-xs">—</span>;
                        }

                        return (
                          <Popover open={editingBudget === adName} onOpenChange={(open) => {
                            if (open) {
                              setEditingBudget(adName);
                              setBudgetValue(currentBudget ? currentBudget.toString() : "");
                            } else {
                              setEditingBudget(null);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <button
                                className="flex flex-col items-center gap-0.5 text-xs hover:text-primary transition-colors cursor-pointer group/budget"
                                title="Clique para editar orçamento diário"
                              >
                                {currentBudget != null ? (
                                  <>
                                    <span className="font-medium tabular-nums text-foreground group-hover/budget:text-primary">
                                      R${fmt(currentBudget)}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60">diário</span>
                                  </>
                                ) : (
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" align="center">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Orçamento Diário (R$)</p>
                                {currentBudget != null && (
                                  <p className="text-[10px] text-muted-foreground/70">Atual: R${fmt(currentBudget)}</p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={budgetValue}
                                    onChange={(e) => setBudgetValue(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleBudgetUpdate(adName, campaignIds);
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                    disabled={updatingBudget === adName || !budgetValue}
                                    onClick={() => handleBudgetUpdate(adName, campaignIds)}
                                  >
                                    {updatingBudget === adName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                                {campaignIds.length > 1 && (
                                  <p className="text-[10px] text-muted-foreground">Será aplicado a {campaignIds.length} campanhas</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })()}
                    </td>
                    {/* Custos */}
                    <td className={`${tc} bg-primary/[0.01] font-medium`}><MetricCell current={spend} prev={prev?.spend} prefix="R$" /></td>
                    <td className={`${tc} bg-primary/[0.01]`}>
                      <div>
                        <span className={cpa >= 5 && cpa <= 100 ? "text-profit" : cpa > 100 && cpa <= 150 ? "text-warning" : "text-loss"}>
                          R${fmt(cpa)}
                        </span>
                        {prev && prev.cpa > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">R${fmt(prev.cpa)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-primary/[0.01] border-r border-border/[0.06]`}><MetricCell current={cpl} prev={prev?.cpl} prefix="R$" /></td>
                    {/* Conversão */}
                    <td className={`${tc} bg-info/[0.01]`}>
                      <div>
                        <div>{Math.round(leads)}</div>
                        {prev && prev.leads > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{Math.round(prev.leads)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01] font-medium`}>
                      <div>
                        <div>{Math.round(sales)}</div>
                        {prev && prev.sales > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{Math.round(prev.sales)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01]`}>
                      <div>
                        <span className={convRate >= 10 ? "text-profit" : convRate >= 5 ? "text-warning" : "text-muted-foreground"}>
                          {fmt(convRate)}%
                        </span>
                        {prev && prev.convRate > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.convRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01] border-r border-border/[0.06]`}><MetricCell current={avgTicket} prev={prev?.avgTicket} prefix="R$" /></td>
                    {/* Engajamento */}
                    <td className={`${tc} bg-warning/[0.01]`}>
                      <div>
                        <span className={(ad.hookRate ?? 0) >= 60 ? "text-profit" : (ad.hookRate ?? 0) >= 50 ? "text-warning" : "text-loss"}>
                          {fmt(ad.hookRate)}%
                        </span>
                        {prev && (prev.ad.hookRate ?? 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.ad.hookRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-warning/[0.01]`}>
                      <div>
                        <span className={(ad.bodyRate ?? 0) >= 3.5 ? "text-profit" : (ad.bodyRate ?? 0) >= 2 ? "text-warning" : "text-loss"}>
                          {fmt(ad.bodyRate)}%
                        </span>
                        {prev && (prev.ad.bodyRate ?? 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.ad.bodyRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-warning/[0.01]`}><MetricCell current={ad.ctr ?? 0} prev={prev?.ad.ctr} suffix="%" /></td>
                    <td className={`${tc} bg-warning/[0.01] border-r border-border/[0.06]`}><MetricCell current={ad.cpm ?? 0} prev={prev?.ad.cpm} prefix="R$" /></td>
                    {/* Receita */}
                    <td className={`${tc} bg-success/[0.01] font-semibold`}><MetricCell current={revenue} prev={prev?.revenue} prefix="R$" /></td>
                    <td className={`${tc} bg-success/[0.01] border-r border-border/[0.06]`}>
                      <div>
                        <span className={`font-semibold ${roi >= 1 ? "text-profit" : "text-loss"}`}>
                          {fmt(roi)}x
                        </span>
                        <RoiIndicator value={roi} />
                        {prev && prev.roi !== 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.roi)}x</div>
                        )}
                      </div>
                    </td>
                    {/* Lucro */}
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro70} prev={prev?.lucro70} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro60} prev={prev?.lucro60} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro50} prev={prev?.lucro50} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01] border-r border-border/[0.06]`}>{isAdmin ? <ProfitCompareCell current={lucro40} prev={prev?.lucro40} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    {/* Video */}
                    <td className="px-2 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          ref={el => { fileInputRefs.current[adName] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(adName, file);
                            e.target.value = "";
                          }}
                        />
                        {video ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10" onClick={() => setPreviewVideo(video.video_url)} title="Assistir vídeo">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-loss hover:bg-loss/10" onClick={() => handleDelete(adName)} title="Remover vídeo">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => fileInputRefs.current[adName]?.click()} disabled={uploading === adName} title="Enviar vídeo">
                            {uploading === adName ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Video className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Unmatched sales */}
              {uSales > 0 && (
                <tr className="border-t border-border/20 bg-muted/20">
                  <td className="px-4 py-3.5 font-medium text-sm whitespace-nowrap italic text-muted-foreground sticky left-0 bg-muted/20 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                      Sem criativo
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-center"><Badge variant="secondary" className="bg-muted/60 text-muted-foreground border-0 text-[10px]">—</Badge></td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 font-medium">{uSales.toLocaleString("pt-BR")}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 border-r border-border/[0.06]">R${fmt(uSales > 0 ? uRevenue / uSales : 0)}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 font-semibold">R${fmt(uRevenue)}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="px-2 py-3.5" />
                </tr>
              )}

              {/* TOTAL row */}
              {(() => {
                const tSpend = filteredRows.reduce((s, r) => s + r.spend, 0);
                const tLeads = filteredRows.reduce((s, r) => s + r.leads, 0);
                const tSales = filteredRows.reduce((s, r) => s + r.sales, 0) + uSales;
                const tRevenue = filteredRows.reduce((s, r) => s + r.revenue, 0) + uRevenue;
                const tCpa = tSales > 0 ? tSpend / tSales : 0;
                const tCpl = tLeads > 0 ? tSpend / tLeads : 0;
                const tConvRate = tLeads > 0 ? (tSales / tLeads) * 100 : 0;
                const tAvgTicket = tSales > 0 ? tRevenue / tSales : 0;
                const tRoas = tSpend > 0 ? tRevenue / tSpend : 0;
                const tLucro70 = tRevenue * 0.7 - tSpend;
                const tLucro60 = tRevenue * 0.6 - tSpend;
                const tLucro50 = tRevenue * 0.5 - tSpend;
                const tLucro40 = tRevenue * 0.4 - tSpend;
                const tImpressions = filteredRows.reduce((s, r) => s + (r.ad.impressions || 0), 0);
                const tClicks = filteredRows.reduce((s, r) => s + (r.ad.clicks || 0), 0);
                const tCtr = tImpressions > 0 ? (tClicks / tImpressions) * 100 : 0;
                const tCpm = tImpressions > 0 ? (tSpend / tImpressions) * 1000 : 0;
                const tHookWeighted = filteredRows.reduce((s, r) => s + (r.ad.hookRate || 0) * (r.ad.impressions || 0), 0);
                const tBodyWeighted = filteredRows.reduce((s, r) => s + (r.ad.bodyRate || 0) * (r.ad.impressions || 0), 0);
                const tHookRate = tImpressions > 0 ? tHookWeighted / tImpressions : 0;
                const tBodyRate = tImpressions > 0 ? tBodyWeighted / tImpressions : 0;

                const ttc = "text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap font-semibold";

                return (
                  <tr className="border-t-2 border-primary/30 bg-primary/[0.05]">
                    <td className="px-4 py-3.5 font-bold text-sm whitespace-nowrap sticky left-0 bg-primary/[0.05] z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                        TOTAL
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-center"><Badge className="bg-primary/15 text-primary border-primary/20 border text-[10px] px-2 py-0.5">{filteredRows.length}</Badge></td>
                    <td className="px-2 py-3.5 text-center text-muted-foreground text-xs">—</td>
                    <td className={`${ttc} bg-primary/[0.02]`}>R${fmt(tSpend)}</td>
                    <td className={`${ttc} bg-primary/[0.02]`}>R${fmt(tCpa)}</td>
                    <td className={`${ttc} bg-primary/[0.02] border-r border-border/[0.06]`}>R${fmt(tCpl)}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>{tLeads.toLocaleString("pt-BR")}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>{tSales.toLocaleString("pt-BR")}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>
                      <span className={tConvRate >= 10 ? "text-profit" : tConvRate >= 5 ? "text-warning" : "text-muted-foreground"}>{fmt(tConvRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-info/[0.02] border-r border-border/[0.06]`}>R${fmt(tAvgTicket)}</td>
                    <td className={`${ttc} bg-warning/[0.02]`}>
                      <span className={tHookRate >= 60 ? "text-profit" : tHookRate >= 50 ? "text-warning" : "text-loss"}>{fmt(tHookRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-warning/[0.02]`}>
                      <span className={tBodyRate >= 3.5 ? "text-profit" : tBodyRate >= 2 ? "text-warning" : "text-loss"}>{fmt(tBodyRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-warning/[0.02]`}>{fmt(tCtr)}%</td>
                    <td className={`${ttc} bg-warning/[0.02] border-r border-border/[0.06]`}>R${fmt(tCpm)}</td>
                    <td className={`${ttc} bg-success/[0.02]`}>R${fmt(tRevenue)}</td>
                    <td className={`${ttc} bg-success/[0.02] border-r border-border/[0.06]`}>
                      <span className={`${tRoas >= 1 ? "text-profit" : "text-loss"}`}>{fmt(tRoas)}x</span>
                      <RoiIndicator value={tRoas} />
                    </td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro70} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro60} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro50} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01] border-r border-border/[0.06]`}>{isAdmin ? <ProfitCell value={tLucro40} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className="px-2 py-3.5" />
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Vídeo do Criativo</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <video src={previewVideo} controls autoPlay className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdsTable;
