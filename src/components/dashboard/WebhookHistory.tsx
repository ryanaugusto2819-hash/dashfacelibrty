import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

interface WebhookRow {
  id: string;
  created_at: string;
  date: string;
  campaign: string;
  creative: string;
  country: string;
  sales: number;
  revenue: number;
  currency: string;
  phone: string | null;
}

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

const formatRevenue = (value: number, currency: string) => {
  const cur = (currency || "BRL").toUpperCase();
  const symbol = cur === "BRL" ? "R$" : cur === "UYU" ? "$U" : cur === "ARS" ? "AR$" : cur === "USD" ? "US$" : cur;
  return `${symbol}${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const WebhookHistory = () => {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("webhook_sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as WebhookRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Últimos webhooks recebidos</span>
          <span className="text-xs text-muted-foreground">{rows.length} registros</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="overflow-auto max-h-[480px]">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 sticky top-0 backdrop-blur">
            <tr className="text-left text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2 font-semibold">Recebido</th>
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-4 py-2 font-semibold">Campanha</th>
              <th className="px-4 py-2 font-semibold">Criativo</th>
              <th className="px-4 py-2 font-semibold">País</th>
              <th className="px-4 py-2 font-semibold">Telefone</th>
              <th className="px-4 py-2 font-semibold text-right">Vendas</th>
              <th className="px-4 py-2 font-semibold text-right">Receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum webhook recebido ainda.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const zero = Number(r.revenue || 0) === 0;
              return (
                <tr key={r.id} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-2 max-w-[280px] truncate" title={r.campaign}>{r.campaign || <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="px-4 py-2 max-w-[180px] truncate" title={r.creative}>{r.creative || <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.country || "—"}</td>
                  <td className="px-4 py-2 whitespace-nowrap font-mono text-[11px]">{r.phone || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.sales}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${zero ? "text-amber-400" : ""}`}>
                    {formatRevenue(Number(r.revenue), r.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WebhookHistory;
