import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette,
  Settings,
  Sparkles,
  Eye,
  Copy,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { ButtonStyleControls } from './ButtonStyleControls';
import { EffectsControls } from './EffectsControls';
import { ButtonPreview } from './ButtonPreview';
import { ColorPicker } from '../background/ColorPicker';
import { useDesignStore } from '@/stores/designStore';
import type { 
  DeviceMode, 
  ResponsiveValue, 
  BorderConfig, 
  ShadowConfig,
  GlassmorphismConfig,
  NeumorphismConfig,
  GlowConfig,
  BlurConfig
} from '@/types/design-system';

interface ButtonConfig {
  borderRadius: ResponsiveValue<number>;
  border: BorderConfig;
  shadow: ShadowConfig;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  effects: {
    glassmorphism: GlassmorphismConfig;
    neumorphism: NeumorphismConfig;
    glow: GlowConfig;
    blur: BlurConfig;
  };
  backgroundColor: string;
  textColor: string;
}

const DEFAULT_BUTTON_CONFIG: ButtonConfig = {
  borderRadius: { mobile: 8, tablet: 8, desktop: 8 },
  border: {
    width: 1,
    style: 'solid',
    color: '#e2e8f0',
    radius: { mobile: 8, tablet: 8, desktop: 8 },
  },
  shadow: {
    offsetX: 0,
    offsetY: 2,
    blur: 4,
    spread: 0,
    color: 'rgba(0, 0, 0, 0.1)',
    inset: false,
  },
  padding: {
    top: 12,
    right: 16,
    bottom: 12,
    left: 16,
  },
  effects: {
    glassmorphism: {
      blur: 0,
      transparency: 0,
      border: {
        width: 0,
        style: 'solid',
        color: 'transparent',
        radius: { mobile: 0, tablet: 0, desktop: 0 },
      },
      shadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        spread: 0,
        color: 'transparent',
        inset: false,
      },
    },
    neumorphism: {
      intensity: 0,
      lightSource: { x: 0.5, y: 0.5 },
      backgroundColor: '#ffffff',
    },
    glow: {
      color: 'transparent',
      intensity: 0,
      size: 0,
    },
    blur: {
      amount: 0,
      type: 'gaussian',
    },
  },
  backgroundColor: '#3b82f6',
  textColor: '#ffffff',
};

