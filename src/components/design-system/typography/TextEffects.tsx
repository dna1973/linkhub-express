import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Droplets, 
  Zap, 
  Eye, 
  EyeOff,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';
import { ColorPicker } from '../background/ColorPicker';
import type { TextShadow, TextOutline, TextGradient } from '@/types/design-system';

interface TextEffectsProps {
  shadows: TextShadow[];
  outline: TextOutline;
  gradient: TextGradient;
  onChange: (effects: {
    shadow: TextShadow[];
    outline: TextOutline;
    gradient: TextGradient;
  }) => void;
}

export const TextEffects: React.FC<TextEffectsProps> = ({
  shadows,
  outline,
  gradient,
  onChange
}) => {
  const [activeEffect, setActiveEffect] = useState<'shadow' | 'outline' | 'gradient'>('shadow');
  const [selectedShadowIndex, setSelectedShadowIndex] = useState(0);

  const handleShadowChange = (index: number, field: keyof TextShadow, value: any) => {
    const newShadows = [...shadows];
    newShadows[index] = { ...newShadows[index], [field]: value };
    onChange({ shadow: newShadows, outline, gradient });
  };

  const addShadow = () => {
    const newShadow: TextShadow = {
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: '#000000'
    };
    const newShadows = [...shadows, newShadow];
    onChange({ shadow: newShadows, outline, gradient });
    setSelectedShadowIndex(newShadows.length - 1);
  };

  const removeShadow = (index: number) => {
    if (shadows.length <= 1) return;
    const newShadows = shadows.filter((_, i) => i !== index);
    onChange({ shadow: newShadows, outline, gradient });
    setSelectedShadowIndex(Math.max(0, Math.min(selectedShadowIndex, newShadows.length - 1)));
  };

  const handleOutlineChange = (field: keyof TextOutline, value: any) => {
    const newOutline = { ...outline, [field]: value };
    onChange({ shadow: shadows, outline: newOutline, gradient });
  };

  const handleGradientChange = (field: keyof TextGradient, value: any) => {
    const newGradient = { ...gradient, [field]: value };
    onChange({ shadow: shadows, outline, gradient: newGradient });
  };

  const addGradientColor = () => {
    const newColors = [...gradient.colors, '#ffffff'];
    handleGradientChange('colors', newColors);
  };

  const removeGradientColor = (index: number) => {
    if (gradient.colors.length <= 2) return;
    const newColors = gradient.colors.filter((_, i) => i !== index);
    handleGradientChange('colors', newColors);
  };

  const updateGradientColor = (index: number, color: string) => {
    const newColors = [...gradient.colors];
    newColors[index] = color;
    handleGradientChange('colors', newColors);
  };

  const resetEffects = () => {
    onChange({
      shadow: [],
      outline: { width: 0, color: 'transparent' },
      gradient: { colors: [], direction: 0 }
    });
  };

  const generateTextShadowCSS = () => {
    return shadows
      .map(shadow => `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`)
      .join(', ');
  };

  const generateGradientCSS = () => {
    if (gradient.colors.length < 2) return '';
    const colorStops = gradient.colors.join(', ');
    return `linear-gradient(${gradient.direction}deg, ${colorStops})`;
  };

  const previewStyle = {
    textShadow: shadows.length > 0 ? generateTextShadowCSS() : 'none',
    WebkitTextStroke: outline.width > 0 ? `${outline.width}px ${outline.color}` : 'none',
    background: gradient.colors.length >= 2 ? generateGradientCSS() : 'transparent',
    WebkitBackgroundClip: gradient.colors.length >= 2 ? 'text' : 'initial',
    WebkitTextFillColor: gradient.colors.length >= 2 ? 'transparent' : 'inherit',
    backgroundClip: gradient.colors.length >= 2 ? 'text' : 'initial',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Text Effects</Label>
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

      {/* Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-2 block">Preview</Label>
        <div 
          className="text-4xl font-bold p-4 bg-muted rounded-lg text-center"
          style={previewStyle}
        >
          Sample Text
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          Effects preview with current settings
        </div>
      </Card>

      {/* Effects Tabs */}
      <Tabs value={activeEffect} onValueChange={(value) => setActiveEffect(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shadow" className="flex items-center gap-1">
            <Droplets className="h-4 w-4" />
            Shadow
          </TabsTrigger>
          <TabsTrigger value="outline" className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            Outline
          </TabsTrigger>
          <TabsTrigger value="gradient" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Gradient
          </TabsTrigger>
        </TabsList>

        {/* Text Shadow */}
        <TabsContent value="shadow" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Text Shadows</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addShadow}
              className="h-8 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Shadow
            </Button>
          </div>

          {shadows.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No shadows added yet</p>
              <Button variant="outline" size="sm" onClick={addShadow} className="mt-2">
                Add First Shadow
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {shadows.map((shadow, index) => (
                <Card key={index} className={`p-3 ${selectedShadowIndex === index ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Shadow {index + 1}</Label>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedShadowIndex(index)}
                        className="h-6 px-2 text-xs"
                      >
                        Edit
                      </Button>
                      {shadows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShadow(index)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          X Offset ({shadow.offsetX}px)
                        </Label>
                        <Slider
                          value={[shadow.offsetX]}
                          onValueChange={(value) => handleShadowChange(index, 'offsetX', value[0])}
                          min={-20}
                          max={20}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Y Offset ({shadow.offsetY}px)
                        </Label>
                        <Slider
                          value={[shadow.offsetY]}
                          onValueChange={(value) => handleShadowChange(index, 'offsetY', value[0])}
                          min={-20}
                          max={20}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Blur ({shadow.blur}px)
                      </Label>
                      <Slider
                        value={[shadow.blur]}
                        onValueChange={(value) => handleShadowChange(index, 'blur', value[0])}
                        min={0}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <ColorPicker
                      value={shadow.color}
                      onChange={(color) => handleShadowChange(index, 'color', color)}
                      label="Shadow Color"
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {shadows.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-xs font-mono break-all">
                  text-shadow: {generateTextShadowCSS()};
                </code>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Text Outline */}
        <TabsContent value="outline" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Text Outline</Label>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Width ({outline.width}px)
                </Label>
                <Slider
                  value={[outline.width]}
                  onValueChange={(value) => handleOutlineChange('width', value[0])}
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <ColorPicker
                value={outline.color}
                onChange={(color) => handleOutlineChange('color', color)}
                label="Outline Color"
              />
            </div>

            {outline.width > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs font-mono break-all">
                    -webkit-text-stroke: {outline.width}px {outline.color};
                  </code>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Text Gradient */}
        <TabsContent value="gradient" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Text Gradient</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addGradientColor}
              className="h-8 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Color
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Direction ({gradient.direction}°)
            </Label>
            <Slider
              value={[gradient.direction]}
              onValueChange={(value) => handleGradientChange('direction', value[0])}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Colors</Label>
            {gradient.colors.map((color, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <ColorPicker
                    value={color}
                    onChange={(newColor) => updateGradientColor(index, newColor)}
                    label={`Color ${index + 1}`}
                  />
                </div>
                {gradient.colors.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGradientColor(index)}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {gradient.colors.length >= 2 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">CSS Output</Label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-xs font-mono break-all">
                  background: {generateGradientCSS()};<br/>
                  -webkit-background-clip: text;<br/>
                  -webkit-text-fill-color: transparent;
                </code>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
