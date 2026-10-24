import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { LinksTab } from '@/components/dashboard/LinksTab';
import { DesignTab } from '@/components/dashboard/DesignTab';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ProfilePreview } from '@/components/dashboard/ProfilePreview';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { OnboardingDialog } from '@/components/dashboard/OnboardingDialog';
import { supabase } from '@/lib/supabase';
import { useDesignStore } from '@/stores/useDesignStore';
import { resolveThemeConfig } from '@/utils/themes';

const Dashboard = () => {
  // Dashboard component
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('links');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { setCurrentTheme, setCustomTheme } = useDesignStore();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load user profile
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading profile:', error);
    } else if (data) {
      setProfile(data);
      // Show onboarding if user_type is not set
      if (!data.user_type) {
        setShowOnboarding(true);
      }
      // Sync design store with saved theme
      if (data.theme_options && typeof data.theme_options === 'object' && !Array.isArray(data.theme_options)) {
        const opts = data.theme_options as Record<string, any>;
        if (opts.themeId) {
          setCurrentTheme(opts.themeId);
        }
        const resolved = resolveThemeConfig(opts);
        if (resolved) {
          setCustomTheme(resolved);
        }
      }
    } else {
      // Create profile if it doesn't exist
      const displayName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0] || 
                          'Usuario';
      
      const avatarUrl = user.user_metadata?.avatar_url || null;

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          username: null,
          full_name: displayName,
          avatar_url: avatarUrl,
        }])
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile);
        setShowOnboarding(true);
      }
    }
  };


  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          profile={profile} 
        />
        
        <main className="flex-1 flex min-w-0">
          {/* Header with trigger */}
          <div className="flex-1 min-w-0">
            <header className="h-12 flex items-center border-b bg-card/30 backdrop-blur-sm px-3 md:px-4">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium md:hidden truncate">
                {activeTab === 'links' ? 'Links' : activeTab === 'design' ? 'Design' : activeTab === 'settings' ? 'Perfil' : activeTab === 'analytics' ? 'Analytics' : 'Dashboard'}
              </span>
            </header>

            <div className="p-3 sm:p-4 md:p-6">
              <div className={activeTab === 'analytics' ? 'w-full' : 'lg:grid lg:grid-cols-2 lg:gap-6'}>
                {/* Left Panel - Dashboard */}
                <div className={activeTab === 'analytics' ? 'w-full' : 'space-y-4 md:space-y-6'}>
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className={activeTab === 'analytics' ? 'p-0' : 'p-3 sm:p-4 md:p-6'}>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsContent value="links" className="mt-0">
                          <LinksTab profile={profile} onProfileUpdate={loadProfile} />
                        </TabsContent>
                        
                        <TabsContent value="design" className="mt-0">
                          <DesignTab profile={profile} onProfileUpdate={loadProfile} />
                        </TabsContent>
                        
                        <TabsContent value="analytics" className="mt-0">
                          <AnalyticsTab profile={profile} onProfileUpdate={loadProfile} />
                        </TabsContent>
                        
                        <TabsContent value="settings" className="mt-0">
                          <SettingsTab profile={profile} onProfileUpdate={loadProfile} />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Device Preview - Hidden on mobile/tablet */}
                {activeTab !== 'analytics' && (
                  <div className="hidden lg:block">
                    <div className="sticky top-6">
                      <ProfilePreview profile={profile} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <OnboardingDialog
          open={showOnboarding}
          onComplete={(userType) => {
            setShowOnboarding(false);
            loadProfile();
          }}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;