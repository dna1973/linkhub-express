import { useState, useEffect } from 'react';
import { Link as LinkIcon, Palette, User, Users, Sun, Moon, LogOut, Eye, BarChart3, Shield, Copy, ChevronsUpDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { MAX_PROFILES, useCurrentProfile, type Profile } from '@/contexts/CurrentProfileContext';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
import { profileInitial, profileLabel, profileName } from '@/lib/profileLabel';
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
  /** "Criar novo perfil" no seletor: o Dashboard abre o diálogo. */
  onCreateProfile: () => void;
}

const menuItems = [
  { id: 'links', title: 'Links', icon: LinkIcon },
  { id: 'design', title: 'Design', icon: Palette },
  { id: 'settings', title: 'Perfil', icon: User },
  { id: 'profiles', title: 'Meus perfis', icon: Users },
];

const analyticsItems = [
  { id: 'analytics', title: 'Analytics', icon: BarChart3 },
];

/** "@dna" ou, para perfil sem @, o nome; antes da primeira carga, "carregando". */
const currentLabelOf = (profile: Profile | null): string => (profile ? profileLabel(profile) : 'carregando');

/** Avatar de 24 px do seletor. Decorativo: o nome acessível vem do texto do item ou do aria-label. */
function ProfileAvatar({ profile }: { profile: Profile | null }) {
  const initial = profileInitial(profile);
  return (
    <Avatar className="h-6 w-6 shrink-0" aria-hidden>
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
      <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
    </Avatar>
  );
}

export function AppSidebar({ activeTab, onTabChange, onCreateProfile }: AppSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profiles, currentProfile, selectProfile } = useCurrentProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  // No painel móvel os rótulos sempre aparecem, mesmo que a barra do desktop esteja recolhida
  const isCollapsed = state === 'collapsed' && !isMobile;
  const [isAdmin, setIsAdmin] = useState(false);
  const atLimit = profiles.length >= MAX_PROFILES;
  const currentLabel = currentLabelOf(currentProfile);

  // O papel é da conta, não do perfil
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

  const handleSelectProfile = (id: string) => {
    selectProfile(id);
    if (isMobile) setOpenMobile(false);
  };

  const handleCreateProfile = () => {
    onCreateProfile();
    if (isMobile) setOpenMobile(false);
  };

  // Mesma regra do QR code e da aba Perfil (aceita domínio personalizado gravado com https://)
  const getPublicUrl = () => getPublicProfileUrl(currentProfile);

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
          <BrandLogo size={32} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                // Aberta, o nome acessível começa pelo texto visível (WCAG 2.5.3); recolhida, só há o avatar
                aria-label={isCollapsed ? `Trocar de perfil (atual: ${currentLabel})` : `LinkHub, ${currentLabel}: trocar de perfil`}
                title="Trocar de perfil"
                className={
                  isCollapsed
                    ? 'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                }
              >
                {isCollapsed ? (
                  <ProfileAvatar profile={currentProfile} />
                ) : (
                  <>
                    <span className="block min-w-0 flex-1">
                      <span className="block text-lg font-bold">LinkHub</span>
                      {currentProfile && (
                        <span className="block text-xs text-muted-foreground truncate">{currentLabel}</span>
                      )}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Seus perfis</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currentProfile?.id ?? ''} onValueChange={handleSelectProfile}>
                {profiles.map((profile) => (
                  <DropdownMenuRadioItem key={profile.id} value={profile.id} className="gap-2">
                    <ProfileAvatar profile={profile} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{profileName(profile)}</span>
                      {profile.username && (
                        <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
                      )}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" disabled={atLimit} onSelect={handleCreateProfile}>
                <Plus className="h-4 w-4" aria-hidden />
                <span className="flex-1">Criar novo perfil</span>
                {atLimit && <span className="text-xs text-muted-foreground">Limite de {MAX_PROFILES} perfis</span>}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => handleTabChange('profiles')}>
                <Users className="h-4 w-4" aria-hidden />
                Meus perfis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            disabled={!currentProfile?.username}
          >
            <Eye className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Ver Perfil</span>}
          </Button>
          {!isCollapsed && currentProfile?.username && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Copiar link do perfil"
              title="Copiar link do perfil"
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
