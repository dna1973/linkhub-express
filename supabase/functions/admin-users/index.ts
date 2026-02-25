import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST USERS
    if (req.method === "GET" && action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;

      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) throw error;

      // Get profiles for these users
      const userIds = users.map((u: any) => u.id);
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, username, full_name, avatar_url, created_at, user_type")
        .in("id", userIds);

      // Get roles
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Get link counts
      const { data: linkCounts } = await adminClient
        .from("links")
        .select("user_id")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      const linkCountMap = new Map<string, number>();
      (linkCounts || []).forEach((l: any) => {
        linkCountMap.set(l.user_id, (linkCountMap.get(l.user_id) || 0) + 1);
      });

      const enrichedUsers = users.map((u: any) => {
        const profile = profileMap.get(u.id) || {};
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          user_type: profile.user_type,
          role: roleMap.get(u.id) || "user",
          link_count: linkCountMap.get(u.id) || 0,
        };
      });

      return new Response(JSON.stringify({ users: enrichedUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE USER
    if (req.method === "DELETE" && action === "delete") {
      const targetUserId = url.searchParams.get("userId");
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot delete yourself");

      // Delete related data first (cascading)
      await adminClient.from("link_clicks").delete().eq("profile_id", targetUserId);
      await adminClient.from("profile_views").delete().eq("profile_id", targetUserId);
      await adminClient.from("links").delete().eq("user_id", targetUserId);
      await adminClient.from("profiles").delete().eq("id", targetUserId);
      await adminClient.from("user_roles").delete().eq("user_id", targetUserId);

      // Finally delete auth user
      const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TOGGLE BAN USER
    if (req.method === "POST" && action === "toggle-ban") {
      const body = await req.json();
      const targetUserId = body.userId;
      const ban = body.ban; // true = ban, false = unban
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot ban yourself");

      if (ban) {
        // Ban for ~100 years (effectively permanent)
        const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h",
        });
        if (error) throw error;
      } else {
        // Unban
        const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "none",
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STATS
    if (req.method === "GET" && action === "stats") {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { count: linkCount } = await adminClient.from("links").select("*", { count: "exact", head: true });
      const { count: viewCount } = await adminClient.from("profile_views").select("*", { count: "exact", head: true });
      const { count: clickCount } = await adminClient.from("link_clicks").select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({
        totalUsers: users?.length || 0,
        totalLinks: linkCount || 0,
        totalViews: viewCount || 0,
        totalClicks: clickCount || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
