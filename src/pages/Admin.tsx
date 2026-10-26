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
import { Users, UserCircle, Link as LinkIcon, Eye, MousePointerClick, Trash2, Search, ArrowLeft, Shield, Ban, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { filterAdminUsers, statsAfterDeletingUser, type AdminStats, type AdminUser } from '@/lib/adminUsers';
import { profileName } from '@/lib/profileLabel';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
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
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkhub-admin-users`;

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

  const handleDeleteUser = async (target: AdminUser) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkhub-admin-users?action=delete&userId=${target.id}`,
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

      const count = target.profiles.length;
      toast({
        title: 'Conta excluída',
        description: `${target.email || '—'}: ${count} ${count === 1 ? 'perfil removido' : 'perfis removidos'}.`,
      });
      setUsers(prev => prev.filter(u => u.id !== target.id));
      setStats(prev => (prev ? statsAfterDeletingUser(prev, target) : prev));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleBan = async (userId: string, email: string, currentlyBanned: boolean) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkhub-admin-users?action=toggle-ban`,
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

  // E-mail, @ e nome de todos os perfis da conta
  const filteredUsers = filterAdminUsers(users, search);

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
              { label: 'Perfis', value: stats.totalProfiles ?? 0, icon: UserCircle, color: 'text-sky-500' },
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
                  placeholder="Buscar por e-mail, @ ou nome..."
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
                  <TableHead className="hidden sm:table-cell">Perfis</TableHead>
                  <TableHead className="hidden md:table-cell">Links</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => {
                  const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                  // O perfil mais antigo da conta representa a linha; os @ de todos aparecem embaixo
                  const main = u.profiles[0];
                  const handles = u.profiles.filter(p => p.username).map(p => `@${p.username}`);
                  const types = Array.from(new Set(u.profiles.map(p => p.user_type).filter(Boolean)));
                  const linksTotal = u.profiles.reduce((sum, p) => sum + p.links_count, 0);
                  // Sem e-mail quando a edge function não conseguiu ler a conta
                  const email = u.email || '—';
                  return (
                  <TableRow key={u.id} className={isBanned ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={main?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {(main?.full_name || u.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{profileName(main ?? {})}</p>
                          <p className="text-xs text-muted-foreground truncate md:hidden">{email}</p>
                          {handles.length > 0 && <p className="text-xs text-muted-foreground truncate">{handles.join(', ')}</p>}
                        </div>
                        {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{email}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {types.map(type => <Badge key={type} variant="outline" className="text-xs">{type}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{u.profiles.length}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{linksTotal}</TableCell>
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
                            onClick={() => handleToggleBan(u.id, email, !!isBanned)}
                            title={isBanned ? 'Reativar usuário' : 'Inativar usuário'}
                            className={isBanned ? 'text-green-500 hover:text-green-500' : 'text-orange-500 hover:text-orange-500'}
                          >
                            {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Excluir ${email}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir a conta no LinkHub?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso apaga <strong>todos os perfis</strong> de <strong>{email}</strong> no LinkHub ({u.profiles.length} {u.profiles.length === 1 ? 'perfil' : 'perfis'}{handles.length > 0 ? `: ${handles.join(', ')}` : ''}), com os links e as estatísticas. A conta de login continua existindo, e os arquivos enviados ficam no Storage. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u)}
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
