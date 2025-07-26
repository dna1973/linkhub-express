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
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  console.log('Dashboard component loading...'); // Debug log
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('links');

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
        
        <main className="flex-1 flex">
          {/* Header with trigger */}
          <div className="flex-1">
            <header className="h-12 flex items-center border-b bg-card/30 backdrop-blur-sm px-4">
              <SidebarTrigger />
            </header>

            <div className="p-6">
              <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                {/* Left Panel - Dashboard */}
                <div className="space-y-6 lg:pr-6">
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-6">
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

                {/* Right Panel - Device Preview */}
                <div className="hidden lg:block">
                  <div className="sticky top-6">
                    <ProfilePreview profile={profile} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;