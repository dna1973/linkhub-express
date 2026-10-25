import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { LinksTab } from '@/components/dashboard/LinksTab';
import { DesignTab } from '@/components/dashboard/DesignTab';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ProfilesTab } from '@/components/dashboard/ProfilesTab';
import { NewProfileDialog } from '@/components/dashboard/NewProfileDialog';
import { ProfilePreview } from '@/components/dashboard/ProfilePreview';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { OnboardingDialog } from '@/components/dashboard/OnboardingDialog';
import { useCurrentProfile } from '@/contexts/CurrentProfileContext';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TAB_LABELS: Record<string, string> = {
  links: 'Links',
  design: 'Design',
  settings: 'Perfil',
  analytics: 'Analytics',
  profiles: 'Meus perfis',
};

// Abas sem a prévia do perfil: nem a coluna da direita nem o botão "Prévia"
const TABS_WITHOUT_PREVIEW = ['analytics', 'profiles'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // O perfil atual vem do CurrentProfileProvider (rota de layout): ele carrega, cria o primeiro e troca
  const { currentProfile, loading, error, reloadProfiles } = useCurrentProfile();
  const [activeTab, setActiveTab] = useState('links');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  // Perfil cujo onboarding acabou de terminar: o diálogo some na hora, antes de a lista voltar com o user_type
  const [onboardedId, setOnboardedId] = useState<string | null>(null);
  // Mesmo ponto de corte do lg: a prévia lateral só existe em tela larga, o Dialog só abaixo dela
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Ao alargar a janela com o Dialog aberto, ele fecha e a prévia lateral assume
  useEffect(() => {
    if (isDesktop) setPreviewOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        {error && !loading ? (
          <>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" onClick={() => void reloadProfiles()}>
              Tentar de novo
            </Button>
          </>
        ) : (
          <div
            role="status"
            aria-label="Carregando seus perfis"
            className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
          />
        )}
      </div>
    );
  }

  // Trocar de perfil remonta abas, prévia e onboarding: nenhum estado passa de um perfil para outro
  const profileKey = currentProfile.id;
  const showPreview = !TABS_WITHOUT_PREVIEW.includes(activeTab);
  const showOnboarding = !currentProfile.user_type && onboardedId !== currentProfile.id;
  // A DesignTab lê o tema só ao montar. O onboarding grava user_type e theme_options juntos: quando o
  // perfil volta da recarga já com o tipo, o editor remonta com o tema do modelo. Salvar na própria aba
  // muda só o tema e não remonta (a subaba aberta fica).
  const designKey = `design:${profileKey}:${currentProfile.user_type ? 'ready' : 'onboarding'}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCreateProfile={() => setNewProfileOpen(true)}
        />

        <main className="flex-1 flex min-w-0">
          {/* Barra superior só no celular: lá a sidebar é um painel deslizante e precisa deste botão para abrir.
              Em tela larga o botão de recolher fica dentro da própria sidebar, e a página ganha a altura da barra. */}
          <div className="flex-1 min-w-0">
            <header className="h-12 flex items-center border-b bg-card/30 backdrop-blur-sm px-3 md:hidden">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium truncate">
                {TAB_LABELS[activeTab] ?? 'Dashboard'}
              </span>
            </header>

            <div className="p-3 pb-20 sm:p-4 sm:pb-20 md:p-6 md:pb-20 lg:pb-6">
              <div className={showPreview ? 'lg:grid lg:grid-cols-2 lg:gap-6' : 'w-full'}>
                {/* Left Panel - Dashboard */}
                <div className={showPreview ? 'space-y-4 md:space-y-6' : 'w-full'}>
                  <Card className="bg-card border-border/60 shadow-sm">
                    <CardContent className={activeTab === 'analytics' ? 'p-0' : 'p-3 sm:p-4 md:p-6'}>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsContent key={`links:${profileKey}`} value="links" className="mt-0">
                          <LinksTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={designKey} value="design" className="mt-0">
                          <DesignTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={`analytics:${profileKey}`} value="analytics" className="mt-0">
                          <AnalyticsTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={`settings:${profileKey}`} value="settings" className="mt-0">
                          <SettingsTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent value="profiles" className="mt-0">
                          <ProfilesTab
                            onOpenLinks={() => setActiveTab('links')}
                            onCreateProfile={() => setNewProfileOpen(true)}
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Device Preview - Hidden on mobile/tablet */}
                {showPreview && (
                  <div className="hidden lg:block">
                    {/* Altura definida (padding da página + top-6; sem barra superior em tela larga): é ela que limita a escala do aparelho */}
                    <div className="sticky top-6 h-[calc(100dvh-3rem)]">
                      {/* Montada só em tela larga: abaixo de lg a prévia vive no Dialog, sem segunda instância */}
                      {isDesktop && <ProfilePreview key={profileKey} profile={currentProfile} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Tela estreita: a prévia lateral some e o botão abre a mesma prévia em tela cheia */}
        {showPreview && (
          <Button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setPreviewOpen(true)}
            className="fixed bottom-4 right-4 z-40 h-11 rounded-full px-4 shadow-lg lg:hidden"
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévia
          </Button>
        )}

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            aria-describedby={undefined}
            className={cn(
              // Tela cheia: sobrescreve posição, tamanho, raio e espaçamento padrão do DialogContent
              'max-w-none w-screen h-[100dvh] p-0 gap-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none border-0 flex flex-col',
              // Sem deslizar nem zoom: só o fade padrão
              '![--tw-enter-scale:1] ![--tw-exit-scale:1] ![--tw-enter-translate-x:0] ![--tw-enter-translate-y:0] ![--tw-exit-translate-x:0] ![--tw-exit-translate-y:0]',
              // Esconde o X padrão (filho direto); o cabeçalho próprio está dentro de um div
              '[&>button]:hidden'
            )}
          >
            <DialogTitle className="sr-only">Prévia do perfil</DialogTitle>
            <ProfilePreview
              key={profileKey}
              profile={currentProfile}
              className="p-3"
              headerEnd={
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="sm">
                    Fechar
                  </Button>
                </DialogClose>
              }
            />
          </DialogContent>
        </Dialog>

        {/* Perfil sem user_type (primeiro acesso ou perfil novo): o onboarding monta este perfil */}
        <OnboardingDialog
          key={profileKey}
          open={showOnboarding}
          profile={currentProfile}
          onComplete={() => {
            setOnboardedId(currentProfile.id);
            void reloadProfiles();
          }}
        />

        <NewProfileDialog
          open={newProfileOpen}
          onOpenChange={setNewProfileOpen}
          onCreated={() => setActiveTab('links')}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
