import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("u");

  if (!username) {
    return new Response("Missing username", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  // Schema dedicado no self-hosted (edge runtime só expõe envs com prefixo SUPABASE_)
  const schema = Deno.env.get("SUPABASE_LINKHUB_SCHEMA") ?? "linkhub";
  const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema } });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, bio, avatar_url, username, custom_domain, preferred_domain")
    .eq("username", username)
    .single();

  // Default values
  const title = profile?.full_name
    ? `${profile.full_name} | LinkHub`
    : `@${username} | LinkHub`;
  const description = profile?.bio || `Confira os links de @${username} no LinkHub`;
  const avatar = profile?.avatar_url || "";
  
  // Determine redirect URL based on user's preferred domain
  const defaultSiteUrl = Deno.env.get("SUPABASE_LINKHUB_SITE_URL") ?? "https://linkhub.avila.ia.br";
  let siteUrl = defaultSiteUrl;
  if (profile?.preferred_domain === "custom" && profile?.custom_domain) {
    const domain = profile.custom_domain.startsWith("http")
      ? profile.custom_domain
      : `https://${profile.custom_domain}`;
    siteUrl = domain;
  }
  const profileUrl = `${siteUrl}/${username}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeHtml(profileUrl)}" />
  ${avatar ? `<meta property="og:image" content="${escapeHtml(avatar)}" />` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${avatar ? `<meta name="twitter:image" content="${escapeHtml(avatar)}" />` : ""}

  <!-- Redirect to the real profile page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(profileUrl)}" />
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(profileUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(profileUrl).replace(/</g, "\\u003c")});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
