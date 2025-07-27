import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone,
  Tablet,
  Monitor,
  Copy,
  Check
} from 'lucide-react';
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

interface ButtonPreviewProps {
  deviceMode: DeviceMode;
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

const BUTTON_VARIANTS = [
  { label: 'Primary', variant: 'default' as const },
  { label: 'Secondary', variant: 'secondary' as const },
  { label: 'Outline', variant: 'outline' as const },
  { label: 'Ghost', variant: 'ghost' as const },
  { label: 'Link', variant: 'link' as const },
];

const BUTTON_SIZES = [
  { label: 'Small', size: 'sm' as const },
  { label: 'Medium', size: 'default' as const },
  { label: 'Large', size: 'lg' as const },
];

export const ButtonPreview: React.FC<ButtonPreviewProps> = ({
  deviceMode,
  borderRadius,
  border,
  shadow,
  padding,
  effects,
  backgroundColor,
  textColor
}) => {
  const [copiedCSS, setCopiedCSS] = React.useState(false);

  const currentRadius = borderRadius[deviceMode];

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

  const getButtonStyle = (includeEffects = true): React.CSSProperties => {
    const style: React.CSSProperties = {
      borderRadius: `${currentRadius}px`,
      padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      backgroundColor,
      color: textColor,
    };

    // Border
    if (border.width > 0) {
      style.border = `${border.width}px ${border.style} ${border.color}`;
    }

    // Shadow
    if (shadow.blur > 0 || shadow.spread !== 0) {
      style.boxShadow = `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
    }

    if (!includeEffects) return style;

    // Glassmorphism
    if (effects.glassmorphism.blur > 0 || effects.glassmorphism.transparency > 0) {
      style.backdropFilter = `blur(${effects.glassmorphism.blur}px)`;
      style.backgroundColor = `rgba(255, 255, 255, ${effects.glassmorphism.transparency / 100})`;
    }

    // Neumorphism
    if (effects.neumorphism.intensity > 0) {
      const shadowOffset = effects.neumorphism.intensity * 2;
      style.backgroundColor = effects.neumorphism.backgroundColor;
      style.boxShadow = `${shadowOffset}px ${shadowOffset}px ${shadowOffset * 2}px rgba(0, 0, 0, 0.1), -${shadowOffset}px -${shadowOffset}px ${shadowOffset * 2}px rgba(255, 255, 255, 0.7)`;
    }

    // Glow
    if (effects.glow.intensity > 0) {
      const existingShadow = style.boxShadow || '';
      const glowShadow = `0 0 ${effects.glow.size}px ${effects.glow.intensity}px ${effects.glow.color}`;
      style.boxShadow = existingShadow ? `${existingShadow}, ${glowShadow}` : glowShadow;
    }

    // Blur
    if (effects.blur.amount > 0) {
      style.filter = `blur(${effects.blur.amount}px)`;
    }

    return style;
  };

  const generateCSS = (): string => {
    const style = getButtonStyle();
    let css = '.custom-button {\n';
    
    Object.entries(style).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += `  ${cssKey}: ${value};\n`;
    });
    
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

  const getPreviewSize = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-md';
      case 'desktop':
        return 'max-w-lg';
    }
  };

  return (
    <div className="space-y-6">
      {/* Device Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">Button Preview</Label>
          <Badge variant="outline" className="flex items-center gap-1">
            {getDeviceIcon()}
            <span className="capitalize">{deviceMode}</span>
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyCSS}
          className="h-8 px-2"
          title="Copy CSS"
        >
          {copiedCSS ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>

      {/* Main Preview */}
      <Card className={`p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${getPreviewSize()}`}>
        <div className="flex flex-col items-center space-y-4">
          <Button
            style={getButtonStyle()}
            className="transition-all duration-200 hover:scale-105"
          >
            Custom Button
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            Radius: {currentRadius}px • Padding: {padding.top}px {padding.right}px {padding.bottom}px {padding.left}px
          </div>
        </div>
      </Card>

      {/* Variant Previews */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Button Variants</Label>
        <div className="grid grid-cols-2 gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button
              key={variant.variant}
              variant={variant.variant}
              style={getButtonStyle(false)}
              className="text-xs"
            >
              {variant.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Size Previews */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Button Sizes</Label>
        <div className="flex flex-col space-y-2">
          {BUTTON_SIZES.map((size) => (
            <Button
              key={size.size}
              size={size.size}
              style={getButtonStyle(false)}
              className="w-fit"
            >
              {size.label} Button
            </Button>
          ))}
        </div>
      </Card>

      {/* Interactive States */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Interactive States</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            style={getButtonStyle()}
            className="opacity-100"
          >
            Normal
          </Button>
          <Button
            style={{
              ...getButtonStyle(),
              transform: 'scale(0.98)',
              opacity: 0.9
            }}
          >
            Hover
          </Button>
          <Button
            style={{
              ...getButtonStyle(),
              transform: 'scale(0.95)',
              opacity: 0.8
            }}
          >
            Active
          </Button>
          <Button
            style={{
              ...getButtonStyle(),
              opacity: 0.5,
              cursor: 'not-allowed'
            }}
            disabled
          >
            Disabled
          </Button>
        </div>
      </Card>

      {/* CSS Output */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Generated CSS</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCSS}
            className="h-6 px-2 text-xs"
          >
            {copiedCSS ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <div className="p-3 bg-muted rounded-lg overflow-x-auto">
          <code className="text-xs font-mono whitespace-pre">
            {generateCSS()}
          </code>
        </div>
      </Card>

      {/* Style Summary */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Style Summary</Label>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Border Radius:</span>
            <span className="ml-2 font-mono">{currentRadius}px</span>
          </div>
          <div>
            <span className="text-muted-foreground">Border:</span>
            <span className="ml-2 font-mono">{border.width}px {border.style}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Shadow Blur:</span>
            <span className="ml-2 font-mono">{shadow.blur}px</span>
          </div>
          <div>
            <span className="text-muted-foreground">Padding:</span>
            <span className="ml-2 font-mono">{padding.top}px {padding.right}px {padding.bottom}px {padding.left}px</span>
          </div>
          {effects.glassmorphism.blur > 0 && (
            <div>
              <span className="text-muted-foreground">Glass Blur:</span>
              <span className="ml-2 font-mono">{effects.glassmorphism.blur}px</span>
            </div>
          )}
          {effects.neumorphism.intensity > 0 && (
            <div>
              <span className="text-muted-foreground">Neuro Intensity:</span>
              <span className="ml-2 font-mono">{effects.neumorphism.intensity}</span>
            </div>
          )}
          {effects.glow.intensity > 0 && (
            <div>
              <span className="text-muted-foreground">Glow:</span>
              <span className="ml-2 font-mono">{effects.glow.intensity}px</span>
            </div>
          )}
          {effects.blur.amount > 0 && (
            <div>
              <span className="text-muted-foreground">Blur:</span>
              <span className="ml-2 font-mono">{effects.blur.amount}px</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
