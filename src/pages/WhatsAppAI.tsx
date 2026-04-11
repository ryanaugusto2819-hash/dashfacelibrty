import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertCircle, ArrowLeft, Bot, Brain, CheckCircle2, ChevronRight,
  Clock, MessageCircle, Phone, Play, Plus, RefreshCw, Settings,
  Trash2, TrendingUp, Wifi, Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useZAPIConfig, useUpsertZAPIConfig,
  useCampaignConfigs, useUpsertCampaignConfig, useDeleteCampaignConfig,
  useAITrainingData, useUpsertTrainingData, useDeleteTrainingData,
  useOptimizationSuggestions, useWhatsAppConversations, useAIAnalysisLogs,
  useRunCampaignMonitor, useSendTestMessage,
  useFetchMetaCampaigns, useImportCampaignsFromMeta,
  type CampaignConfig, type AITrainingData, type ZAPIConfig, type MetaCampaign,
} from "@/hooks/useWhatsAppAI";

// ─── Helpers ─────────────────────────────────────────────────

const statusConfig = {
  pending:  { label: "Pendente",  color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  approved: { label: "Aprovado",  color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  applied:  { label: "Aplicado",  color: "bg-green-500/10 text-green-400 border-green-500/30" },
  rejected: { label: "Rejeitado", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  expired:  { label: "Expirado",  color: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  error:    { label: "Erro",      color: "bg-red-500/10 text-red-400 border-red-500/30" },
} as const;

const suggestionTypeLabels: Record<string, string> = {
  budget_increase: "Aumento de Orçamento",
  budget_decrease: "Redução de Orçamento",
  pause:           "Pausar Campanha",
  resume:          "Retomar Campanha",
  creative_rotate: "Rotação de Criativo",
  audience_adjust: "Ajuste de Público",
  schedule_adjust: "Ajuste de Horário",
};

const trainingTypeLabels: Record<string, string> = {
  rule: "Regra", example: "Exemplo", context: "Contexto", persona: "Persona",
};

const trainingCategoryLabels: Record<string, string> = {
  budget: "Orçamento", performance: "Performance", audience: "Público",
  creative: "Criativo", general: "Geral", persona: "Persona",
};

// ─── Page ─────────────────────────────────────────────────────

export default function WhatsAppAI() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "hsl(258 35% 5%)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-border/40 px-6 py-3.5"
        style={{ background: "hsl(258 35% 5% / 0.85)", backdropFilter: "blur(24px)" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />Voltar
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(21,128,61,0.15))",
                boxShadow: "0 0 20px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              <Bot className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Liberty AI</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">WhatsApp Campaign Optimizer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-10 mb-6">
            <TabsTrigger value="dashboard"     className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="campanhas"     className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />Campanhas</TabsTrigger>
            <TabsTrigger value="treinamento"   className="gap-1.5 text-xs"><Brain className="w-3.5 h-3.5" />Treinamento</TabsTrigger>
            <TabsTrigger value="historico"     className="gap-1.5 text-xs"><MessageCircle className="w-3.5 h-3.5" />Histórico</TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" />Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"     ><DashboardTab /></TabsContent>
          <TabsContent value="campanhas"     ><CampanhasTab /></TabsContent>
          <TabsContent value="treinamento"   ><TreinamentoTab /></TabsContent>
          <TabsContent value="historico"     ><HistoricoTab /></TabsContent>
          <TabsContent value="configuracoes" ><ConfiguracoesTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────

function DashboardTab() {
  const { data: suggestions = [] } = useOptimizationSuggestions();
  const { data: conversations = [] } = useWhatsAppConversations();
  const { data: campaigns = [] } = useCampaignConfigs();
  const { data: logs = [] } = useAIAnalysisLogs();
  const runMonitor = useRunCampaignMonitor();

  const pending  = suggestions.filter(s => s.status === "pending");
  const applied  = suggestions.filter(s => s.status === "applied");

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pendentes",        value: pending.length,    color: "text-yellow-400", icon: <Clock className="w-7 h-7 text-yellow-500/40" /> },
          { label: "Aplicadas",        value: applied.length,    color: "text-green-400",  icon: <CheckCircle2 className="w-7 h-7 text-green-500/40" /> },
          { label: "Campanhas Ativas", value: campaigns.filter(c => c.monitoring_enabled).length, color: "text-violet-400", icon: <Zap className="w-7 h-7 text-violet-500/40" /> },
          { label: "Msgs Trocadas",    value: conversations.length, color: "text-blue-400", icon: <MessageCircle className="w-7 h-7 text-blue-500/40" /> },
        ].map(k => (
          <Card key={k.label} className="border-border/40 bg-card/50">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                </div>
                {k.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Run Analysis */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-green-400" />Executar Análise Agora
            </CardTitle>
            <CardDescription>Aciona a IA para analisar todas as campanhas ativas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => runMonitor.mutate({})} disabled={runMonitor.isPending}>
              {runMonitor.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Analisando...</> : <><Bot className="w-4 h-4" />Analisar Campanhas</>}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => runMonitor.mutate({ force: true })} disabled={runMonitor.isPending}>
              <RefreshCw className="w-4 h-4" />Forçar (ignorar pendentes)
            </Button>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />Sugestões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sugestão aguardando resposta.</p>
            ) : (
              <div className="space-y-2">
                {pending.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{s.campaign_configs?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{suggestionTypeLabels[s.suggestion_type] || s.suggestion_type}</p>
                    </div>
                    <div className="text-right">
                      {s.current_value != null && s.suggested_value != null && (
                        <p className="text-xs font-mono">R$ {s.current_value} → R$ {s.suggested_value}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(s.created_at), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4" />Últimas Análises da IA</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma análise executada ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {logs.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.error ? "bg-red-500" : "bg-green-500"}`} />
                  <span className="font-medium flex-1">{log.campaign_configs?.name || "—"}</span>
                  <span className="text-xs text-muted-foreground">{log.analysis_type === "scheduled_check" ? "automático" : "manual"}</span>
                  {log.tokens_used && <span className="text-xs text-muted-foreground">{log.tokens_used} tokens</span>}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Campanhas ────────────────────────────────────────────────

function CampanhasTab() {
  const { data: campaigns = [], isLoading } = useCampaignConfigs();
  const upsert = useUpsertCampaignConfig();
  const deleteCampaign = useDeleteCampaignConfig();
  const runMonitor = useRunCampaignMonitor();
  const fetchMeta = useFetchMetaCampaigns();
  const importMeta = useImportCampaignsFromMeta();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const autoImportDone = useRef(false);

  // Auto-import on first load when no campaigns exist
  useEffect(() => {
    if (!isLoading && campaigns.length === 0 && !autoImportDone.current && !fetchMeta.isPending) {
      autoImportDone.current = true;
      handleAutoImport();
    }
  }, [isLoading, campaigns.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAutoImport() {
    try {
      const data = await fetchMeta.mutateAsync();
      if (data && data.length > 0) {
        const withSpend = data.filter(c => c.spend > 0);
        if (withSpend.length > 0) {
          await importMeta.mutateAsync(withSpend);
        }
      }
    } catch { /* handled by hook */ }
  }

  async function handleFetchMeta() {
    const data = await fetchMeta.mutateAsync();
    if (data) {
      const withSpend = data.filter(c => c.spend > 0);
      setMetaCampaigns(withSpend.length > 0 ? withSpend : data);
      setSelected(new Set((withSpend.length > 0 ? withSpend : data).map(c => c.campaign_id)));
      setImportOpen(true);
    }
  }

  async function handleImport() {
    const toImport = metaCampaigns.filter(c => selected.has(c.campaign_id));
    await importMeta.mutateAsync(toImport);
    setImportOpen(false);
  }

  const emptyForm: Partial<CampaignConfig> = {
    name: "", campaign_id: "", adset_id: "", bm_account: null, country: "brasil",
    budget_current: 0, budget_min: 0, budget_max: 1000,
    target_roas: undefined, target_cpa: undefined, target_ctr: undefined,
    monitoring_enabled: true, monitoring_interval: 60, auto_apply: false,
  };
  const [form, setForm] = useState<Partial<CampaignConfig>>(emptyForm);

  function openNew() { setForm(emptyForm); setOpen(true); }
  function openEdit(c: CampaignConfig) { setForm(c); setOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campanhas Monitoradas</h2>
          <p className="text-sm text-muted-foreground">Importe suas campanhas reais do Meta ou adicione manualmente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={handleAutoImport} disabled={fetchMeta.isPending || importMeta.isPending}>
            {fetchMeta.isPending || importMeta.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Sincronizando...</> : <><RefreshCw className="w-4 h-4" />Sincronizar Meta</>}
          </Button>
          <Button variant="outline" className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={handleFetchMeta} disabled={fetchMeta.isPending}>
            {fetchMeta.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</> : <><RefreshCw className="w-4 h-4" />Escolher</>}
          </Button>
          <Button onClick={openNew} className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" />Manual
          </Button>
        </div>
      </div>

      {/* Import from Meta Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />Campanhas encontradas no Meta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Selecione as campanhas que deseja monitorar. Dados dos últimos 7 dias.</p>
          <div className="space-y-2 py-2">
            {metaCampaigns.map(c => (
              <div key={c.campaign_id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(c.campaign_id) ? "border-violet-500/40 bg-violet-500/10" : "border-border/40 bg-card/50 opacity-60"}`}
                onClick={() => setSelected(prev => { const s = new Set(prev); s.has(c.campaign_id) ? s.delete(c.campaign_id) : s.add(c.campaign_id); return s; })}>
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected.has(c.campaign_id) ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                  {selected.has(c.campaign_id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.country === "brasil" ? "🇧🇷 Brasil" : c.country === "uruguay" ? "🇺🇾 Uruguay" : "🌐 Global"}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right flex-shrink-0">
                  <div><p className="text-xs text-muted-foreground">Gasto</p><p className="text-sm font-mono">R$ {c.spend.toFixed(0)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Leads</p><p className="text-sm font-mono">{c.leads}</p></div>
                  <div><p className="text-xs text-muted-foreground">CPL</p><p className="text-sm font-mono">{c.costPerLead ? `R$ ${c.costPerLead.toFixed(0)}` : "—"}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleImport} disabled={importMeta.isPending || selected.size === 0}>
              {importMeta.isPending ? "Importando..." : `Importar ${selected.size} campanha(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : campaigns.length === 0 ? (
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Zap className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma campanha configurada.</p>
            <Button onClick={openNew} variant="outline" className="gap-2"><Plus className="w-4 h-4" />Adicionar campanha</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className={`border-border/40 bg-card/50 ${!c.monitoring_enabled ? "opacity-50" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {c.campaign_id ? `ID: ${c.campaign_id}` : "Sem ID"} · {c.country === "brasil" ? "🇧🇷 Brasil" : "🇺🇾 Uruguay"}
                      {c.bm_account ? ` · ${c.bm_account.toUpperCase()}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={c.monitoring_enabled ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-muted-foreground"}>
                    {c.monitoring_enabled ? "Ativo" : "Pausado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Orçamento", value: `R$ ${c.budget_current}` },
                    { label: "ROAS Alvo", value: c.target_roas ? `${c.target_roas}x` : "—" },
                    { label: "CPA Alvo",  value: c.target_cpa ? `R$ ${c.target_cpa}` : "—" },
                  ].map(m => (
                    <div key={m.label} className="rounded-lg bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-sm font-semibold">{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(c)}><Settings className="w-3.5 h-3.5" />Editar</Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => runMonitor.mutate({ campaign_id: c.id, force: true })} disabled={runMonitor.isPending}>
                    <Play className="w-3.5 h-3.5" />Analisar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteCampaign.mutate(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar Campanha" : "Nova Campanha"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Ex: Black Friday Brasil" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ID Campanha (Facebook)</Label>
                <Input placeholder="123456789" value={form.campaign_id || ""} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Conta BM</Label>
                <Select value={(form as Record<string, unknown>).bm_account as string || ""} onValueChange={v => setForm(f => ({ ...f, bm_account: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Automático" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    {["bm1","bm2","bm3","bm4","bm5","bm6","bm7"].map(bm => (
                      <SelectItem key={bm} value={bm}>{bm.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>País</Label>
                <Select value={form.country || "brasil"} onValueChange={v => setForm(f => ({ ...f, country: v as CampaignConfig["country"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brasil">🇧🇷 Brasil</SelectItem>
                    <SelectItem value="uruguay">🇺🇾 Uruguay</SelectItem>
                    <SelectItem value="global">🌐 Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Orçamento (R$)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Atual",  key: "budget_current" },
                { label: "Mínimo", key: "budget_min" },
                { label: "Máximo", key: "budget_max" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input type="number" value={(form as Record<string, unknown>)[f.key] as number || 0}
                    onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))} />
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Metas</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "ROAS Alvo", key: "target_roas", placeholder: "2.5" },
                { label: "CPA Alvo (R$)", key: "target_cpa", placeholder: "50" },
                { label: "CTR Alvo (%)", key: "target_ctr", placeholder: "2.0" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input type="number" step="0.1" placeholder={f.placeholder}
                    value={(form as Record<string, unknown>)[f.key] as number ?? ""}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value ? parseFloat(e.target.value) : undefined }))} />
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-3">
              {[
                { label: "Monitoramento Ativo", desc: "IA monitora e sugere otimizações", key: "monitoring_enabled" },
                { label: "Auto-Aplicar", desc: "Aplica sem aguardar confirmação", key: "auto_apply" },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <div><Label>{s.label}</Label><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                  <Switch checked={(form as Record<string, unknown>)[s.key] as boolean ?? true}
                    onCheckedChange={v => setForm(p => ({ ...p, [s.key]: v }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={upsert.isPending || !form.name}
                onClick={async () => { await upsert.mutateAsync(form as CampaignConfig); setOpen(false); }}>
                {upsert.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Treinamento ──────────────────────────────────────────────

function TreinamentoTab() {
  const { data: training = [], isLoading } = useAITrainingData();
  const upsert = useUpsertTrainingData();
  const deleteItem = useDeleteTrainingData();
  const [open, setOpen] = useState(false);

  const emptyForm: Partial<AITrainingData> = { type: "rule", category: "budget", title: "", content: "", priority: 5, is_active: true };
  const [form, setForm] = useState<Partial<AITrainingData>>(emptyForm);

  function openNew() { setForm(emptyForm); setOpen(true); }
  function openEdit(item: AITrainingData) { setForm(item); setOpen(true); }

  const grouped = training.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, AITrainingData[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Centro de Treinamento da IA</h2>
          <p className="text-sm text-muted-foreground">Defina regras, exemplos e contextos que guiam as decisões da IA.</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-violet-600 hover:bg-violet-700"><Plus className="w-4 h-4" />Adicionar</Button>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex gap-3">
            <Brain className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300 space-y-0.5">
              <p className="font-medium text-sm">Como treinar a IA</p>
              <p>• <b>Regra:</b> "Se ROAS &gt; 3x por 2 dias, aumentar orçamento em 25%"</p>
              <p>• <b>Contexto:</b> "Nossa margem é 40%, CPA máximo é R$ 60"</p>
              <p>• <b>Exemplo:</b> Modelo de mensagem WhatsApp que a IA deve usar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? <div className="text-center py-10 text-muted-foreground">Carregando...</div> : (
        <div className="space-y-6">
          {(["persona", "rule", "context", "example"] as AITrainingData["type"][]).map(type => {
            const items = grouped[type] || [];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{trainingTypeLabels[type]}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-2">Nenhum dado deste tipo.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(item => (
                      <Card key={item.id} className={`border-border/40 bg-card/50 ${!item.is_active ? "opacity-50" : ""}`}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                  {trainingCategoryLabels[item.category] || item.category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">P:{item.priority}</span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}><Settings className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo Dado de Treinamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.type || "rule"} onValueChange={v => setForm(f => ({ ...f, type: v as AITrainingData["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rule">Regra</SelectItem>
                    <SelectItem value="context">Contexto</SelectItem>
                    <SelectItem value="example">Exemplo</SelectItem>
                    <SelectItem value="persona">Persona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.category || "general"} onValueChange={v => setForm(f => ({ ...f, category: v as AITrainingData["category"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Orçamento</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="audience">Público</SelectItem>
                    <SelectItem value="creative">Criativo</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="persona">Persona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input placeholder="Ex: Regra de Aumento de Orçamento" value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo *</Label>
              <Textarea placeholder="Descreva a regra ou contexto em detalhes..." rows={5} value={form.content || ""}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridade (1–10)</Label>
                <Input type="number" min={1} max={10} value={form.priority || 5} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Ativo</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={upsert.isPending || !form.title || !form.content}
                onClick={async () => { await upsert.mutateAsync(form as AITrainingData); setOpen(false); }}>
                {upsert.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Histórico ────────────────────────────────────────────────

function HistoricoTab() {
  const { data: suggestions = [] } = useOptimizationSuggestions();
  const { data: conversations = [] } = useWhatsAppConversations();
  const [view, setView] = useState<"suggestions" | "chat">("suggestions");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant={view === "suggestions" ? "default" : "outline"} size="sm" onClick={() => setView("suggestions")}>Sugestões</Button>
        <Button variant={view === "chat" ? "default" : "outline"} size="sm" onClick={() => setView("chat")}>Conversas WhatsApp</Button>
      </div>

      {view === "suggestions" ? (
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3"><CardTitle className="text-base">Histórico de Sugestões</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {suggestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma sugestão ainda.</p>
              ) : (
                <div className="divide-y divide-border/30">
                  {suggestions.map(s => {
                    const cfg = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.pending;
                    return (
                      <div key={s.id} className="p-4 hover:bg-muted/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-medium">{s.campaign_configs?.name || "—"}</p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{suggestionTypeLabels[s.suggestion_type] || s.suggestion_type}</Badge>
                            </div>
                            {s.current_value != null && s.suggested_value != null && (
                              <p className="text-xs font-mono text-muted-foreground mb-1">
                                R$ {s.current_value} → R$ {s.suggested_value}
                                {s.change_percent != null && ` (${s.change_percent > 0 ? "+" : ""}${s.change_percent.toFixed(1)}%)`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground line-clamp-2">{s.reasoning}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(s.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" />Conversas WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma conversa ainda.</p>
              ) : (
                <div className="p-4 space-y-3">
                  {[...conversations].reverse().map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.direction === "outbound" ? "bg-green-600 text-white rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[10px] ${msg.direction === "outbound" ? "text-green-100" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {msg.intent && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">{msg.intent}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Configurações ────────────────────────────────────────────

function ConfiguracoesTab() {
  const { data: zapiConfig } = useZAPIConfig();
  const upsert = useUpsertZAPIConfig();
  const sendTest = useSendTestMessage();
  const [form, setForm] = useState<Partial<ZAPIConfig>>({ instance_id: "", token: "", client_token: "", phone: "", is_active: true, webhook_configured: false });
  const [initialized, setInitialized] = useState(false);

  if (zapiConfig && !initialized) { setForm(zapiConfig); setInitialized(true); }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/whatsapp-webhook` : "Configure VITE_SUPABASE_URL";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Z-API */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-400" />Configuração Z-API</CardTitle>
          <CardDescription>Configure sua instância Z-API para enviar e receber mensagens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Instance ID *", key: "instance_id", placeholder: "3C9B8A7...", type: "text", hint: "Encontrado no painel Z-API" },
              { label: "Token *", key: "token", placeholder: "Token da instância", type: "password", hint: "" },
              { label: "Client Token (opcional)", key: "client_token", placeholder: "Security Token", type: "password", hint: "Em Segurança no painel Z-API" },
              { label: "Seu Número WhatsApp *", key: "phone", placeholder: "5511999999999", type: "text", hint: "Com código do país, sem espaços" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input type={f.type} placeholder={f.placeholder}
                  value={(form as Record<string, unknown>)[f.key] as string || ""}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Conexão Ativa</Label><p className="text-xs text-muted-foreground">Ativa/desativa o envio</p></div>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => upsert.mutate(form as ZAPIConfig)} disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar Configuração"}
            </Button>
            <Button variant="outline" onClick={() => sendTest.mutate("🤖 *Liberty AI* conectada! Pronta para monitorar suas campanhas.")}
              disabled={sendTest.isPending || !zapiConfig}>
              <Wifi className="w-4 h-4 mr-1.5" />Testar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ChevronRight className="w-4 h-4" />URL do Webhook</CardTitle>
          <CardDescription>Configure esta URL no painel Z-API para receber respostas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copiar</Button>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
            <p className="text-xs font-medium">Como configurar no Z-API:</p>
            <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
              <li>Painel Z-API → sua instância → Webhooks</li>
              <li>Cole a URL acima em "Webhook de Recebimento"</li>
              <li>Ative e salve</li>
            </ol>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${zapiConfig?.webhook_configured ? "bg-green-500" : "bg-yellow-500"}`} />
            <p className="text-xs text-muted-foreground">{zapiConfig?.webhook_configured ? "Webhook configurado" : "Aguardando configuração"}</p>
            <Button variant="ghost" size="sm" className="ml-auto text-xs"
              onClick={() => upsert.mutate({ ...form, webhook_configured: true } as ZAPIConfig)}>
              Marcar como configurado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-400 text-sm"><AlertCircle className="w-4 h-4" />Chave Anthropic (Claude)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-yellow-300">Configure nos secrets do Supabase:</p>
          <div className="rounded bg-black/30 p-2 font-mono text-xs text-yellow-200">
            supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
          </div>
          <p className="text-xs text-muted-foreground">Supabase Dashboard → Edge Functions → Manage secrets</p>
        </CardContent>
      </Card>
    </div>
  );
}
