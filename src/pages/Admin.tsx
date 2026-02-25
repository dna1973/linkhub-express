import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Link as LinkIcon, Eye, MousePointerClick, Trash2, Search, ArrowLeft, Shield, Ban, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  role: string;
  link_count: number;
}

interface Stats {
  totalUsers: number;
  totalLinks: number;
  totalViews: number;
  totalClicks: number;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      setIsAdmin(false);
      navigate('/dashboard');
      toast({ title: 'Acesso negado', description: 'Você não tem permissão para acessar esta página.', variant: 'destructive' });
      return;
    }
    setIsAdmin(true);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

      const [usersRes, statsRes] = await Promise.all([
        fetch(`${base}?action=list`, { headers }).then(r => r.json()),
        fetch(`${base}?action=stats`, { headers }).then(r => r.json()),
      ]);

      setUsers(usersRes.users || []);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=delete&userId=${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({ title: 'Usuário excluído', description: `${email} foi removido.` });
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (stats) setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleBan = async (userId: string, email: string, currentlyBanned: boolean) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=toggle-ban`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, ban: !currentlyBanned }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const action = currentlyBanned ? 'reativado' : 'inativado';
      toast({ title: `Usuário ${action}`, description: `${email} foi ${action}.` });
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, banned_until: currentlyBanned ? null : '2126-01-01T00:00:00Z' } 
          : u
      ));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Painel Administrativo</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
              { label: 'Links', value: stats.totalLinks, icon: LinkIcon, color: 'text-green-500' },
              { label: 'Visualizações', value: stats.totalViews, icon: Eye, color: 'text-purple-500' },
              { label: 'Cliques', value: stats.totalClicks, icon: MousePointerClick, color: 'text-orange-500' },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Gerenciar Usuários</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Links</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => {
                  const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                  return (
                  <TableRow key={u.id} className={isBanned ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {(u.full_name || u.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate md:hidden">{u.email}</p>
                          {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                        </div>
                        {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{u.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {u.user_type && <Badge variant="outline" className="text-xs">{u.user_type}</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{u.link_count}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isBanned ? (
                        <Badge variant="destructive" className="text-[10px]">Inativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'admin' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleBan(u.id, u.email, !!isBanned)}
                            title={isBanned ? 'Reativar usuário' : 'Inativar usuário'}
                            className={isBanned ? 'text-green-500 hover:text-green-500' : 'text-orange-500 hover:text-orange-500'}
                          >
                            {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá permanentemente <strong>{u.email}</strong> e todos os seus dados (links, analytics, perfil). Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
