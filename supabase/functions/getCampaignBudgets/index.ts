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
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const adAccount = Deno.env.get("META_AD_ACCOUNT");

    if (!accessToken || !adAccount) {
      return new Response(
        JSON.stringify({ error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all campaigns with their daily_budget and status
    const allCampaigns: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v19.0/act_${adAccount}/campaigns?fields=id,name,daily_budget,status&limit=500&access_token=${accessToken}`;

    while (nextUrl) {
      const res = await fetch(nextUrl);
      const json = await res.json();

      if (json.error) {
        const metaMessage = String(json.error?.message || "");
        const isConnectionError = json.error?.code === 190 || /ads_management|ads_read/i.test(metaMessage);

        if (isConnectionError) {
          return new Response(
            JSON.stringify({
              budgets: {},
              total: 0,
              connected: false,
              error: "Meta connection error",
              details: json.error,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Meta API error", details: json.error }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (json.data) {
        allCampaigns.push(...json.data);
      }

      nextUrl = json.paging?.next || null;
    }

    // Build a map: campaign_id -> { daily_budget (in currency, not cents), name, status }
    const budgets: Record<string, { daily_budget: number; name: string; status: string }> = {};
    for (const c of allCampaigns) {
      budgets[c.id] = {
        daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0,
        name: c.name || "",
        status: c.status || "",
      };
    }

    return new Response(
      JSON.stringify({ budgets, total: allCampaigns.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
