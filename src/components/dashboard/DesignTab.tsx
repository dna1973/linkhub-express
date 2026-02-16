import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Save, Type, Zap, Image } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDesignStore, ThemeConfig } from '@/stores/useDesignStore';

interface DesignTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

const PREDEFINED_THEMES = [
  {
    id: 'pebble-blue',
    name: 'Pebble Blue',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'medium' },
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
      font: { family: 'playfair', size: 'lg', weight: 'bold' },
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
      font: { family: 'montserrat', size: 'md', weight: 'medium' },
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
      font: { family: 'roboto-mono', size: 'md', weight: 'normal' },
      colors: { primary: '#10b981', secondary: '#6ee7b7', accent: '#34d399', text: '#ffffff' },
    },
  },
  {
    id: 'purple-rain',
    name: 'Purple Rain',
    preview: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#7c3aed', '#c026d3'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#ffffff', secondary: '#e9d5ff', accent: '#d946ef', text: '#ffffff' },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0f172a', '#1e293b'] },
      buttonStyle: { type: 'glass', color: '#3b82f6', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'normal' },
      colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#06b6d4', text: '#ffffff' },
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#fbbf24', '#f59e0b'] },
      buttonStyle: { type: 'modern', color: '#92400e', borderRadius: 'full' },
      font: { family: 'lora', size: 'md', weight: 'medium' },
      colors: { primary: '#92400e', secondary: '#fcd34d', accent: '#d97706', text: '#92400e' },
    },
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    preview: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0c0c0c', '#1a1a1a'] },
      buttonStyle: { type: 'outline', color: '#00ff88', borderRadius: 'none' },
      font: { family: 'source-code-pro', size: 'md', weight: 'bold' },
      colors: { primary: '#00ff88', secondary: '#00ccff', accent: '#ff0066', text: '#ffffff' },
    },
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    preview: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
    config: {
      background: { type: 'gradient', colors: ['#ff6b6b', '#4ecdc4'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
      font: { family: 'poppins', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#ffe0e0', accent: '#45b7aa', text: '#ffffff' },
    },
  },
  {
    id: 'arctic-ice',
    name: 'Arctic Ice',
    preview: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
    config: {
      background: { type: 'gradient', colors: ['#e0f2fe', '#b3e5fc'] },
      buttonStyle: { type: 'modern', color: '#0277bd', borderRadius: 'lg' },
      font: { family: 'system', size: 'md', weight: 'medium' },
      colors: { primary: '#0277bd', secondary: '#4fc3f7', accent: '#29b6f6', text: '#01579b' },
    },
  },
  {
    id: 'volcanic-ash',
    name: 'Volcanic Ash',
    preview: 'linear-gradient(135deg, #424242 0%, #212121 100%)',
    config: {
      background: { type: 'gradient', colors: ['#424242', '#212121'] },
      buttonStyle: { type: 'glass', color: '#ff5722', borderRadius: 'md' },
      font: { family: 'display', size: 'md', weight: 'bold' },
      colors: { primary: '#ff5722', secondary: '#ffab91', accent: '#ff7043', text: '#ffffff' },
    },
  },
  {
    id: 'spring-meadow',
    name: 'Spring Meadow',
    preview: 'linear-gradient(135deg, #8bc34a 0%, #4caf50 100%)',
    config: {
      background: { type: 'gradient', colors: ['#8bc34a', '#4caf50'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'full' },
      font: { family: 'serif', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#c8e6c9', accent: '#66bb6a', text: '#ffffff' },
    },
  },
];

const FONT_FAMILIES = [
  { 
    id: 'inter', 
    name: 'Inter', 
    category: 'Sans-serif',
    preview: 'Aa Bb Cc',
    description: 'Moderna e legível',
    style: 'font-sans',
    weight: 'font-normal',
    cssFamily: 'Inter, system-ui, sans-serif'
  },
  { 
    id: 'playfair', 
    name: 'Playfair Display', 
    category: 'Serif',
    preview: 'Aa Bb Cc',
    description: 'Elegante e sofisticada',
    style: 'font-serif',
    weight: 'font-normal',
    cssFamily: 'Playfair Display, serif'
  },
  { 
    id: 'poppins', 
    name: 'Poppins', 
    category: 'Sans-serif',
    preview: 'Aa Bb Cc',
    description: 'Amigável e arredondada',
    style: 'font-sans',
    weight: 'font-medium',
    cssFamily: 'Poppins, sans-serif'
  },
  { 
    id: 'roboto-mono', 
    name: 'Roboto Mono', 
    category: 'Monospace',
    preview: 'Aa Bb Cc',
    description: 'Técnica e precisa',
    style: 'font-mono',
    weight: 'font-normal',
    cssFamily: 'Roboto Mono, monospace'
  },
  { 
    id: 'dancing-script', 
    name: 'Dancing Script', 
    category: 'Handwriting',
    preview: 'Aa Bb Cc',
    description: 'Casual e divertida',
    style: 'font-serif italic',
    weight: 'font-normal',
    cssFamily: 'Dancing Script, cursive'
  },
  { 
    id: 'montserrat', 
    name: 'Montserrat', 
    category: 'Sans-serif',
    preview: 'Aa Bb Cc',
    description: 'Forte e impactante',
    style: 'font-sans',
    weight: 'font-semibold',
    cssFamily: 'Montserrat, sans-serif'
  },
  { 
    id: 'lora', 
    name: 'Lora', 
    category: 'Serif',
    preview: 'Aa Bb Cc',
    description: 'Clássica e confortável',
    style: 'font-serif',
    weight: 'font-normal',
    cssFamily: 'Lora, serif'
  },
  { 
    id: 'source-code-pro', 
    name: 'Source Code Pro', 
    category: 'Monospace',
    preview: 'Aa Bb Cc',
    description: 'Profissional e limpa',
    style: 'font-mono',
    weight: 'font-normal',
    cssFamily: 'Source Code Pro, monospace'
  }
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
  const [selectedTheme, setSelectedTheme] = useState('pebble-blue');
  const [customConfig, setCustomConfig] = useState<ThemeConfig>(customTheme);
  const [loading, setLoading] = useState(false);
  const [activeCustomTab, setActiveCustomTab] = useState<'background' | 'typography' | 'buttons'>('background');

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREDEFINED_THEMES.map((theme) => (
              <Label
                key={theme.id}
                htmlFor={theme.id}
                className="cursor-pointer"
              >
                <Card className={`bg-card/30 border-border/50 hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                  selectedTheme === theme.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header com radio e badge */}
                      <div className="flex items-center justify-between">
                        <RadioGroupItem value={theme.id} id={theme.id} />
                        {selectedTheme === theme.id && (
                          <Badge variant="secondary" className="text-xs">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                      
                      {/* Preview do tema */}
                      <div
                        className="w-full h-11 rounded-lg border-2 border-white/20 shadow-sm"
                        style={{ background: theme.preview }}
                      />
                      
                      {/* Informações do tema */}
                      <div className="text-center">
                        <h4 className="font-medium text-sm">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {theme.config.buttonStyle.type} • {theme.config.background.type}
                        </p>
                      </div>
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
              <CardContent className="pt-0">
                {/* Menu de Navegação */}
                <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg mb-6">
                  <Button
                    variant={activeCustomTab === 'background' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveCustomTab('background')}
                    className="flex-1 h-8 text-xs"
                  >
                    <Image className="h-3 w-3 mr-1" />
                    Fundo
                  </Button>
                  <Button
                    variant={activeCustomTab === 'typography' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveCustomTab('typography')}
                    className="flex-1 h-8 text-xs"
                  >
                    <Type className="h-3 w-3 mr-1" />
                    Tipografia
                  </Button>
                  <Button
                    variant={activeCustomTab === 'buttons' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveCustomTab('buttons')}
                    className="flex-1 h-8 text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Botões
                  </Button>
                </div>

                {/* Conteúdo das Tabs */}
                <div className="space-y-6">
                  {/* Tab: Background */}
                  {activeCustomTab === 'background' && (
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
                  )}

                  {/* Tab: Typography */}
                  {activeCustomTab === 'typography' && (
                    <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Type className="h-4 w-4 mr-2" />
                    Tipografia
                  </h4>
                  
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Família da Fonte</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {FONT_FAMILIES.map((font) => (
                        <div
                          key={font.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            customConfig.font.family === font.id 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border hover:border-primary/50 bg-card/50'
                          }`}
                          onClick={() => updateCustomConfig('font', { family: font.id })}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="text-2xl font-medium"
                                style={{ fontFamily: font.cssFamily }}
                              >
                                {font.preview}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{font.name}</h4>
                                <p className="text-xs text-muted-foreground">{font.category}</p>
                              </div>
                            </div>
                            {customConfig.font.family === font.id && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{font.description}</p>
                        </div>
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
                  )}

                  {/* Tab: Buttons */}
                  {activeCustomTab === 'buttons' && (
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
                    </div>
                  )}
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