export const ButtonsPanel: React.FC = () => {
  const { deviceMode } = useDesignStore();
  const [activeTab, setActiveTab] = useState<'colors' | 'style' | 'effects' | 'preview'>('colors');
  const [buttonConfig, setButtonConfig] = useState<ButtonConfig>(DEFAULT_BUTTON_CONFIG);
  const [copiedCSS, setCopiedCSS] = useState(false);

  const handleConfigChange = (updates: Partial<ButtonConfig>) => {
    setButtonConfig(prev => ({ ...prev, ...updates }));
  };

  const handleStyleChange = (updates: any) => {
    setButtonConfig(prev => ({ ...prev, ...updates }));
  };

  const handleEffectsChange = (effects: ButtonConfig['effects']) => {
    setButtonConfig(prev => ({ ...prev, effects }));
  };

  const resetConfig = () => {
    setButtonConfig(DEFAULT_BUTTON_CONFIG);
  };

  const saveConfig = () => {
    // Here you would typically save to the design store
    console.log('Saving button config:', buttonConfig);
    // TODO: Implement save to design store
  };

  const generateCSS = (): string => {
    const { borderRadius, border, shadow, padding, effects, backgroundColor, textColor } = buttonConfig;
    const currentRadius = borderRadius[deviceMode];
    
    let css = '.custom-button {\n';
    css += `  background-color: ${backgroundColor};\n`;
    css += `  color: ${textColor};\n`;
    css += `  border-radius: ${currentRadius}px;\n`;
    css += `  padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;\n`;
    
    if (border.width > 0) {
      css += `  border: ${border.width}px ${border.style} ${border.color};\n`;
    }
    
    if (shadow.blur > 0 || shadow.spread !== 0) {
      css += `  box-shadow: ${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color};\n`;
    }
    
    if (effects.glassmorphism.blur > 0 || effects.glassmorphism.transparency > 0) {
      css += `  backdrop-filter: blur(${effects.glassmorphism.blur}px);\n`;
      css += `  background-color: rgba(255, 255, 255, ${effects.glassmorphism.transparency / 100});\n`;
    }
    
    if (effects.neumorphism.intensity > 0) {
      const shadowOffset = effects.neumorphism.intensity * 2;
      css += `  background: ${effects.neumorphism.backgroundColor};\n`;
      css += `  box-shadow: ${shadowOffset}px ${shadowOffset}px ${shadowOffset * 2}px rgba(0, 0, 0, 0.1), -${shadowOffset}px -${shadowOffset}px ${shadowOffset * 2}px rgba(255, 255, 255, 0.7);\n`;
    }
    
    if (effects.glow.intensity > 0) {
      css += `  box-shadow: 0 0 ${effects.glow.size}px ${effects.glow.intensity}px ${effects.glow.color};\n`;
    }
    
    if (effects.blur.amount > 0) {
      css += `  filter: blur(${effects.blur.amount}px);\n`;
    }
    
    css += '}';
    return css;
  };

  const copyCSS = async () => {
    try {
      await navigator.clipboard.writeText(generateCSS());
      setCopiedCSS(true);
      setTimeout(() => setCopiedCSS(false), 2000);
    } catch (err) {
      console.error('Failed to copy CSS:', err);
    }
  };

  const getDeviceIcon = () => {
    switch (deviceMode) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Button Designer</h3>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            {getDeviceIcon()}
            <span className="capitalize">{deviceMode}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCSS}
            className="h-8 px-2"
            title="Copy CSS"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConfig}
            className="h-8 px-2"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveConfig}
            className="h-8 px-2"
            title="Save configuration"
          >
            <Save className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="colors" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Style
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Colors Tab */}
            <TabsContent value="colors" className="mt-0 space-y-6">
              <div>
                <Label className="text-sm font-medium mb-4 block">Button Colors</Label>
                
                <div className="space-y-4">
                  <ColorPicker
                    value={buttonConfig.backgroundColor}
                    onChange={(color) => handleConfigChange({ backgroundColor: color })}
                    label="Background Color"
                  />
                  
                  <ColorPicker
                    value={buttonConfig.textColor}
                    onChange={(color) => handleConfigChange({ textColor: color })}
                    label="Text Color"
                  />
                </div>

                {/* Quick Color Presets */}
                <div className="mt-6">
                  <Label className="text-sm font-medium mb-3 block">Color Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { bg: '#3b82f6', text: '#ffffff', label: 'Primary' },
                      { bg: '#6b7280', text: '#ffffff', label: 'Secondary' },
                      { bg: '#10b981', text: '#ffffff', label: 'Success' },
                      { bg: '#f59e0b', text: '#ffffff', label: 'Warning' },
                      { bg: '#ef4444', text: '#ffffff', label: 'Danger' },
                      { bg: '#8b5cf6', text: '#ffffff', label: 'Purple' },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigChange({ 
                          backgroundColor: preset.bg, 
                          textColor: preset.text 
                        })}
                        className="h-12 flex flex-col items-center gap-1 p-2"
                        style={{ 
                          backgroundColor: preset.bg, 
                          color: preset.text,
                          borderColor: preset.bg
                        }}
                      >
                        <span className="text-xs">{preset.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Color Preview */}
                <Card className="p-4 mt-6">
                  <Label className="text-sm font-medium mb-3 block">Color Preview</Label>
                  <div className="flex justify-center">
                    <Button
                      style={{
                        backgroundColor: buttonConfig.backgroundColor,
                        color: buttonConfig.textColor,
                        borderRadius: `${buttonConfig.borderRadius[deviceMode]}px`,
                      }}
                    >
                      Sample Button
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="mt-0">
              <ButtonStyleControls
                borderRadius={buttonConfig.borderRadius}
                border={buttonConfig.border}
                shadow={buttonConfig.shadow}
                padding={buttonConfig.padding}
                deviceMode={deviceMode}
                onChange={handleStyleChange}
              />
            </TabsContent>

            {/* Effects Tab */}
            <TabsContent value="effects" className="mt-0">
              <EffectsControls
                glassmorphism={buttonConfig.effects.glassmorphism}
                neumorphism={buttonConfig.effects.neumorphism}
                glow={buttonConfig.effects.glow}
                blur={buttonConfig.effects.blur}
                onChange={handleEffectsChange}
              />
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <ButtonPreview
                deviceMode={deviceMode}
                borderRadius={buttonConfig.borderRadius}
                border={buttonConfig.border}
                shadow={buttonConfig.shadow}
                padding={buttonConfig.padding}
                effects={buttonConfig.effects}
                backgroundColor={buttonConfig.backgroundColor}
                textColor={buttonConfig.textColor}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer with CSS Output */}
      {copiedCSS && (
        <div className="p-4 border-t bg-green-50 dark:bg-green-950">
          <div className="flex items-center justify-center text-sm text-green-600 dark:text-green-400">
            <Copy className="h-4 w-4 mr-2" />
            CSS copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
};
