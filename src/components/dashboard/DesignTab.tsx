import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Palette, Sparkles, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDesignStore } from '@/stores/useDesignStore';

interface DesignTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

const PREDEFINED_THEMES = [
  {
    id: 'default',
    name: 'Default Dark',
    preview: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    config: {
      background: { type: 'solid', color: '#111827' },
      buttonStyle: 'glass',
      font: 'system',
    },
  },
  {
    id: 'pebble-blue',
    name: 'Pebble Blue',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
      buttonStyle: 'solid',
      font: 'system',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    preview: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    config: {
      background: { type: 'gradient', colors: ['#f59e0b', '#dc2626'] },
      buttonStyle: 'outline',
      font: 'system',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    preview: 'linear-gradient(135deg, #0891b2 0%, #1e40af 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0891b2', '#1e40af'] },
      buttonStyle: 'glass',
      font: 'system',
    },
  },
];

export const DesignTab: React.FC<DesignTabProps> = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, customTheme, setCurrentTheme, setCustomTheme } = useDesignStore();
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [customBgColor, setCustomBgColor] = useState('#111827');
  const [customBgType, setCustomBgType] = useState<'solid' | 'gradient'>('solid');
  const [customButtonStyle, setCustomButtonStyle] = useState<'solid' | 'outline' | 'glass'>('glass');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.theme_options) {
      const themeOptions = profile.theme_options;
      if (themeOptions.themeId) {
        setSelectedTheme(themeOptions.themeId);
        setCurrentTheme(themeOptions.themeId);
      }
      if (themeOptions.custom) {
        setCustomTheme(themeOptions.custom);
        setCustomBgColor(themeOptions.custom.background?.color || '#111827');
        setCustomBgType(themeOptions.custom.background?.type || 'solid');
        setCustomButtonStyle(themeOptions.custom.buttonStyle || 'glass');
      }
    }
  }, [profile, setCurrentTheme, setCustomTheme]);

  const handleSaveTheme = async () => {
    if (!user) return;

    setLoading(true);

    const themeOptions = {
      themeId: selectedTheme,
      custom: selectedTheme === 'custom' ? {
        background: {
          type: customBgType,
          color: customBgColor,
        },
        buttonStyle: customButtonStyle,
        font: 'system',
      } : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ theme_options: themeOptions })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de design.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Design salvo!",
        description: "Suas configurações de design foram aplicadas.",
      });
      onProfileUpdate();
    }

    setLoading(false);
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    setCurrentTheme(themeId);
    
    if (themeId !== 'custom') {
      const theme = PREDEFINED_THEMES.find(t => t.id === themeId);
      if (theme) {
        setCustomTheme(theme.config as any);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Predefined Themes */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2" />
          Temas Predefinidos
        </h3>
        
        <RadioGroup value={selectedTheme} onValueChange={handleThemeSelect}>
          <div className="grid grid-cols-1 gap-3">
            {PREDEFINED_THEMES.map((theme) => (
              <Label
                key={theme.id}
                htmlFor={theme.id}
                className="cursor-pointer"
              >
                <Card className={`bg-card/30 border-border/50 hover-bounce transition-all ${
                  selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={theme.id} id={theme.id} />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                        style={{ background: theme.preview }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {theme.config.buttonStyle} • {theme.config.background.type}
                        </p>
                      </div>
                      {selectedTheme === theme.id && (
                        <Badge variant="secondary" className="text-xs">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Custom Theme */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Tema Personalizado
        </h3>
        
        <Label htmlFor="custom" className="cursor-pointer">
          <Card className={`bg-card/30 border-border/50 transition-all ${
            selectedTheme === 'custom' ? 'ring-2 ring-primary' : ''
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <RadioGroup value={selectedTheme} onValueChange={handleThemeSelect}>
                  <RadioGroupItem value="custom" id="custom" />
                </RadioGroup>
                <CardTitle className="text-base">Criar Tema Personalizado</CardTitle>
              </div>
            </CardHeader>
            
            {selectedTheme === 'custom' && (
              <CardContent className="pt-0 space-y-4">
                <div>
                  <Label className="text-sm">Tipo de Fundo</Label>
                  <RadioGroup
                    value={customBgType}
                    onValueChange={(value: 'solid' | 'gradient') => setCustomBgType(value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="solid" id="solid" />
                      <Label htmlFor="solid" className="text-sm">Cor Sólida</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gradient" id="gradient" />
                      <Label htmlFor="gradient" className="text-sm">Gradiente</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label className="text-sm">Cor Principal</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="w-12 h-10 p-1 rounded"
                    />
                    <Input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      placeholder="#111827"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Estilo dos Botões</Label>
                  <RadioGroup
                    value={customButtonStyle}
                    onValueChange={(value: 'solid' | 'outline' | 'glass') => setCustomButtonStyle(value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="solid" id="btn-solid" />
                      <Label htmlFor="btn-solid" className="text-sm">Sólido</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outline" id="btn-outline" />
                      <Label htmlFor="btn-outline" className="text-sm">Contorno</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="glass" id="btn-glass" />
                      <Label htmlFor="btn-glass" className="text-sm">Glassmorphism</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            )}
          </Card>
        </Label>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveTheme}
        disabled={loading}
        className="w-full btn-gradient-primary hover-bounce"
      >
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
};