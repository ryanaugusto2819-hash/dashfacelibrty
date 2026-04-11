/**
 * Campaign Monitor — Analyzes real Meta campaigns with Claude AI and sends WhatsApp suggestions
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body: { campaign_id?: string; force?: boolean } = {};
    try { body = await req.json(); } catch { /* no body */ }

    // ── 1. Load campaign configs ──────────────────────────────
    let query = supabase.from("campaign_configs").select("*").eq("monitoring_enabled", true);
    if (body.campaign_id) query = query.eq("id", body.campaign_id);
    const { data: campaigns } = await query;

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active campaigns", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Check Z-API ────────────────────────────────────────
    const { data: zapiConfig } = await supabase
      .from("zapi_config").select("id").eq("is_active", true).maybeSingle();

    if (!zapiConfig) {
      return new Response(
        JSON.stringify({ error: "Z-API not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Fetch real Meta metrics via facebookMetrics ────────
    const today = new Date().toISOString().split("T")[0];
    const minus7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const minus2 = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

    const [raw7d, raw2d] = await Promise.all([
      fetchMetrics(minus7, today),
      fetchMetrics(minus2, today),
    ]);

    // Aggregate per-ad rows into per-campaign summaries keyed by campaign_id and name
    const byCampaignId7d = aggregateByCampaign(raw7d);
    const byCampaignId2d = aggregateByCampaign(raw2d);

    // ── 4. Load AI training data ──────────────────────────────
    const { data: trainingData } = await supabase
      .from("ai_training_data").select("type, category, title, content, priority")
      .eq("is_active", true).order("priority", { ascending: false });

    const trainingContext = (trainingData || [])
      .map((t) => `[${t.type.toUpperCase()} - ${t.category}]\n${t.title}:\n${t.content}`)
      .join("\n\n---\n\n");

    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const campaign of campaigns) {
      // Skip if pending suggestion already exists (unless forced)
      if (!body.force) {
        const { data: existing } = await supabase
          .from("optimization_suggestions").select("id")
          .eq("campaign_config_id", campaign.id).eq("status", "pending")
          .gt("expires_at", new Date().toISOString()).maybeSingle();
        if (existing) {
          results.push({ campaign: campaign.name, status: "skipped", reason: "pending suggestion exists" });
          continue;
        }
      }

      // Match by campaign_id first, then by name
      const m7d = byCampaignId7d[campaign.campaign_id] || byCampaignId7d[campaign.name] || null;
      const m2d = byCampaignId2d[campaign.campaign_id] || byCampaignId2d[campaign.name] || null;

      if (!m7d && !m2d) {
        results.push({ campaign: campaign.name, status: "no_data", reason: "No Meta metrics found for this campaign" });
        continue;
      }

      const metricsSnapshot = {
        period_7d: m7d,
        period_2d: m2d,
        fetched_at: new Date().toISOString(),
      };

      // ── 5. Analyze with Claude ────────────────────────────
      const prompt = buildAnalysisPrompt(trainingContext, campaign, metricsSnapshot);

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const aiData = await aiRes.json();
      const aiText = aiData.content?.[0]?.text || "";
      const durationMs = Date.now() - startTime;

      let analysis: Record<string, unknown> = { should_suggest: false };
      try {
        const match = aiText.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
      } catch {
        console.warn("Failed to parse AI response:", aiText.slice(0, 200));
      }

      // Log
      await supabase.from("ai_analysis_logs").insert({
        campaign_config_id: campaign.id,
        analysis_type: body.force ? "manual_check" : "scheduled_check",
        input_data: { campaign, metricsSnapshot },
        output_data: analysis,
        tokens_used: (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0),
        duration_ms: durationMs,
      });

      if (!analysis.should_suggest) {
        results.push({ campaign: campaign.name, status: "no_action", confidence: analysis.confidence, reasoning: analysis.reasoning });
        continue;
      }

      // ── 6. Create suggestion ──────────────────────────────
      const { data: suggestion } = await supabase
        .from("optimization_suggestions")
        .insert({
          campaign_config_id: campaign.id,
          suggestion_type: analysis.suggestion_type,
          current_value: analysis.current_value,
          suggested_value: analysis.suggested_value,
          change_percent: analysis.change_percent,
          reasoning: analysis.reasoning as string,
          metrics_snapshot: metricsSnapshot,
          status: "pending",
        })
        .select().single();

      if (!suggestion || !analysis.whatsapp_message) continue;

      const msg = `${analysis.whatsapp_message}\n\n━━━━━━━━━━━━━━━━\n✅ *SIM* para aprovar | ❌ *NÃO* para recusar\n\n_Válido por 24h · Liberty AI 🤖_`;

      const sendRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: msg, suggestion_id: suggestion.id }),
        }
      );

      results.push({
        campaign: campaign.name,
        status: sendRes.ok ? "suggestion_sent" : "send_failed",
        suggestion_type: analysis.suggestion_type,
        confidence: analysis.confidence,
        suggestion_id: suggestion.id,
      });
    }

    return new Response(
      JSON.stringify({ results, duration_ms: Date.now() - startTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign monitor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Fetch metrics from facebookMetrics function ───────────────

async function fetchMetrics(from: string, to: string): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebookMetrics`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

// ── Aggregate per-ad rows into per-campaign totals ────────────

function aggregateByCampaign(rows: Array<Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};

  for (const row of rows) {
    const key = (row.campaign_id as string) || (row.campaign_name as string);
    if (!key) continue;

    if (!result[key]) {
      result[key] = {
        campaign_id: row.campaign_id,
        name: row.campaign_name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        bm_account: row.bm_account,
      };
      // Also index by name for fallback lookup
      const name = row.campaign_name as string;
      if (name && name !== key) result[name] = result[key];
    }

    (result[key].spend as number);
    result[key].spend = ((result[key].spend as number) || 0) + ((row.spend as number) || 0);
    result[key].impressions = ((result[key].impressions as number) || 0) + ((row.impressions as number) || 0);
    result[key].clicks = ((result[key].clicks as number) || 0) + ((row.clicks as number) || 0);
    result[key].leads = ((result[key].leads as number) || 0) + ((row.leads as number) || 0);
  }

  // Compute derived metrics
  for (const key of Object.keys(result)) {
    const c = result[key];
    const imp = (c.impressions as number) || 0;
    const clk = (c.clicks as number) || 0;
    const leads = (c.leads as number) || 0;
    const spend = (c.spend as number) || 0;
    c.ctr = imp > 0 ? (clk / imp) * 100 : 0;
    c.costPerLead = leads > 0 ? spend / leads : null;
  }

  return result;
}

// ── Build Claude analysis prompt ──────────────────────────────

function buildAnalysisPrompt(
  trainingContext: string,
  campaign: Record<string, unknown>,
  metrics: Record<string, unknown>
): string {
  const m2d = (metrics.period_2d as Record<string, unknown>) || {};
  const m7d = (metrics.period_7d as Record<string, unknown>) || {};

  return `${trainingContext}

===== DADOS REAIS DA CAMPANHA (Meta Ads) =====

Campanha: "${campaign.name}"
País: ${campaign.country}
Facebook Campaign ID: ${campaign.campaign_id || "não configurado"}
Conta BM: ${campaign.bm_account || "não informado"}

Configuração de Orçamento:
- Orçamento atual registrado: R$ ${campaign.budget_current}
- Orçamento mínimo permitido: R$ ${campaign.budget_min}
- Orçamento máximo permitido: R$ ${campaign.budget_max}

Metas:
- ROAS alvo: ${campaign.target_roas || "não definido"}
- CPA/CPL alvo: ${campaign.target_cpa ? `R$ ${campaign.target_cpa}` : "não definido"}
- CTR alvo: ${campaign.target_ctr ? `${campaign.target_ctr}%` : "não definido"}

Métricas reais dos últimos 2 dias:
- Gasto: R$ ${m2d.spend || 0}
- Impressões: ${m2d.impressions || 0}
- Cliques: ${m2d.clicks || 0}
- Leads: ${m2d.leads || 0}
- CTR: ${m2d.ctr || 0}%
- CPL (custo por lead): ${m2d.costPerLead ? `R$ ${m2d.costPerLead}` : "sem leads"}

Métricas reais dos últimos 7 dias:
- Gasto: R$ ${m7d.spend || 0}
- Impressões: ${m7d.impressions || 0}
- Cliques: ${m7d.clicks || 0}
- Leads: ${m7d.leads || 0}
- CTR: ${m7d.ctr || 0}%
- CPL médio 7d: ${m7d.costPerLead ? `R$ ${m7d.costPerLead}` : "sem leads"}

===== INSTRUÇÃO =====

Com base nos dados REAIS da Meta acima e nas regras de treinamento, determine se há uma oportunidade clara de otimização.

Responda APENAS com JSON válido (sem markdown):
{
  "should_suggest": true | false,
  "suggestion_type": "budget_increase" | "budget_decrease" | "pause" | "resume" | "creative_rotate" | "audience_adjust" | null,
  "current_value": <orçamento atual ou null>,
  "suggested_value": <valor sugerido ou null>,
  "change_percent": <percentual de variação ou null>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<análise detalhada em português com os números reais>",
  "whatsapp_message": "<mensagem para WhatsApp com emojis, dados reais, máx 600 chars>"
}`;
}
