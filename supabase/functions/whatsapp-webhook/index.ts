/**
 * WhatsApp Webhook — recebe mensagens do Z-API, interpreta com Claude e aplica
 * orçamento na Meta via updateCampaignBudget quando o usuário aprovar.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", service: "liberty-ai-webhook" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    console.log("Webhook payload:", JSON.stringify(body));

    const fromMe    = body.fromMe === true;
    const messageText = (body.text?.message || body.message || "").trim();
    const phone     = (body.phone || body.from || "").replace(/\D/g, "");
    const messageId = body.messageId || body.id || `msg_${Date.now()}`;

    if (fromMe || !messageText || !phone) return new Response("OK", { status: 200 });

    // Log inbound
    await supabase.from("whatsapp_conversations").upsert(
      { direction: "inbound", message: messageText, message_id: messageId, phone, processed: false },
      { onConflict: "message_id", ignoreDuplicates: true }
    );

    // Find pending suggestion
    const { data: suggestion } = await supabase
      .from("optimization_suggestions")
      .select("*, campaign_configs(name, campaign_id, bm_account, budget_current)")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let responseMessage = "";

    if (!suggestion) {
      responseMessage = await handleGeneralCommand(supabase, messageText);
    } else {
      responseMessage = await handleSuggestionReply(supabase, messageText, messageId, suggestion);
    }

    if (responseMessage) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: responseMessage, phone }),
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
});

// ── Process suggestion reply ───────────────────────────────────

async function handleSuggestionReply(
  supabase: ReturnType<typeof createClient>,
  messageText: string,
  messageId: string,
  suggestion: Record<string, unknown>
): Promise<string> {
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeApiKey) return "❌ Erro interno: API key não configurada.";

  const campaign = suggestion.campaign_configs as Record<string, unknown>;

  const prompt = `Interprete a resposta do usuário sobre uma sugestão de otimização de campanha.

Sugestão pendente:
- Campanha: ${campaign?.name}
- Tipo: ${suggestion.suggestion_type}
- Orçamento atual: R$ ${suggestion.current_value}
- Orçamento sugerido: R$ ${suggestion.suggested_value} (${suggestion.change_percent}% variação)
- Motivo: ${suggestion.reasoning}

Mensagem do usuário: "${messageText}"

Responda SOMENTE com JSON válido:
{
  "intent": "approval" | "rejection" | "question" | "custom_value" | "unknown",
  "custom_value": <número em R$ ou null>,
  "response_message": "<resposta em português com emojis>"
}

Aprovação: sim, pode, ok, claro, confirma, vai lá, aceito, faz, autorizo, tá bom, concordo
Rejeição: não, nao, cancela, para, negativo, recuso, deixa, agora não`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const aiData = await aiRes.json();
  const aiText = aiData.content?.[0]?.text || "";

  let result: Record<string, unknown> = {
    intent: "unknown",
    response_message: "Não entendi. Responda *SIM* para aprovar ou *NÃO* para recusar.",
  };
  try {
    const match = aiText.match(/\{[\s\S]*\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* keep default */ }

  const sid = suggestion.id as string;
  const intent = result.intent as string;

  if (intent === "approval" || intent === "custom_value") {
    const finalBudget = intent === "custom_value" && result.custom_value
      ? (result.custom_value as number)
      : (suggestion.suggested_value as number);

    // ── Apply budget change on Meta ────────────────────────
    const applyResult = await applyBudgetOnMeta(
      supabase,
      campaign?.campaign_id as string,
      finalBudget,
      campaign?.bm_account as string | undefined
    );

    if (applyResult.success) {
      await supabase.from("optimization_suggestions")
        .update({ status: "applied", applied_at: new Date().toISOString(), suggested_value: finalBudget })
        .eq("id", sid);

      // Update campaign_configs with new budget
      if (campaign) {
        await supabase.from("campaign_configs")
          .update({ budget_current: finalBudget })
          .eq("campaign_id", campaign.campaign_id);
      }

      result.response_message = `✅ *Feito!* Orçamento da campanha *${campaign?.name}* alterado de *R$ ${suggestion.current_value}* para *R$ ${finalBudget}*.\n\nAlteração aplicada diretamente na Meta. 🚀`;
    } else {
      await supabase.from("optimization_suggestions")
        .update({ status: "error", error_message: applyResult.error })
        .eq("id", sid);

      result.response_message = `❌ Aprovação recebida, mas houve erro ao aplicar na Meta:\n${applyResult.error}\n\nTente alterar manualmente no dashboard.`;
    }

  } else if (intent === "rejection") {
    await supabase.from("optimization_suggestions")
      .update({ status: "rejected" })
      .eq("id", sid);
  }

  // Update conversation
  await supabase.from("whatsapp_conversations")
    .update({ intent, processed: true, suggestion_id: sid })
    .eq("message_id", messageId);

  return result.response_message as string;
}

// ── Apply budget via existing updateCampaignBudget function ───

async function applyBudgetOnMeta(
  _supabase: ReturnType<typeof createClient>,
  campaignId: string,
  dailyBudget: number,
  bmAccount?: string
): Promise<{ success: boolean; error?: string }> {
  if (!campaignId) {
    return { success: false, error: "campaign_id não configurado na campanha. Configure o ID no painel Liberty AI." };
  }

  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/updateCampaignBudget`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          daily_budget: dailyBudget,
          bm_account: bmAccount || undefined,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || data.error || "Erro desconhecido da Meta API" };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── General commands (no pending suggestion) ──────────────────

async function handleGeneralCommand(
  supabase: ReturnType<typeof createClient>,
  message: string
): Promise<string> {
  const lower = message.toLowerCase().trim();

  if (lower === "status" || lower === "resumo") {
    const { data: pending } = await supabase
      .from("optimization_suggestions")
      .select("suggestion_type, campaign_configs(name)")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (!pending || pending.length === 0) {
      return "✅ Nenhuma sugestão pendente. Estou monitorando suas campanhas.";
    }
    let msg = `⏳ *Sugestões Pendentes (${pending.length}):*\n\n`;
    for (const s of pending) {
      const camp = (s.campaign_configs as Record<string, unknown>)?.name || "?";
      msg += `• ${camp}: ${s.suggestion_type}\n`;
    }
    return msg;
  }

  if (lower === "ajuda" || lower === "help") {
    return `🤖 *Liberty AI — Comandos*\n\n• *status* — sugestões pendentes\n• *ajuda* — esta mensagem\n\nQuando eu enviar uma sugestão:\n✅ *SIM* — aprovar e aplicar na Meta\n❌ *NÃO* — recusar\n💬 Ou defina um valor: "aumenta para 300"`;
  }

  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeApiKey) return "";

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Você é Liberty AI, assistente de campanhas Facebook Ads. Não há sugestão pendente. Usuário enviou: "${message}". Responda brevemente em português. Mencione: status, ajuda.`,
      }],
    }),
  });

  const aiData = await aiRes.json();
  return aiData.content?.[0]?.text || "Envie *ajuda* para ver os comandos disponíveis.";
}
