import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAccessToken(bmAccount?: string): string | undefined {
  const mainToken = Deno.env.get("META_ACCESS_TOKEN");
  if (bmAccount === "bm2") return Deno.env.get("META_ACCESS_TOKEN_2") || mainToken;
  if (bmAccount === "bm3") return Deno.env.get("META_ACCESS_TOKEN_3") || mainToken;
  if (bmAccount === "bm4") return Deno.env.get("META_ACCESS_TOKEN_4") || mainToken;
  if (bmAccount === "bm5") return Deno.env.get("META_ACCESS_TOKEN_5") || mainToken;
  if (bmAccount === "bm6") return Deno.env.get("META_ACCESS_TOKEN_6") || mainToken;
  if (bmAccount === "bm7") return Deno.env.get("META_ACCESS_TOKEN_7") || mainToken;
  return mainToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id, status, bm_account } = await req.json();

    if (!campaign_id || !status) {
      return new Response(JSON.stringify({ error: "Missing campaign_id or status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["ACTIVE", "PAUSED"].includes(status)) {
      return new Response(JSON.stringify({ error: "Status must be ACTIVE or PAUSED" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = getAccessToken(bm_account);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Missing access token for account" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://graph.facebook.com/v19.0/${campaign_id}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ status, access_token: accessToken }),
    });

    const json = await res.json();
    if (json.error) {
      return new Response(JSON.stringify({ error: "Meta API error", details: json.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, campaign_id, status }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
