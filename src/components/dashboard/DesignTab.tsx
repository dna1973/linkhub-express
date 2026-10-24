import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Save, Type, Zap, Image, UserCircle, LayoutTemplate, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDesignStore, ThemeConfig } from '@/stores/useDesignStore';
import { PREDEFINED_THEMES } from '@/utils/themes';
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { TemplateMockup } from '@/components/dashboard/TemplateMockup';

interface DesignTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

// PREDEFINED_THEMES imported from @/utils/themes

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
  const [activeCustomTab, setActiveCustomTab] = useState<'background' | 'typography' | 'buttons' | 'avatar'>('background');

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

    // Always save custom config — onboarding templates also use it
    const isPredefined = PREDEFINED_THEMES.some(t => t.id === selectedTheme);
    const themeOptions = {
      themeId: selectedTheme,
      custom: selectedTheme === 'custom' || !isPredefined ? customConfig : (PREDEFINED_THEMES.find(t => t.id === selectedTheme)?.config || null),
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
    setCustomTheme(newConfig);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="templates" className="text-xs sm:text-sm">
            <LayoutTemplate className="h-4 w-4 mr-1.5" />
            Modelos
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
            <Palette className="h-4 w-4 mr-1.5" />
            Personalizado
          </TabsTrigger>
        </TabsList>

        {/* Tab: Personalizado */}
        <TabsContent value="custom" className="mt-4 space-y-4">
          {selectedTheme !== 'custom' && (
            <div className="hidden">
              {/* Auto-activate custom theme when tab is viewed */}
              {(() => { /* will activate on mount */ return null; })()}
            </div>
          )}

              {/* Sub-navigation */}
              <div className="grid grid-cols-4 gap-1 bg-muted/50 p-1 rounded-lg">
                <Button variant={activeCustomTab === 'background' ? 'default' : 'ghost'} size="sm" onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); setActiveCustomTab('background'); }} className="h-8 text-[10px] sm:text-xs px-1 sm:px-2.5 min-w-0">
                  <Image className="h-3 w-3 shrink-0 mr-0.5 sm:mr-1" /> <span className="truncate">Fundo</span>
                </Button>
                <Button variant={activeCustomTab === 'typography' ? 'default' : 'ghost'} size="sm" onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); setActiveCustomTab('typography'); }} className="h-8 text-[10px] sm:text-xs px-1 sm:px-2.5 min-w-0">
                  <Type className="h-3 w-3 shrink-0 mr-0.5 sm:mr-1" /> <span className="truncate">Tipo</span>
                </Button>
                <Button variant={activeCustomTab === 'buttons' ? 'default' : 'ghost'} size="sm" onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); setActiveCustomTab('buttons'); }} className="h-8 text-[10px] sm:text-xs px-1 sm:px-2.5 min-w-0">
                  <Zap className="h-3 w-3 shrink-0 mr-0.5 sm:mr-1" /> <span className="truncate">Botões</span>
                </Button>
                <Button variant={activeCustomTab === 'avatar' ? 'default' : 'ghost'} size="sm" onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); setActiveCustomTab('avatar'); }} className="h-8 text-[10px] sm:text-xs px-1 sm:px-2.5 min-w-0">
                  <UserCircle className="h-3 w-3 shrink-0 mr-0.5 sm:mr-1" /> <span className="truncate">Avatar</span>
                </Button>
              </div>

              <div className="space-y-6">
                {/* Background */}
                {activeCustomTab === 'background' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Tipo de Fundo</Label>
                      <Select value={customConfig.background.type} onValueChange={(value: 'solid' | 'gradient' | 'pattern') => updateCustomConfig('background', { type: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
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
                        <Input type="color" value={customConfig.background.color || '#111827'} onChange={(e) => updateCustomConfig('background', { color: e.target.value })} className="w-12 h-10 p-1 rounded" />
                        <Input type="text" value={customConfig.background.color || '#111827'} onChange={(e) => updateCustomConfig('background', { color: e.target.value })} placeholder="#111827" className="flex-1" />
                      </div>
                    </div>
                    {customConfig.background.type === 'gradient' && (
                      <div>
                        <Label className="text-sm">Segunda Cor (Gradiente)</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input type="color" value={customConfig.background.colors?.[1] || '#1f2937'} onChange={(e) => updateCustomConfig('background', { colors: [customConfig.background.color || '#111827', e.target.value] })} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={customConfig.background.colors?.[1] || '#1f2937'} onChange={(e) => updateCustomConfig('background', { colors: [customConfig.background.color || '#111827', e.target.value] })} placeholder="#1f2937" className="flex-1" />
                        </div>
                      </div>
                    )}
                    {customConfig.background.type === 'pattern' && (
                      <div>
                        <Label className="text-sm">Padrão</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {BACKGROUND_PATTERNS.map((pattern) => (
                            <Button key={pattern.id} variant={customConfig.background.pattern === pattern.id ? "default" : "outline"} className="h-12 text-xs" onClick={() => updateCustomConfig('background', { pattern: pattern.id })}>
                              {pattern.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Typography */}
                {activeCustomTab === 'typography' && (
                  <div className="space-y-4">
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
                                <div className="text-2xl font-medium" style={{ fontFamily: font.cssFamily }}>{font.preview}</div>
                                <div>
                                  <h4 className="font-medium text-sm">{font.name}</h4>
                                  <p className="text-xs text-muted-foreground">{font.category}</p>
                                </div>
                              </div>
                              {customConfig.font.family === font.id && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                            </div>
                            <p className="text-xs text-muted-foreground">{font.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Tamanho</Label>
                        <Select value={customConfig.font.size} onValueChange={(value: 'sm' | 'md' | 'lg') => updateCustomConfig('font', { size: value })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sm">Pequeno</SelectItem>
                            <SelectItem value="md">Médio</SelectItem>
                            <SelectItem value="lg">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Peso</Label>
                        <Select value={customConfig.font.weight} onValueChange={(value: 'light' | 'normal' | 'medium' | 'bold') => updateCustomConfig('font', { weight: value })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Leve</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="bold">Negrito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Cor do Texto</Label>
                      <div className="flex items-center space-x-2">
                        <Input type="color" value={customConfig.colors?.text || '#ffffff'} onChange={(e) => updateCustomConfig('colors', { text: e.target.value })} className="w-12 h-10 p-1 rounded cursor-pointer" />
                        <Input type="text" value={customConfig.colors?.text || '#ffffff'} onChange={(e) => updateCustomConfig('colors', { text: e.target.value })} placeholder="#ffffff" className="flex-1" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Cor aplicada ao nome, bio e textos do perfil</p>
                    </div>
                  </div>
                )}

                {/* Avatar */}
                {activeCustomTab === 'avatar' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Cor da Borda do Avatar</Label>
                      <div className="flex items-center space-x-2">
                        <Input type="color" value={customConfig.colors?.avatarBorder || '#ffffff33'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, avatarBorder: e.target.value })} className="w-12 h-10 p-1 rounded cursor-pointer" />
                        <Input type="text" value={customConfig.colors?.avatarBorder || '#ffffff33'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, avatarBorder: e.target.value })} placeholder="#ffffff" className="flex-1" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Cor do círculo ao redor da foto de perfil</p>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                {activeCustomTab === 'buttons' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Tipo de Botão</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {BUTTON_STYLES.map((style) => (
                          <Button key={style.id} variant={customConfig.buttonStyle.type === style.id ? "default" : "outline"} className="h-12 text-xs" onClick={() => updateCustomConfig('buttonStyle', { type: style.id })}>
                            {style.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Cor do Botão</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input type="color" value={customConfig.buttonStyle.color || '#3b82f6'} onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={customConfig.buttonStyle.color || '#3b82f6'} onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Bordas</Label>
                        <Select value={customConfig.buttonStyle.borderRadius} onValueChange={(value: 'none' | 'sm' | 'md' | 'lg' | 'full') => updateCustomConfig('buttonStyle', { borderRadius: value })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
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
                    <div>
                      <Label className="text-sm">Tamanho do Botão</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                          { id: 'sm', name: 'Pequeno', height: 'h-10' },
                          { id: 'md', name: 'Médio', height: 'h-12' },
                          { id: 'lg', name: 'Grande', height: 'h-14' },
                        ].map((size) => (
                          <Button
                            key={size.id}
                            variant={(customConfig.buttonStyle as any).size === size.id || (!( customConfig.buttonStyle as any).size && size.id === 'md') ? "default" : "outline"}
                            className={`${size.height} text-xs`}
                            onClick={() => updateCustomConfig('buttonStyle', { size: size.id })}
                          >
                            {size.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center">
                        <Palette className="h-4 w-4 mr-2" />
                        Cores do Tema
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Cor Primária</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Input type="color" value={customConfig.colors?.primary || '#3b82f6'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, primary: e.target.value })} className="w-12 h-10 p-1 rounded" />
                            <Input type="text" value={customConfig.colors?.primary || '#3b82f6'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, primary: e.target.value })} className="flex-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Cor de Destaque</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Input type="color" value={customConfig.colors?.accent || '#8b5cf6'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, accent: e.target.value })} className="w-12 h-10 p-1 rounded" />
                            <Input type="text" value={customConfig.colors?.accent || '#8b5cf6'} onChange={(e) => updateCustomConfig('colors', { ...customConfig.colors, accent: e.target.value })} className="flex-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

          <Button onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); handleSaveTheme(); }} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </TabsContent>

        {/* Tab: Modelos */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Escolha um modelo visual para seu perfil. Clique para aplicar.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ONBOARDING_TEMPLATES.map((template) => (
              <TemplateMockup
                key={template.id}
                template={template}
                isSelected={selectedTheme === template.id}
                onClick={() => {
                  setSelectedTheme(template.id);
                  setCurrentTheme(template.id);
                  setCustomTheme(template.config);
                  setCustomConfig(template.config);
                }}
                className="w-full h-[220px] sm:h-[240px]"
              />
            ))}
          </div>

          <Button onClick={handleSaveTheme} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Modelo'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};