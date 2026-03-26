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
    const body = await req.json();
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

    // Use São Paulo timezone for default date
    const nowBRT = new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];

    const rows = entries.map((entry: any) => {
      const currency = (entry.currency || entry.moeda || "BRL").toUpperCase();
      return {
        date: entry.date || entry.data || nowBRT,
        campaign: entry.campaign || entry.campanha || "",
        revenue: Number(entry.revenue || entry.valor || entry.value || 0),
        country: entry.country || entry.pais || entry.país || "",
        sales: Number(entry.sales || entry.vendas || entry.quantity || 1),
        currency,
        creative: entry.campaign || entry.campanha || "",
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
