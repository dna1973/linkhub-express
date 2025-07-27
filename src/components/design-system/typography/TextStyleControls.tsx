import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { ColorPicker } from '../background/ColorPicker';
import type { ResponsiveValue, DeviceMode } from '@/types/design-system';

interface TextStyleControlsProps {
  fontSize: ResponsiveValue<number>;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: string;
  textDecoration: string;
  color: string;
  textAlign?: ResponsiveValue<string>;
  deviceMode: DeviceMode;
  onChange: (updates: any) => void;
}

const FONT_WEIGHTS = [
  { value: 100, label: '100 - Thin' },
  { value: 200, label: '200 - Extra Light' },
  { value: 300, label: '300 - Light' },
  { value: 400, label: '400 - Regular' },
  { value: 500, label: '500 - Medium' },
  { value: 600, label: '600 - Semi Bold' },
  { value: 700, label: '700 - Bold' },
  { value: 800, label: '800 - Extra Bold' },
  { value: 900, label: '900 - Black' },
];

const TEXT_TRANSFORMS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
];

const TEXT_DECORATIONS = [
  { value: 'none', label: 'None' },
  { value: 'underline', label: 'Underline' },
  { value: 'overline', label: 'Overline' },
  { value: 'line-through', label: 'Line Through' },
];

const ALIGNMENT_OPTIONS = [
  { value: 'left', icon: AlignLeft, label: 'Left' },
  { value: 'center', icon: AlignCenter, label: 'Center' },
  { value: 'right', icon: AlignRight, label: 'Right' },
  { value: 'justify', icon: AlignJustify, label: 'Justify' },
];

export const TextStyleControls: React.FC<TextStyleControlsProps> = ({
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textTransform,
  textDecoration,
  color,
  textAlign,
  deviceMode,
  onChange
}) => {
  const currentFontSize = fontSize[deviceMode];
  const currentTextAlign = textAlign?.[deviceMode] || 'left';

  const handleFontSizeChange = (value: number[]) => {
    onChange({
      fontSize: {
        ...fontSize,
        [deviceMode]: value[0]
      }
    });
  };

  const handleTextAlignChange = (align: string) => {
    onChange({
      textAlign: {
        ...textAlign,
        [deviceMode]: align
      }
    });
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
    <div className="space-y-6">
      {/* Device Mode Indicator */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Text Style Controls</Label>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {getDeviceIcon()}
          <span className="capitalize">{deviceMode}</span>
        </div>
      </div>

      {/* Font Size */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Font Size ({currentFontSize}px)
        </Label>
        <Slider
          value={[currentFontSize]}
          onValueChange={handleFontSizeChange}
          min={8}
          max={120}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>8px</span>
          <span>120px</span>
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Font Weight</Label>
        <Select 
          value={fontWeight.toString()} 
          onValueChange={(value) => onChange({ fontWeight: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHTS.map((weight) => (
              <SelectItem key={weight.value} value={weight.value.toString()}>
                {weight.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line Height */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Line Height ({lineHeight})
        </Label>
        <Slider
          value={[lineHeight]}
          onValueChange={(value) => onChange({ lineHeight: value[0] })}
          min={0.8}
          max={3}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0.8</span>
          <span>3.0</span>
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Letter Spacing ({letterSpacing}em)
        </Label>
        <Slider
          value={[letterSpacing]}
          onValueChange={(value) => onChange({ letterSpacing: value[0] })}
          min={-0.1}
          max={0.5}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>-0.1em</span>
          <span>0.5em</span>
        </div>
      </div>

      {/* Text Color */}
      <ColorPicker
        value={color}
        onChange={(newColor) => onChange({ color: newColor })}
        label="Text Color"
      />

      {/* Text Alignment */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Text Alignment</Label>
        <div className="grid grid-cols-4 gap-1">
          {ALIGNMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={currentTextAlign === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTextAlignChange(option.value)}
                className="h-10"
                title={option.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Text Transform */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Text Transform</Label>
        <Select 
          value={textTransform} 
          onValueChange={(value) => onChange({ textTransform: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_TRANSFORMS.map((transform) => (
              <SelectItem key={transform.value} value={transform.value}>
                {transform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Decoration */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Text Decoration</Label>
        <Select 
          value={textDecoration} 
          onValueChange={(value) => onChange({ textDecoration: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_DECORATIONS.map((decoration) => (
              <SelectItem key={decoration.value} value={decoration.value}>
                {decoration.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Style Buttons */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Quick Styles</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={fontWeight >= 600 ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ fontWeight: fontWeight >= 600 ? 400 : 700 })}
          >
            <Bold className="h-4 w-4 mr-1" />
            Bold
          </Button>
          
          <Button
            variant={textDecoration === 'underline' ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ 
              textDecoration: textDecoration === 'underline' ? 'none' : 'underline' 
            })}
          >
            <Underline className="h-4 w-4 mr-1" />
            Underline
          </Button>
          
          <Button
            variant={textTransform === 'uppercase' ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ 
              textTransform: textTransform === 'uppercase' ? 'none' : 'uppercase' 
            })}
          >
            <Type className="h-4 w-4 mr-1" />
            CAPS
          </Button>
        </div>
      </div>

      {/* Responsive Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-2 block">Preview</Label>
        <div 
          className="p-4 bg-muted rounded-lg"
          style={{
            fontSize: `${currentFontSize}px`,
            fontWeight,
            lineHeight,
            letterSpacing: `${letterSpacing}em`,
            textTransform: textTransform as any,
            textDecoration,
            color,
            textAlign: currentTextAlign as any
          }}
        >
          The quick brown fox jumps over the lazy dog. This is a sample text to preview your typography settings.
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          Current: {currentFontSize}px, {fontWeight}, {lineHeight} line-height
        </div>
      </Card>
    </div>
  );
};
