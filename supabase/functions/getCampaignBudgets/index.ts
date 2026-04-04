import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AccountConfig {
  label: string;
  accessToken: string;
  adAccount: string;
}

function getAccountConfigs(): AccountConfig[] {
  const configs: AccountConfig[] = [];
  const t1 = Deno.env.get("META_ACCESS_TOKEN");
  const a1 = Deno.env.get("META_AD_ACCOUNT");
  if (t1 && a1) configs.push({ label: "bm1", accessToken: t1, adAccount: a1 });

  const t2 = Deno.env.get("META_ACCESS_TOKEN_2");
  const a2 = Deno.env.get("META_AD_ACCOUNT_2");
  if (t2 && a2) configs.push({ label: "bm2", accessToken: t2, adAccount: a2 });

  return configs;
}

async function fetchAccountBudgets(config: AccountConfig): Promise<{
  budgets: Record<string, { daily_budget: number; name: string; status: string; bm_account: string }>;
  connected: boolean;
  error?: any;
}> {
  const allCampaigns: any[] = [];
  let nextUrl: string | null = `https://graph.facebook.com/v19.0/act_${config.adAccount}/campaigns?fields=id,name,daily_budget,status&limit=500&access_token=${config.accessToken}`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const json = await res.json();

    if (json.error) {
      const metaMessage = String(json.error?.message || "");
      const isConnectionError = json.error?.code === 190 || /ads_management|ads_read/i.test(metaMessage);
      if (isConnectionError) {
        return { budgets: {}, connected: false, error: json.error };
      }
      return { budgets: {}, connected: true, error: json.error };
    }

    if (json.data) allCampaigns.push(...json.data);
    nextUrl = json.paging?.next || null;
  }

  const budgets: Record<string, { daily_budget: number; name: string; status: string; bm_account: string }> = {};
  for (const c of allCampaigns) {
    budgets[c.id] = {
      daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0,
      name: c.name || "",
      status: c.status || "",
      bm_account: config.label,
    };
  }

  return { budgets, connected: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let account: string | undefined;
    try {
      const body = await req.json();
      account = body?.account;
    } catch {
      // no body is fine
    }

    const allConfigs = getAccountConfigs();
    if (allConfigs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Meta accounts configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const configs = account && account !== "all"
      ? allConfigs.filter(c => c.label === account)
      : allConfigs;

    const results = await Promise.allSettled(configs.map(c => fetchAccountBudgets(c)));

    const mergedBudgets: Record<string, { daily_budget: number; name: string; status: string; bm_account: string }> = {};
    let totalCount = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.connected) {
        Object.assign(mergedBudgets, r.value.budgets);
        totalCount += Object.keys(r.value.budgets).length;
      }
    });

    return new Response(
      JSON.stringify({
        budgets: mergedBudgets,
        total: totalCount,
        accounts: allConfigs.map(c => c.label),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
