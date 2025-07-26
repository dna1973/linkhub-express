import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Link as LinkIcon, Palette, User, Sun, Moon } from 'lucide-react';
import { LinksTab } from '@/components/dashboard/LinksTab';
import { DesignTab } from '@/components/dashboard/DesignTab';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import { ProfilePreview } from '@/components/dashboard/ProfilePreview';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

const Dashboard = () => {
  console.log('Dashboard component loading...'); // Debug log
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
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
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          username: null,
          full_name: user.email?.split('@')[0] || 'Usuario',
        }])
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full btn-gradient-primary flex items-center justify-center">
              <LinkIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">LinkHub</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 mr-2" />
              ) : (
                <Moon className="h-4 w-4 mr-2" />
              )}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left Panel - Dashboard */}
          <div className="space-y-6 lg:pr-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Painel de Controle</span>
                  {profile?.username && (
                    <span className="text-sm text-muted-foreground">
                      @{profile.username}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="links" className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4" />
                      <span>Links</span>
                    </TabsTrigger>
                    <TabsTrigger value="design" className="flex items-center space-x-2">
                      <Palette className="h-4 w-4" />
                      <span>Design</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Perfil</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="links" className="mt-6">
                    <LinksTab profile={profile} onProfileUpdate={loadProfile} />
                  </TabsContent>
                  
                  <TabsContent value="design" className="mt-6">
                    <DesignTab profile={profile} onProfileUpdate={loadProfile} />
                  </TabsContent>
                  
                  <TabsContent value="settings" className="mt-6">
                    <SettingsTab profile={profile} onProfileUpdate={loadProfile} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Floating Preview */}
          <div className="hidden lg:block">
            <div className="fixed top-16 right-8 w-[420px] max-w-[calc(50vw-2rem)] z-10">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
                <CardHeader className="pb-1">
                  <CardTitle className="text-center text-sm">Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="p-1">
                  <div className="h-[calc(100vh-80px)]">
                    <ProfilePreview profile={profile} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;