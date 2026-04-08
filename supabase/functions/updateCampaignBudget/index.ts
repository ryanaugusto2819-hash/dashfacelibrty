import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id, daily_budget, bm_account } = await req.json();

    if (!campaign_id || daily_budget == null) {
      return new Response(
        JSON.stringify({ error: "Missing campaign_id or daily_budget" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenMap: Record<string, string> = {
      bm1: Deno.env.get("META_ACCESS_TOKEN") || "",
      bm2: Deno.env.get("META_ACCESS_TOKEN_2") || "",
      bm3: Deno.env.get("META_ACCESS_TOKEN_3") || "",
      bm4: Deno.env.get("META_ACCESS_TOKEN_4") || "",
      bm5: Deno.env.get("META_ACCESS_TOKEN_5") || "",
    };
    const accessToken = (bm_account && tokenMap[bm_account]) || Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing META_ACCESS_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Meta API expects budget in cents (integer)
    const budgetInCents = Math.round(daily_budget * 100);

    const url = `https://graph.facebook.com/v19.0/${campaign_id}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        daily_budget: budgetInCents.toString(),
        access_token: accessToken,
      }),
    });

    const json = await res.json();

    if (json.error) {
      return new Response(
        JSON.stringify({ error: "Meta API error", details: json.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: json }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
