import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Untyped client — new tables are not in the auto-generated Database type yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as any;

// ─── Types ────────────────────────────────────────────────────

export interface ZAPIConfig {
  id: string;
  instance_id: string;
  token: string;
  client_token: string | null;
  phone: string;
  is_active: boolean;
  webhook_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignConfig {
  id: string;
  name: string;
  campaign_id: string | null;
  adset_id: string | null;
  country: "brasil" | "uruguay" | "global";
  budget_current: number;
  budget_min: number;
  budget_max: number;
  target_roas: number | null;
  target_cpa: number | null;
  target_ctr: number | null;
  monitoring_enabled: boolean;
  monitoring_interval: number;
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
}

export interface AITrainingData {
  id: string;
  type: "rule" | "example" | "context" | "persona";
  category: "budget" | "performance" | "audience" | "creative" | "general" | "persona";
  title: string;
  content: string;
  priority: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptimizationSuggestion {
  id: string;
  campaign_config_id: string | null;
  suggestion_type: string;
  current_value: number | null;
  suggested_value: number | null;
  change_percent: number | null;
  reasoning: string;
  metrics_snapshot: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "applied" | "expired" | "error";
  whatsapp_message_id: string | null;
  applied_at: string | null;
  error_message: string | null;
  created_at: string;
  expires_at: string;
  campaign_configs?: { name: string } | null;
}

export interface WhatsAppConversation {
  id: string;
  direction: "inbound" | "outbound";
  message: string;
  message_id: string | null;
  phone: string | null;
  suggestion_id: string | null;
  intent: string | null;
  processed: boolean;
  created_at: string;
}

export interface AIAnalysisLog {
  id: string;
  campaign_config_id: string | null;
  analysis_type: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  tokens_used: number | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  campaign_configs?: { name: string } | null;
}

// ─── Z-API Config ─────────────────────────────────────────────

export function useZAPIConfig() {
  return useQuery({
    queryKey: ["zapi_config"],
    queryFn: async (): Promise<ZAPIConfig | null> => {
      const { data, error } = await db
        .from("zapi_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertZAPIConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<ZAPIConfig> & { instance_id: string; token: string; phone: string }) => {
      if (cfg.id) {
        const { id, created_at, updated_at, ...rest } = cfg as ZAPIConfig;
        const { data, error } = await db.from("zapi_config").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data as ZAPIConfig;
      }
      const { id, created_at, updated_at, ...rest } = cfg as ZAPIConfig;
      const { data, error } = await db.from("zapi_config").insert(rest).select().single();
      if (error) throw error;
      return data as ZAPIConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zapi_config"] });
      toast.success("Configuração Z-API salva!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ─── Campaign Configs ─────────────────────────────────────────

export function useCampaignConfigs() {
  return useQuery({
    queryKey: ["campaign_configs"],
    queryFn: async (): Promise<CampaignConfig[]> => {
      const { data, error } = await db.from("campaign_configs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertCampaignConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<CampaignConfig> & { name: string }) => {
      if (cfg.id) {
        const { id, created_at, updated_at, ...rest } = cfg as CampaignConfig;
        const { data, error } = await db.from("campaign_configs").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data as CampaignConfig;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = cfg as CampaignConfig;
      const { data, error } = await db.from("campaign_configs").insert(rest).select().single();
      if (error) throw error;
      return data as CampaignConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_configs"] });
      toast.success("Campanha salva!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteCampaignConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("campaign_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_configs"] });
      toast.success("Campanha removida.");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ─── AI Training Data ─────────────────────────────────────────

export function useAITrainingData() {
  return useQuery({
    queryKey: ["ai_training_data"],
    queryFn: async (): Promise<AITrainingData[]> => {
      const { data, error } = await db
        .from("ai_training_data")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertTrainingData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<AITrainingData> & { type: AITrainingData["type"]; title: string; content: string }) => {
      if (item.id) {
        const { id, created_at, updated_at, ...rest } = item as AITrainingData;
        const { data, error } = await db.from("ai_training_data").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data as AITrainingData;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = item as AITrainingData;
      const { data, error } = await db.from("ai_training_data").insert(rest).select().single();
      if (error) throw error;
      return data as AITrainingData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_training_data"] });
      toast.success("Dado de treinamento salvo!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteTrainingData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("ai_training_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_training_data"] });
      toast.success("Removido.");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ─── Optimization Suggestions ─────────────────────────────────

export function useOptimizationSuggestions() {
  return useQuery({
    queryKey: ["optimization_suggestions"],
    queryFn: async (): Promise<OptimizationSuggestion[]> => {
      const { data, error } = await db
        .from("optimization_suggestions")
        .select("*, campaign_configs(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });
}

// ─── WhatsApp Conversations ───────────────────────────────────

export function useWhatsAppConversations() {
  return useQuery({
    queryKey: ["whatsapp_conversations"],
    queryFn: async (): Promise<WhatsAppConversation[]> => {
      const { data, error } = await db
        .from("whatsapp_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10_000,
  });
}

// ─── AI Analysis Logs ─────────────────────────────────────────

export function useAIAnalysisLogs() {
  return useQuery({
    queryKey: ["ai_analysis_logs"],
    queryFn: async (): Promise<AIAnalysisLog[]> => {
      const { data, error } = await db
        .from("ai_analysis_logs")
        .select("*, campaign_configs(name)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── Actions ─────────────────────────────────────────────────

export function useRunCampaignMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { campaign_id?: string; force?: boolean }) => {
      const { data, error } = await _supabase.functions.invoke("campaign-monitor", {
        body: params || {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["optimization_suggestions"] });
      qc.invalidateQueries({ queryKey: ["ai_analysis_logs"] });
      const sent = ((data?.results || []) as Array<{ status: string }>)
        .filter(r => r.status === "suggestion_sent").length;
      toast.success(
        sent > 0
          ? `Análise concluída! ${sent} sugestão(ões) enviada(s) no WhatsApp.`
          : "Análise concluída. Sem oportunidades no momento."
      );
    },
    onError: (e: Error) => toast.error(`Erro na análise: ${e.message}`),
  });
}

export function useSendTestMessage() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await _supabase.functions.invoke("whatsapp-send", {
        body: { message },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Mensagem de teste enviada com sucesso!"),
    onError: (e: Error) => toast.error(`Erro ao enviar: ${e.message}`),
  });
}
