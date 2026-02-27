import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdsTableProps {
  ads: any[];
}

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AdsTable = ({ ads }: AdsTableProps) => {
  if (!ads || ads.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        Nenhum anúncio encontrado no período selecionado.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h2 className="text-lg font-display font-semibold">Métricas por Anúncio</h2>
        <p className="text-xs text-muted-foreground mt-1">Performance individual de cada criativo</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider min-w-[200px]">Anúncio</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Gasto</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Impressões</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Cliques</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CTR</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPM</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPC</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Leads</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPL</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Hook Rate</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Body Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad, i) => (
              <TableRow key={ad.ad_id || ad.id || i} className="border-border/20 hover:bg-secondary/30 transition-colors">
                <TableCell className="font-medium text-sm">{ad.ad_name || ad.name || "—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R${fmt(ad.spend ?? ad.spent)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{(ad.impressions ?? 0).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{(ad.clicks ?? 0).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(ad.ctr)}%</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R${fmt(ad.cpm)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R${fmt(ad.cpc)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{(ad.leads ?? 0).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R${fmt(ad.costPerLead ?? ad.cpl)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={(ad.hookRate ?? 0) >= 40 ? "text-profit" : (ad.hookRate ?? 0) >= 30 ? "text-warning" : "text-loss"}>
                    {fmt(ad.hookRate)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={(ad.bodyRate ?? 0) >= 30 ? "text-profit" : (ad.bodyRate ?? 0) >= 20 ? "text-warning" : "text-loss"}>
                    {fmt(ad.bodyRate)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdsTable;
