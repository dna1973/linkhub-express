import { useState, useEffect } from 'react';
import { Link as LinkIcon, Palette, User, Sun, Moon, LogOut, Eye, BarChart3, Sparkles, Shield, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_SITE_URL } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: any;
}

const menuItems = [
  { id: 'links', title: 'Links', icon: LinkIcon },
  { id: 'design', title: 'Design', icon: Palette },
  { id: 'settings', title: 'Perfil', icon: User },
];

const analyticsItems = [
  { id: 'analytics', title: 'Analytics', icon: BarChart3 },
];

export function AppSidebar({ activeTab, onTabChange, profile }: AppSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // No painel móvel os rótulos sempre aparecem, mesmo que a barra do desktop esteja recolhida
  const isCollapsed = state === 'collapsed' && !isMobile;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) setOpenMobile(false);
  };

  const getPublicUrl = () => {
    if (!profile?.username) return '';
    if (profile?.preferred_domain === 'custom' && profile?.custom_domain) {
      return `https://${profile.custom_domain}/${profile.username}`;
    }
    return `${PUBLIC_SITE_URL}/${profile.username}`;
  };

  const handleViewProfile = () => {
    const url = getPublicUrl();
    if (url) window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado!', description: url });
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Recolhida, a barra tem 3rem: p-2 deixa o logo de 2rem caber, com o botão de recolher logo abaixo */}
      <SidebarHeader className={isCollapsed ? 'p-2' : 'p-4'}>
        <div className={isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3'}>
          <div className="w-8 h-8 shrink-0 rounded-full btn-gradient-primary flex items-center justify-center">
            <LinkIcon className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold">LinkHub</h1>
              {profile?.username && (
                <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
              )}
            </div>
          )}
          {/* No celular a sidebar é um painel deslizante: fecha clicando fora, e quem abre é a barra superior */}
          {!isMobile && (
            <SidebarTrigger
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Painel de Controle
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Relatórios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!isCollapsed && user?.email && (
          <p className="text-xs text-muted-foreground truncate px-2 pb-1">{user.email}</p>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="w-full justify-start text-primary"
          >
            <Shield className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Admin</span>}
          </Button>
        )}
        <div className="flex items-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewProfile}
            className="flex-1 justify-start"
            disabled={!profile?.username}
          >
            <Eye className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Ver Perfil</span>}
          </Button>
          {!isCollapsed && profile?.username && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {!isCollapsed && (
            <span className="ml-2">
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </span>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}