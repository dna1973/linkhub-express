import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  accountIdsByNewestProfile,
  buildAccounts,
  countAccounts,
  normalizeUserId,
  pageOf,
  profilesByOwner,
  rowsFromOwnerEmbed,
  safePage,
  type OwnerEmbedRow,
} from "./group.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Schema dedicado no self-hosted (edge runtime só expõe envs com prefixo SUPABASE_)
    const schema = Deno.env.get("SUPABASE_LINKHUB_SCHEMA") ?? "linkhub";

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const callerId = user.id.toLowerCase();

    // Check admin role (o papel é da conta)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { db: { schema } });
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return json({ error: "Forbidden" }, 403);

    // O alvo de excluir/inativar não pode ser outro admin (a tela já esconde os botões; aqui é a trava de verdade)
    const isAdminAccount = async (id: string) => {
      const { data, error } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("user_id", id)
        .eq("role", "admin")
        .limit(1);
      if (error) throw error;
      return (data || []).length > 0;
    };

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST: contas (donos distintos em profile_owners) com os perfis de cada uma, 50 contas por página.
    // auth.users é compartilhado com outros apps: só aparece quem tem perfil no LinkHub.
    if (req.method === "GET" && action === "list") {
      const page = safePage(parseInt(url.searchParams.get("page") || "1"));
      const perPage = 50;

      // Uma leitura só, com o perfil e a contagem de links embutidos (FKs profile_owners.profile_id
      // e links_user_id_profile_fkey). Evita listas de ids na query string, que estouram a URL.
      // A sintaxe do embed (profile:profiles(...), links(count)) precisa ser conferida no teste em produção.
      // Leitura inteira, sem .range(): o PostgREST corta a resposta em max-rows (PGRST_DB_MAX_ROWS,
      // em geral 1000 no Supabase self-hosted) sem dar erro. Acima disso, contas sumiriam da lista e do total.
      const { data: ownerData, error: ownersError } = await adminClient
        .from("profile_owners")
        .select("profile_id, owner_id, profile:profiles(id, username, full_name, avatar_url, user_type, created_at, links(count))");
      if (ownersError) throw ownersError;
      const { owners, profiles } = rowsFromOwnerEmbed((ownerData || []) as unknown as OwnerEmbedRow[]);

      const accountIds = accountIdsByNewestProfile(owners, profiles);
      const pageIds = pageOf(accountIds, page, perPage);
      const pageOwners = owners.filter((o) => pageIds.includes(o.owner_id));

      const authResults = await Promise.all(pageIds.map((id) => adminClient.auth.admin.getUserById(id)));
      const authUsers = authResults.map((r: any, i) => {
        const authUser = r.data?.user ?? null;
        // A conta continua na lista, sem e-mail, em vez de sumir em silêncio
        if (!authUser) console.error("linkhub-admin-users: getUserById falhou", pageIds[i], r.error);
        return authUser;
      });

      // Só os ids da página (no máximo 50) vão na query string
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", pageIds);
      if (rolesError) throw rolesError;

      const users = buildAccounts(pageIds, authUsers, roles || [], profilesByOwner(pageOwners, profiles));

      return json({ users, total_accounts: accountIds.length, page, per_page: perPage });
    }

    // DELETE: apaga os vínculos da conta. O gatilho cleanup_owned_profile apaga os perfis,
    // e links, visitas e cliques saem em cascata. Os arquivos do Storage ficam, como antes.
    if (req.method === "DELETE" && action === "delete") {
      const targetUserId = normalizeUserId(url.searchParams.get("userId"));
      if (!targetUserId) return json({ error: "userId inválido" }, 400);
      if (targetUserId === callerId) return json({ error: "Cannot delete yourself" }, 400);
      if (await isAdminAccount(targetUserId)) return json({ error: "Cannot delete an admin" }, 403);

      const { error: ownersError } = await adminClient
        .from("profile_owners")
        .delete()
        .eq("owner_id", targetUserId);
      if (ownersError) throw ownersError;

      const { error: rolesError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (rolesError) throw rolesError;

      // O usuário em auth.users é compartilhado com outros apps do Supabase,
      // então só os dados do linkhub são removidos aqui.
      return json({ success: true });
    }

    // TOGGLE BAN USER
    if (req.method === "POST" && action === "toggle-ban") {
      const body = await req.json();
      const targetUserId = normalizeUserId(body?.userId);
      const ban = body?.ban; // true = ban, false = unban
      if (!targetUserId) return json({ error: "userId inválido" }, 400);
      if (targetUserId === callerId) return json({ error: "Cannot ban yourself" }, 400);
      if (await isAdminAccount(targetUserId)) return json({ error: "Cannot ban an admin" }, 403);

      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        // Inativar: ~100 anos (na prática, permanente); reativar: "none"
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) throw error;

      return json({ success: true });
    }

    // STATS: "Usuários" são as contas distintas com perfil; "Perfis", todos os perfis
    if (req.method === "GET" && action === "stats") {
      // Leitura inteira, como no LIST: o max-rows do PostgREST (PGRST_DB_MAX_ROWS) limita as linhas e,
      // passando dele, "Usuários" sairia menor sem erro. Os count("exact") abaixo não têm esse limite.
      const { data: owners, error: ownersError } = await adminClient.from("profile_owners").select("owner_id");
      if (ownersError) throw ownersError;
      const count = async (table: string) => {
        const { count, error } = await adminClient.from(table).select("*", { count: "exact", head: true });
        if (error) throw error;
        return count || 0;
      };

      return json({
        totalUsers: countAccounts(owners || []),
        totalProfiles: await count("profiles"),
        totalLinks: await count("links"),
        totalViews: await count("profile_views"),
        totalClicks: await count("link_clicks"),
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    // Detalhe só no log da função; o cliente recebe mensagem genérica
    console.error("linkhub-admin-users:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
