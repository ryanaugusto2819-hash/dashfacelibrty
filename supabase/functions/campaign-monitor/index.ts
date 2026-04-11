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

    // ── 3. Fetch real Meta metrics (last 7 days + last 2 days) ─
    const today = new Date().toISOString().split("T")[0];
    const minus7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const minus2 = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

    const [metrics7d, metrics2d] = await Promise.all([
      fetchAdsSpend(supabase, minus7, today),
      fetchAdsSpend(supabase, minus2, today),
    ]);

    // Build lookup by campaign name (since Meta returns name, not DB id)
    const byName7d = buildCampaignLookup(metrics7d);
    const byName2d = buildCampaignLookup(metrics2d);

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

      // Match campaign config to real Meta metrics by campaign_id or name
      const campaignMetrics7d = byName7d[campaign.campaign_id] || byName7d[campaign.name] || null;
      const campaignMetrics2d = byName2d[campaign.campaign_id] || byName2d[campaign.name] || null;

      if (!campaignMetrics7d && !campaignMetrics2d) {
        results.push({ campaign: campaign.name, status: "no_data", reason: "No Meta metrics found for this campaign" });
        continue;
      }

      const metricsSnapshot = {
        period_7d: campaignMetrics7d,
        period_2d: campaignMetrics2d,
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

// ── Helpers ───────────────────────────────────────────────────

async function fetchAdsSpend(supabase: ReturnType<typeof createClient>, from: string, to: string) {
  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-ads-spend`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to }),
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildCampaignLookup(metrics: Record<string, unknown> | null): Record<string, unknown> {
  if (!metrics) return {};
  const campaigns = (metrics.byCampaign as Array<{ name: string; [k: string]: unknown }>) || [];
  const result: Record<string, unknown> = {};
  for (const c of campaigns) {
    result[c.name] = c;
  }
  return result;
}

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

Configuração de Orçamento:
- Orçamento atual registrado: R$ ${campaign.budget_current}
- Orçamento mínimo permitido: R$ ${campaign.budget_min}
- Orçamento máximo permitido: R$ ${campaign.budget_max}

Metas:
- ROAS alvo: ${campaign.target_roas || "não definido"}
- CPA/CPL alvo: ${campaign.target_cpa ? `R$ ${campaign.target_cpa}` : "não definido"}
- CTR alvo: ${campaign.target_ctr ? `${campaign.target_ctr}%` : "não definido"}

Métricas reais dos últimos 2 dias:
- Gasto: R$ ${(m2d as Record<string, unknown>).spend || 0}
- Impressões: ${(m2d as Record<string, unknown>).impressions || 0}
- Cliques: ${(m2d as Record<string, unknown>).clicks || 0}
- Leads: ${(m2d as Record<string, unknown>).leads || 0}
- CTR: ${(m2d as Record<string, unknown>).ctr || 0}%
- CPL (custo por lead): ${(m2d as Record<string, unknown>).costPerLead ? `R$ ${(m2d as Record<string, unknown>).costPerLead}` : "sem leads"}

Métricas reais dos últimos 7 dias:
- Gasto: R$ ${(m7d as Record<string, unknown>).spend || 0}
- Impressões: ${(m7d as Record<string, unknown>).impressions || 0}
- Cliques: ${(m7d as Record<string, unknown>).clicks || 0}
- Leads: ${(m7d as Record<string, unknown>).leads || 0}
- CTR: ${(m7d as Record<string, unknown>).ctr || 0}%
- CPL médio 7d: ${(m7d as Record<string, unknown>).costPerLead ? `R$ ${(m7d as Record<string, unknown>).costPerLead}` : "sem leads"}

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
