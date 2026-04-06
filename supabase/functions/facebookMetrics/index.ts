import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Shift a YYYY-MM-DD string by `days` days */
function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface MetaInsight {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  cpc: string;
  actions?: { action_type: string; value: string }[];
  video_play_actions?: { action_type: string; value: string }[];
  video_p95_watched_actions?: { action_type: string; value: string }[];
  ad_id: string;
  ad_name: string;
}

interface ProcessedMetric {
  date: string;
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  leads: number;
  costPerLead: number | null;
  video3s: number;
  videoP95: number;
  hookRate: number;
  bodyRate: number;
  bm_account: string;
}

function getActionValue(
  actions: { action_type: string; value: string }[] | undefined,
  type: string
): number {
  if (!actions) return 0;
  const found = actions.find((a) => a.action_type === type);
  return found ? parseFloat(found.value) : 0;
}

function getFirstActionValue(
  actions: { action_type: string; value: string }[] | undefined
): number {
  if (!actions || actions.length === 0) return 0;
  return parseFloat(actions[0].value) || 0;
}

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

async function fetchAccountMetrics(
  config: AccountConfig,
  from: string,
  to: string
): Promise<{ data: ProcessedMetric[]; error?: any; connected: boolean }> {
  const fields = [
    "spend", "impressions", "clicks", "ctr", "cpm", "cpc",
    "actions", "video_play_actions", "video_p95_watched_actions",
    "ad_id", "ad_name", "campaign_id", "campaign_name",
  ].join(",");

  // BM 2 is in PDT (UTC-7) while dates are in BRT (UTC-3).
  // A Brazilian "today" starts at 20:00 PDT the previous day,
  // so we fetch one extra day before to capture all data.
  const adjustedFrom = config.label === "bm2"
    ? shiftDateStr(from, -1)
    : from;

  const timeRange = JSON.stringify({ since: adjustedFrom, until: to });
  const url = new URL(`https://graph.facebook.com/v19.0/act_${config.adAccount}/insights`);
  url.searchParams.set("level", "ad");
  url.searchParams.set("time_range", timeRange);
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", config.accessToken);

  const allData: MetaInsight[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    let json: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(nextUrl);
      json = await res.json();
      if (json.error && (json.error.code === 4 || json.error.code === 17 || json.error.is_transient)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }

    if (json.error) {
      const metaMessage = String(json.error?.message || "");
      const isConnectionError = json.error?.code === 190 || /ads_management|ads_read/i.test(metaMessage);
      if (isConnectionError) {
        return { data: [], connected: false, error: json.error };
      }
      return { data: [], connected: true, error: json.error };
    }

    if (json.data) allData.push(...json.data);
    nextUrl = json.paging?.next || null;
  }

  const USD_TO_BRL = 5.16;
  const isUsd = config.label === "bm2";

  const processed: ProcessedMetric[] = allData.map((row) => {
    const rawSpend = parseFloat(row.spend) || 0;
    const spend = isUsd ? rawSpend * USD_TO_BRL : rawSpend;
    const impressions = parseInt(row.impressions) || 0;
    const clicks = parseInt(row.clicks) || 0;
    const leads = getActionValue(row.actions, "onsite_conversion.total_messaging_connection");
    const video3s = getActionValue(row.actions, "video_view");
    const videoP95 = getFirstActionValue(row.video_p95_watched_actions);

    return {
      date: row.date_start,
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      campaign_id: (row as any).campaign_id || "",
      campaign_name: (row as any).campaign_name || "",
      spend, impressions, clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      leads,
      costPerLead: leads > 0 ? spend / leads : null,
      video3s, videoP95,
      hookRate: impressions > 0 ? (video3s / impressions) * 100 : 0,
      bodyRate: impressions > 0 ? (videoP95 / impressions) * 100 : 0,
      bm_account: config.label,
    };
  });

  return { data: processed, connected: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { from, to, account } = await req.json();

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing 'from' and 'to' date parameters (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allConfigs = getAccountConfigs();
    if (allConfigs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Meta accounts configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter configs based on account param
    const configs = account && account !== "all"
      ? allConfigs.filter(c => c.label === account)
      : allConfigs;

    const results = await Promise.allSettled(
      configs.map(c => fetchAccountMetrics(c, from, to))
    );

    const allProcessed: ProcessedMetric[] = [];
    const errors: any[] = [];
    let anyConnected = false;

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        if (r.value.connected) anyConnected = true;
        allProcessed.push(...r.value.data);
        if (r.value.error) errors.push({ account: configs[i].label, error: r.value.error });
      } else {
        errors.push({ account: configs[i].label, error: String(r.reason) });
      }
    });

    const byDate: Record<string, ProcessedMetric[]> = {};
    for (const m of allProcessed) {
      if (!byDate[m.date]) byDate[m.date] = [];
      byDate[m.date].push(m);
    }

    return new Response(
      JSON.stringify({
        data: allProcessed,
        byDate,
        total: allProcessed.length,
        connected: anyConnected || errors.length === 0,
        accounts: allConfigs.map(c => c.label),
        ...(errors.length > 0 ? { errors } : {}),
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
