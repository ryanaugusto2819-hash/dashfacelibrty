import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawText = await req.text();
    console.log("=== RAW WEBHOOK PAYLOAD ===", rawText);
    // Tolerant parser: handles double-encoded JSON, missing commas, and loose "key: value" strings
    const tolerantParse = (text: string): any => {
      let t = text.trim();
      try {
        const once = JSON.parse(t);
        if (typeof once === "string") t = once.trim();
        else return once;
      } catch { /* not valid JSON yet */ }

      try { return JSON.parse(t); } catch { /* still malformed */ }

      // Fix loose "key: value" lines -> "key": "value"
      let fixed = t.replace(/"([A-Za-z_][\wÀ-ÿ]*)\s*:\s*([^"]*)"/g, '"$1": "$2"');
      // Add missing commas between property lines
      fixed = fixed.replace(/("\s*:\s*("[^"]*"|[\d.]+|true|false|null))\s*\n(\s*")/g, '$1,\n$3');

      try { return JSON.parse(fixed); } catch (e) {
        console.error("Tolerant parse failed:", e, "fixed=", fixed);
        const grab = (key: string) => {
          const re = new RegExp(`"${key}"\\s*[:=]\\s*"?([^",}\\n]+)"?`, "i");
          return t.match(re)?.[1]?.trim();
        };
        return {
          campaign: grab("campaign") || grab("campanha") || "",
          creative: grab("creative") || grab("criativo") || "",
          revenue: grab("revenue") || grab("valor") || grab("value") || 0,
          country: grab("country") || grab("pais") || grab("país") || "",
          date: grab("date") || grab("data"),
        };
      }
    };

    let body: any;
    try {
      body = tolerantParse(rawText);
    } catch (e) {
      console.error("Invalid payload:", rawText, e);
      return new Response(JSON.stringify({ error: "Invalid payload", raw: rawText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("=== PARSED BODY ===", JSON.stringify(body));
    const entries = Array.isArray(body) ? body : [body];

    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const nowBRT = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];

    // Normalize numeric values like "R$ 1.000,50" or "1000" or 1000
    const toNumber = (v: any): number => {
      if (typeof v === "number") return v;
      if (!v) return 0;
      const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const rows = entries.map((entry: any) => {
      const country = (entry.country || entry.pais || entry["país"] || entry.Pais || "").toString().toUpperCase().trim();
      return {
        date: entry.date || entry.data || nowBRT,
        campaign: entry.campaign || entry.campanha || "",
        revenue: toNumber(entry.revenue ?? entry.valor ?? entry.value),
        sales: 1,
        creative: entry.creative || entry.criativo || "",
        country,
      };
    });


    const { data, error } = await supabase
      .from("webhook_sales")
      .insert(rows)
      .select();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, inserted: data?.length || 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
