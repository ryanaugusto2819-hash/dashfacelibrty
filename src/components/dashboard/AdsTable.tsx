import { AdMetric } from "@/data/mockData";
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
  ads: AdMetric[];
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AdsTable = ({ ads }: AdsTableProps) => {
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
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Gasto</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPM</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CTR</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Hook Rate</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Body Rate</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPL</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">CPA</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Leads</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Vendas</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Tx Conv.</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Ticket Médio</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Lucro 70%</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Lucro 60%</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Lucro 50%</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">Lucro 40%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad) => (
              <TableRow key={ad.id} className="border-border/20 hover:bg-secondary/30 transition-colors">
                <TableCell className="font-medium text-sm">{ad.name}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={ad.status === "active" ? "default" : "secondary"}
                    className={ad.status === "active" ? "bg-success/20 text-profit border-0 text-xs" : "bg-muted text-muted-foreground border-0 text-xs"}
                  >
                    {ad.status === "active" ? "Ativo" : "Pausado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ad.spent)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ad.cpm)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(ad.ctr)}%</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.hookRate >= 40 ? "text-profit" : ad.hookRate >= 30 ? "text-warning" : "text-loss"}>
                    {fmt(ad.hookRate)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.bodyRate >= 30 ? "text-profit" : ad.bodyRate >= 20 ? "text-warning" : "text-loss"}>
                    {fmt(ad.bodyRate)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ad.cpl)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ad.cpa)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{ad.leads}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{ad.sales}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(ad.conversionRate)}%</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ad.averageTicket)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.revenue * 0.7 - ad.spent > 0 ? "text-profit" : "text-loss"}>
                    R$ {fmt(ad.revenue * 0.7 - ad.spent)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.revenue * 0.6 - ad.spent > 0 ? "text-profit" : "text-loss"}>
                    R$ {fmt(ad.revenue * 0.6 - ad.spent)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.revenue * 0.5 - ad.spent > 0 ? "text-profit" : "text-loss"}>
                    R$ {fmt(ad.revenue * 0.5 - ad.spent)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ad.revenue * 0.4 - ad.spent > 0 ? "text-profit" : "text-loss"}>
                    R$ {fmt(ad.revenue * 0.4 - ad.spent)}
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
