import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Save, Type, Zap, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDesignStore, ThemeConfig } from '@/stores/useDesignStore';

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
      buttonStyle: { type: 'glass', color: '#3b82f6', borderRadius: 'md' },
      font: { family: 'system', size: 'md', weight: 'normal' },
      colors: { primary: '#3b82f6', secondary: '#6b7280', accent: '#8b5cf6', text: '#ffffff' },
    },
  },
  {
    id: 'pebble-blue',
    name: 'Pebble Blue',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
      font: { family: 'system', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#cbd5e1', accent: '#60a5fa', text: '#ffffff' },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    preview: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    config: {
      background: { type: 'gradient', colors: ['#f59e0b', '#dc2626'] },
      buttonStyle: { type: 'outline', color: '#ffffff', borderRadius: 'full' },
      font: { family: 'serif', size: 'lg', weight: 'bold' },
      colors: { primary: '#ffffff', secondary: '#fef3c7', accent: '#fbbf24', text: '#ffffff' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    preview: 'linear-gradient(135deg, #0891b2 0%, #1e40af 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0891b2', '#1e40af'] },
      buttonStyle: { type: 'modern', color: '#22d3ee', borderRadius: 'md' },
      font: { family: 'display', size: 'md', weight: 'medium' },
      colors: { primary: '#22d3ee', secondary: '#67e8f9', accent: '#0ea5e9', text: '#ffffff' },
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    preview: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#065f46', '#064e3b'] },
      buttonStyle: { type: 'glass', color: '#10b981', borderRadius: 'lg' },
      font: { family: 'mono', size: 'md', weight: 'normal' },
      colors: { primary: '#10b981', secondary: '#6ee7b7', accent: '#34d399', text: '#ffffff' },
    },
  },
];

const FONT_FAMILIES = [
  { id: 'system', name: 'System Font', preview: 'Aa' },
  { id: 'serif', name: 'Serif (Elegante)', preview: 'Aa', style: 'font-serif' },
  { id: 'mono', name: 'Monospace (Código)', preview: 'Aa', style: 'font-mono' },
  { id: 'display', name: 'Display (Títulos)', preview: 'Aa', style: 'font-bold' },
  { id: 'handwriting', name: 'Handwriting', preview: 'Aa', style: 'italic' },
];

