import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  accountIdsByNewestProfile,
  countAccounts,
  pageOf,
  profilesByOwner,
  type OwnerRow,
  type ProfileRow,
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

    // Check admin role (o papel é da conta)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { db: { schema } });
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST: contas (donos distintos em profile_owners) com os perfis de cada uma, 50 contas por página.
    // auth.users é compartilhado com outros apps: só aparece quem tem perfil no LinkHub.
    if (req.method === "GET" && action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;

      const { data: owners, error: ownersError } = await adminClient
        .from("profile_owners")
        .select("profile_id, owner_id");
      if (ownersError) throw ownersError;
      const ownerRows = (owners || []) as OwnerRow[];

      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, username, full_name, avatar_url, user_type, created_at")
        .in("id", ownerRows.map((o) => o.profile_id));
      if (profilesError) throw profilesError;
      const profileRows = (profiles || []) as ProfileRow[];

      const accountIds = accountIdsByNewestProfile(ownerRows, profileRows);
      const pageIds = pageOf(accountIds, page, perPage);
      const pageOwners = ownerRows.filter((o) => pageIds.includes(o.owner_id));

      const authResults = await Promise.all(pageIds.map((id) => adminClient.auth.admin.getUserById(id)));

      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", pageIds);
      if (rolesError) throw rolesError;

      // links.user_id é o id do perfil
      const { data: linkRows, error: linksError } = await adminClient
        .from("links")
        .select("user_id")
        .in("user_id", pageOwners.map((o) => o.profile_id));
      if (linksError) throw linksError;

      const grouped = profilesByOwner(pageOwners, profileRows, (linkRows || []).map((l: any) => l.user_id));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const users = authResults
        .map((r: any) => r.data?.user)
        .filter((u: any) => !!u)
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          role: roleMap.get(u.id) || "user",
          profiles: grouped.get(u.id) || [],
        }));

      return json({ users, total_accounts: accountIds.length, page, per_page: perPage });
    }

    // DELETE: apaga os vínculos da conta. O gatilho cleanup_owned_profile apaga os perfis,
    // e links, visitas e cliques saem em cascata. Os arquivos do Storage ficam, como antes.
    if (req.method === "DELETE" && action === "delete") {
      const targetUserId = url.searchParams.get("userId");
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot delete yourself");

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
      const targetUserId = body.userId;
      const ban = body.ban; // true = ban, false = unban
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot ban yourself");

      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        // Inativar: ~100 anos (na prática, permanente); reativar: "none"
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) throw error;

      return json({ success: true });
    }

    // STATS: "Usuários" são as contas distintas com perfil; "Perfis", todos os perfis
    if (req.method === "GET" && action === "stats") {
      const { data: owners, error: ownersError } = await adminClient.from("profile_owners").select("owner_id");
      if (ownersError) throw ownersError;
      const { count: profileCount } = await adminClient.from("profiles").select("*", { count: "exact", head: true });
      const { count: linkCount } = await adminClient.from("links").select("*", { count: "exact", head: true });
      const { count: viewCount } = await adminClient.from("profile_views").select("*", { count: "exact", head: true });
      const { count: clickCount } = await adminClient.from("link_clicks").select("*", { count: "exact", head: true });

      return json({
        totalUsers: countAccounts(owners || []),
        totalProfiles: profileCount || 0,
        totalLinks: linkCount || 0,
        totalViews: viewCount || 0,
        totalClicks: clickCount || 0,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
