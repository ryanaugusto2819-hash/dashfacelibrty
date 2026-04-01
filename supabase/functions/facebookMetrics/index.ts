import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { from, to } = await req.json();

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing 'from' and 'to' date parameters (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const adAccount = Deno.env.get("META_AD_ACCOUNT");

    if (!accessToken || !adAccount) {
      return new Response(
        JSON.stringify({ error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fields = [
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "cpm",
      "cpc",
      "actions",
      "video_play_actions",
    "video_p95_watched_actions",
      "ad_id",
      "ad_name",
      "campaign_id",
      "campaign_name",
    ].join(",");

    const timeRange = JSON.stringify({ since: from, until: to });

    const url = new URL(`https://graph.facebook.com/v19.0/act_${adAccount}/insights`);
    url.searchParams.set("level", "ad");
    url.searchParams.set("time_range", timeRange);
    url.searchParams.set("time_increment", "1");
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", "500");
    url.searchParams.set("access_token", accessToken);

    const allData: MetaInsight[] = [];
    let nextUrl: string | null = url.toString();

    while (nextUrl) {
      let res: Response | null = null;
      let json: any = null;

      // Retry with exponential backoff for rate limits
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await fetch(nextUrl);
        json = await res.json();

        if (json.error && (json.error.code === 4 || json.error.code === 17 || json.error.is_transient)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/5)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break;
      }

      if (json.error) {
        const metaMessage = String(json.error?.message || "");
        const isConnectionError = json.error?.code === 190 || /ads_management|ads_read/i.test(metaMessage);

        if (isConnectionError) {
          return new Response(
            JSON.stringify({
              data: [],
              byDate: {},
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
        allData.push(...json.data);
      }

      nextUrl = json.paging?.next || null;
    }

    const processed: ProcessedMetric[] = allData.map((row) => {
      const spend = parseFloat(row.spend) || 0;
      const impressions = parseInt(row.impressions) || 0;
      const clicks = parseInt(row.clicks) || 0;
      const leads = getActionValue(
        row.actions,
        "onsite_conversion.total_messaging_connection"
      );
      const video3s = getActionValue(row.actions, "video_view");
      const videoP95 = getFirstActionValue(row.video_p95_watched_actions);

      return {
        date: row.date_start,
        ad_id: row.ad_id,
        ad_name: row.ad_name,
        campaign_id: (row as any).campaign_id || "",
        campaign_name: (row as any).campaign_name || "",
        spend,
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        leads,
        costPerLead: leads > 0 ? spend / leads : null,
        video3s,
        videoP95,
        hookRate: impressions > 0 ? (video3s / impressions) * 100 : 0,
        bodyRate: impressions > 0 ? (videoP95 / impressions) * 100 : 0,
      };
    });

    // Group by date
    const byDate: Record<string, ProcessedMetric[]> = {};
    for (const m of processed) {
      if (!byDate[m.date]) byDate[m.date] = [];
      byDate[m.date].push(m);
    }

    return new Response(
      JSON.stringify({ data: processed, byDate, total: processed.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
