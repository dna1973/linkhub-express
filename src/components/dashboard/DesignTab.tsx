import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { createDefaultCustomTheme, DEFAULT_THEME_ID, useDesignStore, ThemeConfig } from '@/stores/useDesignStore';
import { PREDEFINED_THEMES, resolveThemeConfig } from '@/utils/themes';
import { ONBOARDING_TEMPLATES, filterTemplates } from '@/components/dashboard/onboardingTemplates';
import type { TemplateFilter } from '@/components/dashboard/onboardingTemplates';
import { TemplateMockup } from '@/components/dashboard/TemplateMockup';
import { TemplateCategoryChips } from '@/components/dashboard/TemplateCategoryChips';
import { Switch } from '@/components/ui/switch';
import { normalizeHex, resolveButtonColors } from '@/utils/linkButtonStyle';
import {
  FONT_FAMILY_CSS,
  getBackgroundEditorColors,
  withBackgroundPrimaryColor,
  withBackgroundSecondaryColor,
} from '@/utils/profileAppearance';

interface DesignTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

// PREDEFINED_THEMES imported from @/utils/themes

// A família CSS de cada fonte vem de FONT_FAMILY_CSS, a mesma lista do perfil público e da prévia
const FONT_FAMILIES: { id: ThemeConfig['font']['family']; name: string; category: string; preview: string; description: string }[] = [
  { id: 'inter', name: 'Inter', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Moderna e legível' },
  { id: 'playfair', name: 'Playfair Display', category: 'Serif', preview: 'Aa Bb Cc', description: 'Elegante e sofisticada' },
  { id: 'poppins', name: 'Poppins', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Amigável e arredondada' },
  { id: 'roboto-mono', name: 'Roboto Mono', category: 'Monospace', preview: 'Aa Bb Cc', description: 'Técnica e precisa' },
  { id: 'dancing-script', name: 'Dancing Script', category: 'Handwriting', preview: 'Aa Bb Cc', description: 'Casual e divertida' },
  { id: 'montserrat', name: 'Montserrat', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Forte e impactante' },
  { id: 'lora', name: 'Lora', category: 'Serif', preview: 'Aa Bb Cc', description: 'Clássica e confortável' },
  { id: 'source-code-pro', name: 'Source Code Pro', category: 'Monospace', preview: 'Aa Bb Cc', description: 'Profissional e limpa' },
];

const BUTTON_STYLES = [
  { id: 'solid', name: 'Sólido', preview: 'bg-primary text-white' },
  { id: 'outline', name: 'Contorno', preview: 'border-2 border-primary text-primary bg-transparent' },
  { id: 'glass', name: 'Glass', preview: 'bg-white/10 backdrop-blur border border-white/20 text-white' },
  { id: 'modern', name: 'Moderno', preview: 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' },
  { id: 'rounded', name: 'Arredondado', preview: 'bg-primary text-white rounded-full' },
];

const BACKGROUND_PATTERNS: { id: NonNullable<ThemeConfig['background']['pattern']>; name: string; preview: string }[] = [
  { id: 'none', name: 'Nenhum', preview: '' },
  { id: 'dots', name: 'Pontos', preview: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'grid', name: 'Grade', preview: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'waves', name: 'Ondas', preview: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' },
  { id: 'stripes', name: 'Listras', preview: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
];

/** Tema salvo do perfil para iniciar o editor. Sem tema salvo, o padrão (nada vem do perfil anterior). */
function initialDesignOf(profile: any): { themeId: string; config: ThemeConfig } {
  const raw = profile?.theme_options;
  const options = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : null;
  const config = resolveThemeConfig(options);
  if (!config) return { themeId: DEFAULT_THEME_ID, config: createDefaultCustomTheme() };
  return { themeId: options.themeId || 'custom', config };
}

export const DesignTab: React.FC<DesignTabProps> = ({ profile, onProfileUpdate }) => {
  const { toast } = useToast();
  const { setCurrentTheme, setCustomTheme } = useDesignStore();
  // Começa pelo tema salvo deste perfil. O Dashboard remonta a aba ao trocar de perfil (key),
  // e o CurrentProfileContext aplica o tema no store; nada do perfil anterior fica aqui.
  const [initialDesign] = useState(() => initialDesignOf(profile));
  const [selectedTheme, setSelectedTheme] = useState(initialDesign.themeId);
  const [customConfig, setCustomConfig] = useState<ThemeConfig>(initialDesign.config);
  const [loading, setLoading] = useState(false);
  const [activeCustomTab, setActiveCustomTab] = useState<'background' | 'typography' | 'buttons' | 'avatar'>('background');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('todos');

  // Recebe o id por parâmetro para não depender de estado ainda não atualizado.
  // Grava sempre a config que está na tela (modelos e edição manual usam customConfig).
  const handleSaveTheme = async (themeId: string) => {
    if (!profile?.id) return;

    setLoading(true);

    // Grava a cor efetiva do botão em buttonStyle.color, inclusive quando ela vinha da reserva colors.primary
    const custom = {
      ...customConfig,
      buttonStyle: {
        ...customConfig.buttonStyle,
        color: resolveButtonColors(customConfig).bg,
        textColor: normalizeHex(customConfig.buttonStyle?.textColor) ?? 'auto',
      },
    };
    const themeOptions = { themeId, custom };

    const { error } = await supabase
      .from('profiles')
      .update({ theme_options: themeOptions as any })
      .eq('id', profile.id);

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

  const buttonColors = resolveButtonColors(customConfig);
  // As cores do fundo que o editor mostra são as que a página desenha (no gradiente, colors[0] e colors[1])
  const backgroundColors = getBackgroundEditorColors(customConfig.background);
  // Só undefined e 'auto' contam como automático: apagar o campo manual não pode religar o interruptor
  const isAutoButtonText = customConfig.buttonStyle?.textColor === undefined || customConfig.buttonStyle?.textColor === 'auto';
  const manualButtonText = normalizeHex(customConfig.buttonStyle?.textColor) ?? buttonColors.text;

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
                      {/* 'pattern' é valor legado: o fundo é desenhado como sólido, então o seletor mostra "Sólido" */}
                      <Select value={customConfig.background.type === 'gradient' ? 'gradient' : 'solid'} onValueChange={(value: 'solid' | 'gradient') => updateCustomConfig('background', { type: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Sólido</SelectItem>
                          <SelectItem value="gradient">Gradiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Cor Principal</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input type="color" value={backgroundColors.primary} onChange={(e) => updateCustomConfig('background', withBackgroundPrimaryColor(customConfig.background, e.target.value))} className="w-12 h-10 p-1 rounded" />
                        <Input type="text" value={backgroundColors.primary} onChange={(e) => updateCustomConfig('background', withBackgroundPrimaryColor(customConfig.background, e.target.value))} placeholder="#111827" className="flex-1" />
                      </div>
                    </div>
                    {customConfig.background.type === 'gradient' && (
                      <div>
                        <Label className="text-sm">Segunda Cor (Gradiente)</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input type="color" value={backgroundColors.secondary} onChange={(e) => updateCustomConfig('background', withBackgroundSecondaryColor(customConfig.background, e.target.value))} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={backgroundColors.secondary} onChange={(e) => updateCustomConfig('background', withBackgroundSecondaryColor(customConfig.background, e.target.value))} placeholder="#1f2937" className="flex-1" />
                        </div>
                      </div>
                    )}
                    {customConfig.background.type === 'gradient' && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="background-animated" className="text-sm">Animado</Label>
                        <Switch
                          id="background-animated"
                          checked={customConfig.background.animated === true}
                          onCheckedChange={(checked) => updateCustomConfig('background', { animated: checked })}
                        />
                      </div>
                    )}
                    {/* O padrão é uma camada sobre qualquer tipo de fundo */}
                    <div>
                      <Label className="text-sm">Padrão</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {BACKGROUND_PATTERNS.map((pattern) => (
                          <Button key={pattern.id} variant={(customConfig.background.pattern || 'none') === pattern.id ? "default" : "outline"} className="h-12 text-xs" onClick={() => updateCustomConfig('background', { pattern: pattern.id })}>
                            {pattern.name}
                          </Button>
                        ))}
                      </div>
                    </div>
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
                                <div className="text-2xl font-medium" style={{ fontFamily: FONT_FAMILY_CSS[font.id] }}>{font.preview}</div>
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
                    <div>
                      <Label className="text-sm">Formato</Label>
                      {/* avatar pode não existir: o merge de updateCustomConfig cria o bloco */}
                      <Select value={customConfig.avatar?.shape || 'circle'} onValueChange={(value: 'circle' | 'rounded' | 'hexagon') => updateCustomConfig('avatar', { shape: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circle">Círculo</SelectItem>
                          <SelectItem value="rounded">Arredondado</SelectItem>
                          <SelectItem value="hexagon">Hexágono</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">No hexágono, a borda não aparece.</p>
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
                          <Input type="color" value={buttonColors.bg} onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={customConfig.buttonStyle.color ?? buttonColors.bg} onChange={(e) => updateCustomConfig('buttonStyle', { color: e.target.value })} className="flex-1" />
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
                    <div>
                      <Label className="text-sm">Sombra</Label>
                      {/* shadowColor não tem controle: o merge de updateCustomConfig preserva o valor vindo do modelo */}
                      <Select value={customConfig.buttonStyle.shadow || 'none'} onValueChange={(value: 'none' | 'soft' | 'hard' | 'glow') => updateCustomConfig('buttonStyle', { shadow: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="soft">Suave</SelectItem>
                          <SelectItem value="hard">Dura</SelectItem>
                          <SelectItem value="glow">Brilho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="button-text-auto" className="text-sm">Cor do texto do botão</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Automático</span>
                          <Switch
                            id="button-text-auto"
                            checked={isAutoButtonText}
                            onCheckedChange={(checked) =>
                              updateCustomConfig('buttonStyle', { textColor: checked ? 'auto' : buttonColors.text })
                            }
                          />
                        </div>
                      </div>
                      {isAutoButtonText ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Sólido: preto ou branco, o que for mais legível. Contorno: a cor do botão. Demais estilos: a cor do texto da página.
                        </p>
                      ) : (
                        <div className="flex items-center space-x-2 mt-2">
                          <Input type="color" value={manualButtonText} onChange={(e) => updateCustomConfig('buttonStyle', { textColor: e.target.value })} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={customConfig.buttonStyle.textColor ?? ''} onChange={(e) => updateCustomConfig('buttonStyle', { textColor: e.target.value })} className="flex-1" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

          <Button onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); handleSaveTheme('custom'); }} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </TabsContent>

        {/* Tab: Modelos */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Escolha um modelo visual para seu perfil. Clique para aplicar.</p>
          
          <TemplateCategoryChips value={templateFilter} onChange={setTemplateFilter} />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filterTemplates(ONBOARDING_TEMPLATES, templateFilter).map((template) => (
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

          <Button onClick={() => handleSaveTheme(selectedTheme)} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Modelo'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};