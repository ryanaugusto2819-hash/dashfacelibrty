import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, Trash2, Play, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SaleEntry {
  date: string;
  creative: string;
  sales: number;
  revenue: number;
  country: string;
}

interface AdVideo {
  id: string;
  ad_name: string;
  video_url: string;
  file_name: string | null;
}

interface AdsTableProps {
  ads: any[];
  salesData?: SaleEntry[];
}

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AdsTable = ({ ads, salesData = [] }: AdsTableProps) => {
  const [adVideos, setAdVideos] = useState<Record<string, AdVideo>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  if (!ads || ads.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground text-sm">
        Nenhum anúncio encontrado no período selecionado.
      </div>
    );
  }

  // Build rows data
  const allAdNames = ads.map(a => (a.ad_name || a.name || "").toLowerCase().trim()).filter(Boolean);

  const rows = ads.map((ad) => {
    const adName = ad.ad_name || ad.name || "";
    const adNameNorm = adName.toLowerCase().trim();
    const matchedSales = salesData.filter(s => {
      if (!s.creative || !adName) return false;
      const cFull = s.creative.toLowerCase().trim();
      if (!cFull) return false;
      if (adNameNorm === cFull) return true;
      const cStripped = cFull.replace(/ ar$/, "");
      if (cStripped !== cFull && !allAdNames.includes(cFull) && adNameNorm === cStripped) return true;
      return false;
    });
    const spend = ad.spend ?? ad.spent ?? 0;
    const leads = ad.leads ?? 0;
    const sales = matchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
    const revenue = matchedSales.reduce((sum, s) => {
      const raw = Number(s.revenue || 0);
      const country = (s.country || "").toLowerCase();
      const creative = (s.creative || "").toLowerCase().trim();
      const isAR = country.includes("argentin") || creative.endsWith(" ar");
      return sum + raw / (isAR ? 266 : 7.49);
    }, 0);
    const cpl = ad.costPerLead ?? ad.cpl ?? (leads > 0 ? spend / leads : 0);
    const cpa = ad.cpa ?? (sales > 0 ? spend / sales : 0);
    const convRate = leads > 0 ? (sales / leads) * 100 : 0;
    const avgTicket = sales > 0 ? revenue / sales : 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
    const lucro70 = revenue * 0.7 - spend;
    const lucro60 = revenue * 0.6 - spend;
    const lucro50 = revenue * 0.5 - spend;
    const lucro40 = revenue * 0.4 - spend;

    return { ad, adName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 };
  });

  // Unmatched sales
  const unmatchedSales = salesData.filter(s => {
    if (!s.creative) return true;
    const cFull = s.creative.toLowerCase().trim();
    if (!cFull || cFull === "sem criativo" || cFull === "não identificado" || cFull === "sem crtiativo" || cFull === "criativo não identificado") return true;
    if (allAdNames.includes(cFull)) return false;
    const cStripped = cFull.replace(/ ar$/, "");
    if (cStripped !== cFull && !allAdNames.includes(cFull) && allAdNames.includes(cStripped)) return false;
    return true;
  });
  const uSales = unmatchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
  const uRevenue = unmatchedSales.reduce((sum, s) => {
    const raw = Number(s.revenue || 0);
    const country = (s.country || "").toLowerCase();
    const creative = (s.creative || "").toLowerCase().trim();
    const isAR = country.includes("argentin") || creative.endsWith(" ar");
    return sum + raw / (isAR ? 266 : 7.49);
  }, 0);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(r => r.adName.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const RoiIndicator = ({ value }: { value: number }) => {
    if (value > 50) return <TrendingUp className="h-3.5 w-3.5 text-profit inline ml-1" />;
    if (value < 0) return <TrendingDown className="h-3.5 w-3.5 text-loss inline ml-1" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />;
  };

  const ProfitCell = ({ value }: { value: number }) => (
    <span className={`font-medium ${value > 0 ? "text-profit" : "text-loss"}`}>
      R${fmt(value)}
    </span>
  );

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/30">
          <h2 className="text-lg font-display font-semibold">Métricas por Anúncio</h2>
          <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">Performance individual de cada criativo</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Column group headers */}
            <thead>
              <tr className="border-b border-border/10">
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
                <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-3 min-w-[180px] sticky left-0 bg-secondary/20 z-10">Anúncio</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Status</th>
                {/* Custos */}
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-primary/[0.02]">Gasto</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-primary/[0.02]">CPA</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-primary/[0.02] border-r border-border/10">CPL</th>
                {/* Conversão */}
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-info/[0.02]">Leads</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-info/[0.02]">Vendas</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-info/[0.02]">Tx Conv.</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-info/[0.02] border-r border-border/10">Ticket</th>
                {/* Engajamento */}
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-warning/[0.02]">Hook</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-warning/[0.02]">Body</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-warning/[0.02]">CTR</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-warning/[0.02] border-r border-border/10">CPM</th>
                {/* Receita */}
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-success/[0.02]">Faturamento</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-success/[0.02] border-r border-border/10">ROI</th>
                {/* Lucro */}
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.02]">70%</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.02]">60%</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.02]">50%</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.02] border-r border-border/10">40%</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Vídeo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const { ad, adName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 } = row;
                const video = adVideos[adName];
                const isActive = ad.status === "active";

                return (
                  <tr
                    key={ad.ad_id || ad.id || i}
                    className="border-b border-border/[0.06] hover:bg-accent/40 transition-colors group"
                  >
                    {/* Name - sticky */}
                    <td className="px-4 py-3.5 font-medium text-sm whitespace-nowrap sticky left-0 bg-background/80 backdrop-blur-sm z-10 group-hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-profit' : 'bg-muted-foreground/40'}`} />
                        <span className="truncate max-w-[160px]" title={adName}>{adName || "—"}</span>
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
                    {/* Custos */}
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-primary/[0.01] font-medium">R${fmt(spend)}</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-primary/[0.01]">R${fmt(cpa)}</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-primary/[0.01] border-r border-border/[0.06]">R${fmt(cpl)}</td>
                    {/* Conversão */}
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-info/[0.01]">{leads.toLocaleString("pt-BR")}</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-info/[0.01] font-medium">{sales.toLocaleString("pt-BR")}</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-info/[0.01]">
                      <span className={convRate >= 10 ? "text-profit" : convRate >= 5 ? "text-warning" : "text-muted-foreground"}>
                        {fmt(convRate)}%
                      </span>
                    </td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-info/[0.01] border-r border-border/[0.06]">R${fmt(avgTicket)}</td>
                    {/* Engajamento */}
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-warning/[0.01]">
                      <span className={(ad.hookRate ?? 0) >= 40 ? "text-profit" : (ad.hookRate ?? 0) >= 30 ? "text-warning" : "text-loss"}>
                        {fmt(ad.hookRate)}%
                      </span>
                    </td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-warning/[0.01]">
                      <span className={(ad.bodyRate ?? 0) >= 30 ? "text-profit" : (ad.bodyRate ?? 0) >= 20 ? "text-warning" : "text-loss"}>
                        {fmt(ad.bodyRate)}%
                      </span>
                    </td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-warning/[0.01]">{fmt(ad.ctr)}%</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-warning/[0.01] border-r border-border/[0.06]">R${fmt(ad.cpm)}</td>
                    {/* Receita */}
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-success/[0.01] font-semibold">R${fmt(revenue)}</td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-success/[0.01] border-r border-border/[0.06]">
                      <span className={`font-semibold ${roi > 0 ? "text-profit" : "text-loss"}`}>
                        {fmt(roi)}%
                      </span>
                      <RoiIndicator value={roi} />
                    </td>
                    {/* Lucro */}
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.01]"><ProfitCell value={lucro70} /></td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.01]"><ProfitCell value={lucro60} /></td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.01]"><ProfitCell value={lucro50} /></td>
                    <td className="text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap bg-[hsl(280,65%,60%)]/[0.01] border-r border-border/[0.06]"><ProfitCell value={lucro40} /></td>
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
