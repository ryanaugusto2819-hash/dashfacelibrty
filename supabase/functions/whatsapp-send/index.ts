import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, phone, suggestion_id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active Z-API config
    const { data: zapiConfig, error: configError } = await supabase
      .from("zapi_config")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !zapiConfig) {
      return new Response(
        JSON.stringify({ error: "Z-API not configured or inactive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetPhone = phone || zapiConfig.phone;

    // Send via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${zapiConfig.instance_id}/token/${zapiConfig.token}/send-text`;

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(zapiConfig.client_token ? { "Client-Token": zapiConfig.client_token } : {}),
      },
      body: JSON.stringify({ phone: targetPhone, message }),
    });

    const zapiData = await zapiResponse.json();

    if (!zapiResponse.ok) {
      throw new Error(`Z-API error (${zapiResponse.status}): ${JSON.stringify(zapiData)}`);
    }

    const messageId = zapiData.zaapId || zapiData.id || null;

    // Log outbound message
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .insert({
        direction: "outbound",
        message,
        message_id: messageId,
        phone: targetPhone,
        suggestion_id: suggestion_id || null,
        processed: true,
      })
      .select()
      .single();

    // Link message ID to suggestion
    if (suggestion_id && messageId) {
      await supabase
        .from("optimization_suggestions")
        .update({ whatsapp_message_id: messageId })
        .eq("id", suggestion_id);
    }

    return new Response(
      JSON.stringify({ success: true, messageId, conversation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("whatsapp-send error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
