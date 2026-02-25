import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Save, Type, Zap, Image, UserCircle, LayoutTemplate } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDesignStore, ThemeConfig } from '@/stores/useDesignStore';
import { PREDEFINED_THEMES } from '@/utils/themes';

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
    if (selectedTheme === 'custom') {
      setCustomTheme(newConfig);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="themes" className="text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
            <Palette className="h-4 w-4 mr-1.5" />
            Personalizado
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm">
            <LayoutTemplate className="h-4 w-4 mr-1.5" />
            Modelos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Temas Predefinidos */}
        <TabsContent value="themes" className="mt-4 space-y-4">
          <RadioGroup value={selectedTheme} onValueChange={handleThemeSelect}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PREDEFINED_THEMES.map((theme) => (
                <Label key={theme.id} htmlFor={theme.id} className="cursor-pointer">
                  <Card className={`bg-card/30 border-border/50 hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                    selectedTheme === theme.id ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <RadioGroupItem value={theme.id} id={theme.id} />
                          {selectedTheme === theme.id && (
                            <Badge variant="secondary" className="text-xs">Selecionado</Badge>
                          )}
                        </div>
                        <div
                          className="w-full h-11 rounded-lg border-2 border-white/20 shadow-sm"
                          style={{ background: theme.preview }}
                        />
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

          <Button onClick={handleSaveTheme} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </TabsContent>

        {/* Tab: Personalizado */}
        <TabsContent value="custom" className="mt-4 space-y-4">
          {selectedTheme !== 'custom' && (
            <div className="text-center py-4">
              <Button variant="outline" onClick={() => handleThemeSelect('custom')}>
                <Palette className="h-4 w-4 mr-2" />
                Ativar Tema Personalizado
              </Button>
            </div>
          )}

          {selectedTheme === 'custom' && (
            <>
              {/* Sub-navigation */}
              <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
                <Button variant={activeCustomTab === 'background' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCustomTab('background')} className="flex-1 h-8 text-xs">
                  <Image className="h-3 w-3 mr-1" /> Fundo
                </Button>
                <Button variant={activeCustomTab === 'typography' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCustomTab('typography')} className="flex-1 h-8 text-xs">
                  <Type className="h-3 w-3 mr-1" /> Tipografia
                </Button>
                <Button variant={activeCustomTab === 'buttons' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCustomTab('buttons')} className="flex-1 h-8 text-xs">
                  <Zap className="h-3 w-3 mr-1" /> Botões
                </Button>
                <Button variant={activeCustomTab === 'avatar' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCustomTab('avatar')} className="flex-1 h-8 text-xs">
                  <UserCircle className="h-3 w-3 mr-1" /> Avatar
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
            </>
          )}

          {selectedTheme === 'custom' && (
            <Button onClick={handleSaveTheme} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          )}
        </TabsContent>

        {/* Tab: Modelos */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Escolha um modelo de layout para seu perfil. Cada modelo organiza seus links e informações de forma diferente.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 'classic',
                name: 'Clássico',
                description: 'Avatar centralizado com links em lista vertical',
                preview: (
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
                    <div className="w-16 h-1.5 rounded bg-muted-foreground/20" />
                    <div className="w-12 h-1 rounded bg-muted-foreground/10" />
                    <div className="w-full space-y-1 mt-1">
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'card',
                name: 'Cartão',
                description: 'Perfil em formato de cartão com links agrupados',
                preview: (
                  <div className="p-2">
                    <div className="rounded-lg border border-muted-foreground/10 p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-muted-foreground/20" />
                        <div className="space-y-0.5">
                          <div className="w-12 h-1.5 rounded bg-muted-foreground/20" />
                          <div className="w-8 h-1 rounded bg-muted-foreground/10" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                        <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: 'grid',
                name: 'Grade',
                description: 'Links exibidos em grade com ícones grandes',
                preview: (
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
                    <div className="w-16 h-1.5 rounded bg-muted-foreground/20" />
                    <div className="grid grid-cols-2 gap-1 w-full mt-1">
                      <div className="h-8 rounded bg-muted-foreground/15" />
                      <div className="h-8 rounded bg-muted-foreground/15" />
                      <div className="h-8 rounded bg-muted-foreground/15" />
                      <div className="h-8 rounded bg-muted-foreground/15" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'minimal',
                name: 'Minimalista',
                description: 'Design limpo com foco nos links',
                preview: (
                  <div className="flex flex-col gap-1.5 py-3 px-2">
                    <div className="w-12 h-1.5 rounded bg-muted-foreground/20" />
                    <div className="w-20 h-1 rounded bg-muted-foreground/10" />
                    <div className="space-y-1.5 mt-2">
                      <div className="h-2.5 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-2.5 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-2.5 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-2.5 rounded bg-muted-foreground/15 w-full" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'hero',
                name: 'Hero',
                description: 'Foto grande no topo com bio destacada',
                preview: (
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full h-12 rounded-t bg-muted-foreground/15" />
                    <div className="flex flex-col items-center -mt-3">
                      <div className="w-8 h-8 rounded-full bg-muted-foreground/25 border-2 border-background" />
                      <div className="w-14 h-1.5 rounded bg-muted-foreground/20 mt-1" />
                    </div>
                    <div className="space-y-1 px-2">
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'social',
                name: 'Social',
                description: 'Estilo rede social com destaque para interações',
                preview: (
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <div className="w-10 h-10 rounded-full bg-muted-foreground/20" />
                    <div className="w-16 h-1.5 rounded bg-muted-foreground/20" />
                    <div className="flex gap-2 mt-0.5">
                      <div className="text-center"><div className="w-4 h-1 rounded bg-muted-foreground/20 mx-auto" /><div className="w-6 h-0.5 rounded bg-muted-foreground/10 mt-0.5" /></div>
                      <div className="text-center"><div className="w-4 h-1 rounded bg-muted-foreground/20 mx-auto" /><div className="w-6 h-0.5 rounded bg-muted-foreground/10 mt-0.5" /></div>
                    </div>
                    <div className="space-y-1 w-full mt-1">
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                      <div className="h-3 rounded bg-muted-foreground/15 w-full" />
                    </div>
                  </div>
                ),
              },
            ].map((model) => (
              <Card
                key={model.id}
                className="bg-card/30 border-border/50 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer opacity-80 hover:opacity-100"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="w-full h-28 rounded-lg bg-muted/30 border border-border/30 overflow-hidden flex items-center justify-center">
                    <div className="w-16">{model.preview}</div>
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-sm">{model.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-full justify-center">Em breve</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};