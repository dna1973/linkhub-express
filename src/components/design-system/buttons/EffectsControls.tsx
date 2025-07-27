import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Layers, 
  Sun, 
  Zap,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { ColorPicker } from '../background/ColorPicker';
import type { GlassmorphismConfig, NeumorphismConfig, GlowConfig, BlurConfig } from '@/types/design-system';

interface EffectsControlsProps {
  glassmorphism: GlassmorphismConfig;
  neumorphism: NeumorphismConfig;
  glow: GlowConfig;
  blur: BlurConfig;
  onChange: (effects: {
    glassmorphism: GlassmorphismConfig;
    neumorphism: NeumorphismConfig;
    glow: GlowConfig;
    blur: BlurConfig;
  }) => void;
}

const BLUR_TYPES = [
  { value: 'gaussian', label: 'Gaussian' },
  { value: 'motion', label: 'Motion' },
  { value: 'radial', label: 'Radial' },
];

export const EffectsControls: React.FC<EffectsControlsProps> = ({
  glassmorphism,
  neumorphism,
  glow,
  blur,
  onChange
}) => {
  const [activeEffect, setActiveEffect] = useState<'glassmorphism' | 'neumorphism' | 'glow' | 'blur'>('glassmorphism');
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const handleGlassmorphismChange = (field: keyof GlassmorphismConfig, value: any) => {
    const newGlassmorphism = { ...glassmorphism, [field]: value };
    onChange({ glassmorphism: newGlassmorphism, neumorphism, glow, blur });
  };

  const handleNeumorphismChange = (field: keyof NeumorphismConfig, value: any) => {
    const newNeumorphism = { ...neumorphism, [field]: value };
    onChange({ glassmorphism, neumorphism: newNeumorphism, glow, blur });
  };

  const handleGlowChange = (field: keyof GlowConfig, value: any) => {
    const newGlow = { ...glow, [field]: value };
    onChange({ glassmorphism, neumorphism, glow: newGlow, blur });
  };

  const handleBlurChange = (field: keyof BlurConfig, value: any) => {
    const newBlur = { ...blur, [field]: value };
    onChange({ glassmorphism, neumorphism, glow, blur: newBlur });
  };

  const resetEffects = () => {
    onChange({
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
    });
  };

  const generateGlassmorphismCSS = () => {
    if (glassmorphism.blur === 0 && glassmorphism.transparency === 0) return '';
    
    return `
backdrop-filter: blur(${glassmorphism.blur}px);
background: rgba(255, 255, 255, ${glassmorphism.transparency / 100});
border: ${glassmorphism.border.width}px ${glassmorphism.border.style} ${glassmorphism.border.color};
box-shadow: ${glassmorphism.shadow.offsetX}px ${glassmorphism.shadow.offsetY}px ${glassmorphism.shadow.blur}px ${glassmorphism.shadow.spread}px ${glassmorphism.shadow.color};
    `.trim();
  };

  const generateNeumorphismCSS = () => {
    if (neumorphism.intensity === 0) return '';
    
    const lightAngle = Math.atan2(neumorphism.lightSource.y - 0.5, neumorphism.lightSource.x - 0.5) * 180 / Math.PI;
    const shadowOffset = neumorphism.intensity * 2;
    
    return `
background: ${neumorphism.backgroundColor};
box-shadow: 
  ${shadowOffset}px ${shadowOffset}px ${shadowOffset * 2}px rgba(0, 0, 0, 0.1),
  -${shadowOffset}px -${shadowOffset}px ${shadowOffset * 2}px rgba(255, 255, 255, 0.7);
    `.trim();
  };

  const generateGlowCSS = () => {
    if (glow.intensity === 0) return '';
    
    return `
box-shadow: 0 0 ${glow.size}px ${glow.intensity}px ${glow.color};
    `.trim();
  };

  const getPreviewStyle = () => {
    const style: React.CSSProperties = {};

    if (activeEffect === 'glassmorphism' && (glassmorphism.blur > 0 || glassmorphism.transparency > 0)) {
      style.backdropFilter = `blur(${glassmorphism.blur}px)`;
      style.background = `rgba(255, 255, 255, ${glassmorphism.transparency / 100})`;
      if (glassmorphism.border.width > 0) {
        style.border = `${glassmorphism.border.width}px ${glassmorphism.border.style} ${glassmorphism.border.color}`;
      }
    }

    if (activeEffect === 'neumorphism' && neumorphism.intensity > 0) {
      const shadowOffset = neumorphism.intensity * 2;
      style.background = neumorphism.backgroundColor;
      style.boxShadow = `${shadowOffset}px ${shadowOffset}px ${shadowOffset * 2}px rgba(0, 0, 0, 0.1), -${shadowOffset}px -${shadowOffset}px ${shadowOffset * 2}px rgba(255, 255, 255, 0.7)`;
    }

    if (activeEffect === 'glow' && glow.intensity > 0) {
      style.boxShadow = `0 0 ${glow.size}px ${glow.intensity}px ${glow.color}`;
    }

    if (activeEffect === 'blur' && blur.amount > 0) {
      style.filter = `blur(${blur.amount}px)`;
    }

    return style;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Visual Effects</Label>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewEnabled(!previewEnabled)}
            className="h-8 px-2"
            title="Toggle preview"
          >
            {previewEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetEffects}
            className="h-8 px-2"
            title="Reset all effects"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Preview */}
      {previewEnabled && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <Label className="text-sm font-medium mb-3 block">Effect Preview</Label>
          <div className="flex justify-center">
            <Button
              className="relative"
              style={getPreviewStyle()}
            >
              Sample Button
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground text-center">
            {activeEffect.charAt(0).toUpperCase() + activeEffect.slice(1)} effect preview
          </div>
        </Card>
      )}

      {/* Effects Tabs */}
      <Tabs value={activeEffect} onValueChange={(value) => setActiveEffect(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="glassmorphism" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            Glass
          </TabsTrigger>
          <TabsTrigger value="neumorphism" className="flex items-center gap-1">
            <Sun className="h-4 w-4" />
            Neuro
          </TabsTrigger>
          <TabsTrigger value="glow" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Glow
          </TabsTrigger>
          <TabsTrigger value="blur" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Blur
          </TabsTrigger>
        </TabsList>

        {/* Glassmorphism */}
        <TabsContent value="glassmorphism" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Glassmorphism Effect</Label>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Backdrop Blur ({glassmorphism.blur}px)
                </Label>
                <Slider
                  value={[glassmorphism.blur]}
                  onValueChange={(value) => handleGlassmorphismChange('blur', value[0])}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Transparency ({glassmorphism.transparency}%)
                </Label>
                <Slider
                  value={[glassmorphism.transparency]}
                  onValueChange={(value) => handleGlassmorphismChange('transparency', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Border Width ({glassmorphism.border.width}px)
                </Label>
                <Slider
                  value={[glassmorphism.border.width]}
                  onValueChange={(value) => handleGlassmorphismChange('border', { ...glassmorphism.border, width: value[0] })}
                  min={0}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <ColorPicker
                value={glassmorphism.border.color}
                onChange={(color) => handleGlassmorphismChange('border', { ...glassmorphism.border, color })}
                label="Border Color"
              />
            </div>

            {(glassmorphism.blur > 0 || glassmorphism.transparency > 0) && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono whitespace-pre-wrap">
                    {generateGlassmorphismCSS()}
                  </code>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Neumorphism */}
        <TabsContent value="neumorphism" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Neumorphism Effect</Label>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Intensity ({neumorphism.intensity})
                </Label>
                <Slider
                  value={[neumorphism.intensity]}
                  onValueChange={(value) => handleNeumorphismChange('intensity', value[0])}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              <ColorPicker
                value={neumorphism.backgroundColor}
                onChange={(color) => handleNeumorphismChange('backgroundColor', color)}
                label="Background Color"
              />

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Light Source Position</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      X ({Math.round(neumorphism.lightSource.x * 100)}%)
                    </Label>
                    <Slider
                      value={[neumorphism.lightSource.x]}
                      onValueChange={(value) => handleNeumorphismChange('lightSource', { ...neumorphism.lightSource, x: value[0] })}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Y ({Math.round(neumorphism.lightSource.y * 100)}%)
                    </Label>
                    <Slider
                      value={[neumorphism.lightSource.y]}
                      onValueChange={(value) => handleNeumorphismChange('lightSource', { ...neumorphism.lightSource, y: value[0] })}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {neumorphism.intensity > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono whitespace-pre-wrap">
                    {generateNeumorphismCSS()}
                  </code>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Glow */}
        <TabsContent value="glow" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Glow Effect</Label>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Intensity ({glow.intensity})
                </Label>
                <Slider
                  value={[glow.intensity]}
                  onValueChange={(value) => handleGlowChange('intensity', value[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Size ({glow.size}px)
                </Label>
                <Slider
                  value={[glow.size]}
                  onValueChange={(value) => handleGlowChange('size', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <ColorPicker
                value={glow.color}
                onChange={(color) => handleGlowChange('color', color)}
                label="Glow Color"
              />
            </div>

            {glow.intensity > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono whitespace-pre-wrap">
                    {generateGlowCSS()}
                  </code>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Blur */}
        <TabsContent value="blur" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Blur Effect</Label>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Amount ({blur.amount}px)
                </Label>
                <Slider
                  value={[blur.amount]}
                  onValueChange={(value) => handleBlurChange('amount', value[0])}
                  min={0}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Type</Label>
                <Select 
                  value={blur.type} 
                  onValueChange={(value) => handleBlurChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLUR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {blur.amount > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono">
                    filter: blur({blur.amount}px);
                  </code>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
