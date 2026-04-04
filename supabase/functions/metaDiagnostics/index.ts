import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

function maskToken(token: string) {
  return {
    length: token.length,
    prefix: token.slice(0, 6),
    suffix: token.slice(-6),
  };
}

async function fetchMeta(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  return { response, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const adAccount = Deno.env.get("META_AD_ACCOUNT");

    if (!accessToken || !adAccount) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
    const adAccountsUrl = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,name,account_status&limit=200&access_token=${encodeURIComponent(accessToken)}`;
    const targetAccountUrl = `https://graph.facebook.com/v19.0/act_${encodeURIComponent(adAccount)}?fields=id,account_id,name,account_status&access_token=${encodeURIComponent(accessToken)}`;

    const [meResult, adAccountsResult, targetAccountResult] = await Promise.all([
      fetchMeta(meUrl),
      fetchMeta(adAccountsUrl),
      fetchMeta(targetAccountUrl),
    ]);

    const meError = meResult.data?.error as MetaError | undefined;
    const adAccountsError = adAccountsResult.data?.error as MetaError | undefined;
    const targetAccountError = targetAccountResult.data?.error as MetaError | undefined;

    const accessibleAccounts = Array.isArray(adAccountsResult.data?.data)
      ? adAccountsResult.data.data.map((account: any) => ({
          id: account.id,
          account_id: account.account_id,
          name: account.name,
          account_status: account.account_status,
        }))
      : [];

    const normalizedAdAccount = String(adAccount).replace(/^act_/, "");
    const matchedAccessibleAccount = accessibleAccounts.find(
      (account: { id?: string; account_id?: string }) =>
        account.account_id === normalizedAdAccount ||
        String(account.id || "").replace(/^act_/, "") === normalizedAdAccount
    );

    const invalidToken = [meError, adAccountsError, targetAccountError].some(
      (error) => error?.code === 190
    );

    const missingPermissions = [meError, adAccountsError, targetAccountError].some((error) => {
      const message = String(error?.message || "");
      return /ads_read|ads_management|permission/i.test(message);
    });

    return new Response(
      JSON.stringify({
        ok: !invalidToken,
        configured: {
          adAccount: normalizedAdAccount,
          token: maskToken(accessToken),
        },
        tokenValid: !invalidToken,
        missingPermissions,
        me: meError
          ? { error: meError }
          : {
              id: meResult.data?.id || null,
              name: meResult.data?.name || null,
            },
        accessibleAccountsCount: accessibleAccounts.length,
        accessibleAccounts,
        targetAccount: targetAccountError
          ? { error: targetAccountError }
          : {
              id: targetAccountResult.data?.id || null,
              account_id: targetAccountResult.data?.account_id || null,
              name: targetAccountResult.data?.name || null,
              account_status: targetAccountResult.data?.account_status || null,
            },
        matchesConfiguredAccount: Boolean(matchedAccessibleAccount),
        diagnosis: invalidToken
          ? "invalid_token"
          : missingPermissions
          ? "missing_permissions"
          : matchedAccessibleAccount
          ? "credentials_aligned"
          : accessibleAccounts.length > 0
          ? "account_mismatch"
          : "no_ad_accounts_visible",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal error",
        message: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
