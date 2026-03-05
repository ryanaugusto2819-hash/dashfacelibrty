import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Upload, Trash2, Play } from "lucide-react";
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

const th = "text-muted-foreground text-[10px] font-semibold uppercase tracking-widest text-right whitespace-nowrap px-3 py-3";
const td = "text-right text-sm tabular-nums px-3 py-3 whitespace-nowrap";

const AdsTable = ({ ads, salesData = [] }: AdsTableProps) => {
  const [adVideos, setAdVideos] = useState<Record<string, AdVideo>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
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

      // Delete old video if exists
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
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        Nenhum anúncio encontrado no período selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h2 className="text-lg font-display font-semibold">Métricas por Anúncio</h2>
          <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">Performance individual de cada criativo</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent bg-secondary/20">
                <TableHead className={`${th} min-w-[200px] text-left`}>Anúncio</TableHead>
                <TableHead className={th}>Status</TableHead>
                <TableHead className={th}>Gasto</TableHead>
                <TableHead className={th}>Vendas</TableHead>
                <TableHead className={th}>CPA</TableHead>
                <TableHead className={th}>Leads</TableHead>
                <TableHead className={th}>CPL</TableHead>
                <TableHead className={th}>Tx Conv.</TableHead>
                <TableHead className={th}>Ticket Médio</TableHead>
                <TableHead className={th}>Body Rate</TableHead>
                <TableHead className={th}>Hook Rate</TableHead>
                <TableHead className={th}>CTR</TableHead>
                <TableHead className={th}>CPM</TableHead>
                <TableHead className={th}>Faturamento</TableHead>
                <TableHead className={th}>ROI</TableHead>
                <TableHead className={th}>Lucro 70%</TableHead>
                <TableHead className={th}>Lucro 60%</TableHead>
                <TableHead className={th}>Lucro 50%</TableHead>
                <TableHead className={th}>Lucro 40%</TableHead>
                <TableHead className={`${th} text-center`}>Vídeo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad, i) => {
                const adName = ad.ad_name || ad.name || "";
                const matchedSales = salesData.filter(s => {
                  if (!s.creative || !adName) return false;
                  const c = s.creative.toLowerCase().trim();
                  const a = adName.toLowerCase().trim();
                  if (!c || !a) return false;
                  return a === c;
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
                const video = adVideos[adName];

                return (
                  <TableRow key={ad.ad_id || ad.id || i} className="border-border/10 hover:bg-secondary/40 transition-colors even:bg-secondary/10">
                    <TableCell className="font-medium text-sm px-3 py-3 whitespace-nowrap">{adName || "—"}</TableCell>
                    <TableCell className={td}>
                      <Badge
                        variant={ad.status === "active" ? "default" : "secondary"}
                        className={ad.status === "active" ? "bg-success/20 text-profit border-0 text-xs" : "bg-muted text-muted-foreground border-0 text-xs"}
                      >
                        {ad.status === "active" ? "Ativo" : ad.status === "paused" ? "Pausado" : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className={td}>R${fmt(spend)}</TableCell>
                    <TableCell className={td}>{sales.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className={td}>R${fmt(cpa)}</TableCell>
                    <TableCell className={td}>{leads.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className={td}>R${fmt(cpl)}</TableCell>
                    <TableCell className={td}>{fmt(convRate)}%</TableCell>
                    <TableCell className={td}>R${fmt(avgTicket)}</TableCell>
                    <TableCell className={td}>
                      <span className={(ad.bodyRate ?? 0) >= 30 ? "text-profit" : (ad.bodyRate ?? 0) >= 20 ? "text-warning" : "text-loss"}>
                        {fmt(ad.bodyRate)}%
                      </span>
                    </TableCell>
                    <TableCell className={td}>
                      <span className={(ad.hookRate ?? 0) >= 40 ? "text-profit" : (ad.hookRate ?? 0) >= 30 ? "text-warning" : "text-loss"}>
                        {fmt(ad.hookRate)}%
                      </span>
                    </TableCell>
                    <TableCell className={td}>{fmt(ad.ctr)}%</TableCell>
                    <TableCell className={td}>R${fmt(ad.cpm)}</TableCell>
                    <TableCell className={td}>R${fmt(revenue)}</TableCell>
                    <TableCell className={td}>
                      <span className={roi > 0 ? "text-profit" : "text-loss"}>{fmt(roi)}%</span>
                    </TableCell>
                    <TableCell className={td}>
                      <span className={lucro70 > 0 ? "text-profit" : "text-loss"}>R${fmt(lucro70)}</span>
                    </TableCell>
                    <TableCell className={td}>
                      <span className={lucro60 > 0 ? "text-profit" : "text-loss"}>R${fmt(lucro60)}</span>
                    </TableCell>
                    <TableCell className={td}>
                      <span className={lucro50 > 0 ? "text-profit" : "text-loss"}>R${fmt(lucro50)}</span>
                    </TableCell>
                    <TableCell className={td}>
                      <span className={lucro40 > 0 ? "text-profit" : "text-loss"}>R${fmt(lucro40)}</span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setPreviewVideo(video.video_url)}
                              title="Assistir vídeo"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-loss hover:bg-loss/10"
                              onClick={() => handleDelete(adName)}
                              title="Remover vídeo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => fileInputRefs.current[adName]?.click()}
                            disabled={uploading === adName}
                            title="Enviar vídeo"
                          >
                            {uploading === adName ? (
                              <Upload className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                              <Video className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Unmatched sales row */}
              {(() => {
                const adNames = ads.map(ad => (ad.ad_name || ad.name || "").toLowerCase().trim()).filter(Boolean);
                const unmatchedSales = salesData.filter(s => {
                  if (!s.creative) return true;
                  const c = s.creative.toLowerCase().trim();
                  if (!c || c === "sem criativo" || c === "não identificado") return true;
                  return !adNames.includes(c);
                });
                const uSales = unmatchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
                const uRevenue = unmatchedSales.reduce((sum, s) => {
                  const raw = Number(s.revenue || 0);
                  const country = (s.country || "").toLowerCase();
                  if (country.includes("argentin")) return sum + raw / 266;
                  return sum + raw / 7.49;
                }, 0);
                if (uSales === 0) return null;
                return (
                  <TableRow className="border-border/10 hover:bg-secondary/40 transition-colors bg-muted/30">
                    <TableCell className="font-medium text-sm px-3 py-3 whitespace-nowrap italic text-muted-foreground">Sem criativo</TableCell>
                    <TableCell className={td}><Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs">—</Badge></TableCell>
                    <TableCell className={td}>R$0,00</TableCell>
                    <TableCell className={td}>{uSales.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>R${fmt(uSales > 0 ? uRevenue / uSales : 0)}</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>R${fmt(uRevenue)}</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className={td}>—</TableCell>
                    <TableCell className="px-3 py-3" />
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Vídeo do Criativo</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <video
              src={previewVideo}
              controls
              autoPlay
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdsTable;
