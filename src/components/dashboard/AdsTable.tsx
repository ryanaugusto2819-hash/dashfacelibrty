import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AdsTableProps {
  ads: any[];
}

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const th = "text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right";
const td = "text-right text-sm tabular-nums";

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad, i) => {
              const spend = ad.spend ?? ad.spent ?? 0;
              const leads = ad.leads ?? 0;
              const sales = ad.sales ?? 0;
              const revenue = ad.revenue ?? 0;
              const cpl = ad.costPerLead ?? ad.cpl ?? (leads > 0 ? spend / leads : 0);
              const cpa = ad.cpa ?? (sales > 0 ? spend / sales : 0);
              const convRate = leads > 0 ? (sales / leads) * 100 : 0;
              const avgTicket = sales > 0 ? revenue / sales : 0;
              const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
              const lucro70 = revenue * 0.7 - spend;
              const lucro60 = revenue * 0.6 - spend;
              const lucro50 = revenue * 0.5 - spend;
              const lucro40 = revenue * 0.4 - spend;

              return (
                <TableRow key={ad.ad_id || ad.id || i} className="border-border/20 hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium text-sm">{ad.ad_name || ad.name || "—"}</TableCell>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdsTable;