const BUTTON_STYLES = [
  { id: 'solid', name: 'Sólido', preview: 'bg-primary text-white' },
  { id: 'outline', name: 'Contorno', preview: 'border-2 border-primary text-primary bg-transparent' },
  { id: 'glass', name: 'Glass', preview: 'bg-white/10 backdrop-blur border border-white/20 text-white' },
  { id: 'modern', name: 'Moderno', preview: 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' },
  { id: 'rounded', name: 'Arredondado', preview: 'bg-primary text-white rounded-full' },
];

const BACKGROUND_PATTERNS = [
  { id: 'none', name: 'Nenhum', preview: '' },
  { id: 'dots', name: 'Pontos', preview: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'grid', name: 'Grade', preview: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'waves', name: 'Ondas', preview: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' },
];

export const DesignTab: React.FC<DesignTabProps> = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, customTheme, setCurrentTheme, setCustomTheme } = useDesignStore();
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [customConfig, setCustomConfig] = useState<ThemeConfig>(customTheme);
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
        setCustomConfig(themeOptions.custom);
      }
    }
  }, [profile, setCurrentTheme, setCustomTheme]);

  const handleSaveTheme = async () => {
    if (!user) return;

    setLoading(true);

    const themeOptions = {
      themeId: selectedTheme,
      custom: selectedTheme === 'custom' ? customConfig : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ theme_options: themeOptions as any })
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
        setCustomTheme(theme.config as ThemeConfig);
      }
    }
  };

  const updateCustomConfig = (section: keyof ThemeConfig, updates: any) => {
    const newConfig = {
      ...customConfig,
      [section]: { ...customConfig[section], ...updates }
    };
    setCustomConfig(newConfig);
    
    // Atualizar o store imediatamente para pré-visualização em tempo real
    if (selectedTheme === 'custom') {
      setCustomTheme(newConfig);
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
                          {theme.config.buttonStyle.type} • {theme.config.background.type}
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
              <CardContent className="pt-0 space-y-6">
                {/* Background */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Image className="h-4 w-4 mr-2" />
                    Fundo
                  </h4>
                  
                  <div>
                    <Label className="text-sm">Tipo de Fundo</Label>
                    <Select
                      value={customConfig.background.type}
                      onValueChange={(value: 'solid' | 'gradient' | 'pattern') => 
                        updateCustomConfig('background', { type: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Cor Sólida</SelectItem>
                        <SelectItem value="gradient">Gradiente</SelectItem>
                        <SelectItem value="pattern">Padrão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Cor Principal</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        type="color"
                        value={customConfig.background.color || '#111827'}
                        onChange={(e) => updateCustomConfig('background', { color: e.target.value })}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        type="text"
                        value={customConfig.background.color || '#111827'}
                        onChange={(e) => updateCustomConfig('background', { color: e.target.value })}
                        placeholder="#111827"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {customConfig.background.type === 'gradient' && (
                    <div>
                      <Label className="text-sm">Segunda Cor (Gradiente)</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={customConfig.background.colors?.[1] || '#1f2937'}
                          onChange={(e) => updateCustomConfig('background', { 
                            colors: [customConfig.background.color || '#111827', e.target.value] 
                          })}
                          className="w-12 h-10 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={customConfig.background.colors?.[1] || '#1f2937'}
                          onChange={(e) => updateCustomConfig('background', { 
                            colors: [customConfig.background.color || '#111827', e.target.value] 
                          })}
                          placeholder="#1f2937"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {customConfig.background.type === 'pattern' && (
                    <div>
                      <Label className="text-sm">Padrão</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {BACKGROUND_PATTERNS.map((pattern) => (
                          <Button
                            key={pattern.id}
                            variant={customConfig.background.pattern === pattern.id ? "default" : "outline"}
                            className="h-12 text-xs"
                            onClick={() => updateCustomConfig('background', { pattern: pattern.id })}
                          >
                            {pattern.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Type className="h-4 w-4 mr-2" />
                    Tipografia
                  </h4>
                  
                  <div>
                    <Label className="text-sm">Família da Fonte</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {FONT_FAMILIES.map((font) => (
                        <Button
                          key={font.id}
                          variant={customConfig.font.family === font.id ? "default" : "outline"}
                          className={`h-12 text-xs ${font.style || ''}`}
                          onClick={() => updateCustomConfig('font', { family: font.id })}
                        >
                          <div className="text-center">
                            <div className="text-lg">{font.preview}</div>
                            <div>{font.name}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Tamanho</Label>
                      <Select
                        value={customConfig.font.size}
                        onValueChange={(value: 'sm' | 'md' | 'lg') => 
                          updateCustomConfig('font', { size: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno</SelectItem>
                          <SelectItem value="md">Médio</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Peso</Label>
                      <Select
                        value={customConfig.font.weight}
                        onValueChange={(value: 'light' | 'normal' | 'medium' | 'bold') => 
                          updateCustomConfig('font', { weight: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Leve</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="bold">Negrito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Button Style */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Estilo dos Botões
                  </h4>
                  
                  <div>
                    <Label className="text-sm">Tipo de Botão</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {BUTTON_STYLES.map((style) => (
                        <Button
                          key={style.id}
                          variant={customConfig.buttonStyle.type === style.id ? "default" : "outline"}
                          className="h-12 text-xs"
                          onClick={() => updateCustomConfig('buttonStyle', { type: style.id })}
                        >
                          {style.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Cor do Botão</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={customConfig.buttonStyle.color || '#3b82f6'}
                          onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })}
                          className="w-12 h-10 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={customConfig.buttonStyle.color || '#3b82f6'}
                          onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Bordas</Label>
                      <Select
                        value={customConfig.buttonStyle.borderRadius}
                        onValueChange={(value: 'none' | 'sm' | 'md' | 'lg' | 'full') => 
                          updateCustomConfig('buttonStyle', { borderRadius: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem bordas</SelectItem>
                          <SelectItem value="sm">Pequenas</SelectItem>
                          <SelectItem value="md">Médias</SelectItem>
                          <SelectItem value="lg">Grandes</SelectItem>
                          <SelectItem value="full">Circulares</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    Cores do Tema
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Cor Primária</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={customConfig.colors?.primary || '#3b82f6'}
                          onChange={(e) => updateCustomConfig('colors', { 
                            ...customConfig.colors, 
                            primary: e.target.value 
                          })}
                          className="w-12 h-10 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={customConfig.colors?.primary || '#3b82f6'}
                          onChange={(e) => updateCustomConfig('colors', { 
                            ...customConfig.colors, 
                            primary: e.target.value 
                          })}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Cor de Destaque</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="color"
                          value={customConfig.colors?.accent || '#8b5cf6'}
                          onChange={(e) => updateCustomConfig('colors', { 
                            ...customConfig.colors, 
                            accent: e.target.value 
                          })}
                          className="w-12 h-10 p-1 rounded"
                        />
                        <Input
                          type="text"
                          value={customConfig.colors?.accent || '#8b5cf6'}
                          onChange={(e) => updateCustomConfig('colors', { 
                            ...customConfig.colors, 
                            accent: e.target.value 
                          })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
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