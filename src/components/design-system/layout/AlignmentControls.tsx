import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw
} from 'lucide-react';
import type { ResponsiveValue, DeviceMode } from '@/types/design-system';

interface AlignmentConfig {
  horizontal: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
  vertical: ResponsiveValue<'top' | 'center' | 'bottom' | 'stretch'>;
  textAlign: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
}

interface AlignmentControlsProps {
  alignmentConfig: AlignmentConfig;
  deviceMode: DeviceMode;
  onChange: (config: AlignmentConfig) => void;
}

const HORIZONTAL_ALIGNMENT = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
];

const VERTICAL_ALIGNMENT = [
  { value: 'top', label: 'Top', icon: AlignStartVertical },
  { value: 'center', label: 'Center', icon: AlignCenterVertical },
  { value: 'bottom', label: 'Bottom', icon: AlignEndVertical },
  { value: 'stretch', label: 'Stretch', icon: AlignJustify },
];

const TEXT_ALIGNMENT = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
];

export const AlignmentControls: React.FC<AlignmentControlsProps> = ({
  alignmentConfig,
  deviceMode,
  onChange
}) => {
  const currentHorizontal = alignmentConfig.horizontal[deviceMode];
  const currentVertical = alignmentConfig.vertical[deviceMode];
  const currentTextAlign = alignmentConfig.textAlign[deviceMode];

  const handleHorizontalChange = (value: AlignmentConfig['horizontal'][DeviceMode]) => {
    onChange({
      ...alignmentConfig,
      horizontal: {
        ...alignmentConfig.horizontal,
        [deviceMode]: value
      }
    });
  };

  const handleVerticalChange = (value: AlignmentConfig['vertical'][DeviceMode]) => {
    onChange({
      ...alignmentConfig,
      vertical: {
        ...alignmentConfig.vertical,
        [deviceMode]: value
      }
    });
  };

  const handleTextAlignChange = (value: AlignmentConfig['textAlign'][DeviceMode]) => {
    onChange({
      ...alignmentConfig,
      textAlign: {
        ...alignmentConfig.textAlign,
        [deviceMode]: value
      }
    });
  };

  const resetAlignment = () => {
    onChange({
      horizontal: { mobile: 'left', tablet: 'left', desktop: 'left' },
      vertical: { mobile: 'top', tablet: 'top', desktop: 'top' },
      textAlign: { mobile: 'left', tablet: 'left', desktop: 'left' },
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

  const generateAlignmentCSS = () => {
    return `
/* Horizontal Alignment */
justify-content: ${currentHorizontal === 'left' ? 'flex-start' : 
                  currentHorizontal === 'right' ? 'flex-end' : 
                  currentHorizontal === 'justify' ? 'space-between' : 'center'};

/* Vertical Alignment */
align-items: ${currentVertical === 'top' ? 'flex-start' : 
               currentVertical === 'bottom' ? 'flex-end' : 
               currentVertical === 'stretch' ? 'stretch' : 'center'};

/* Text Alignment */
text-align: ${currentTextAlign};
    `.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">Alignment Controls</Label>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            {getDeviceIcon()}
            <span className="capitalize">{deviceMode}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAlignment}
          className="h-8 px-2"
          title="Reset alignment"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Horizontal Alignment */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Horizontal Alignment</Label>
        <div className="grid grid-cols-2 gap-2">
          {HORIZONTAL_ALIGNMENT.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={currentHorizontal === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleHorizontalChange(option.value as any)}
                className="h-12 flex flex-col items-center gap-1 p-2"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Vertical Alignment */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Vertical Alignment</Label>
        <div className="grid grid-cols-2 gap-2">
          {VERTICAL_ALIGNMENT.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={currentVertical === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleVerticalChange(option.value as any)}
                className="h-12 flex flex-col items-center gap-1 p-2"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Text Alignment</Label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_ALIGNMENT.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={currentTextAlign === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTextAlignChange(option.value as any)}
                className="h-12 flex flex-col items-center gap-1 p-2"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Alignment Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Alignment Preview</Label>
        
        {/* Container Preview */}
        <div 
          className="border-2 border-dashed border-muted-foreground/30 bg-muted/20 h-32 flex relative"
          style={{
            justifyContent: currentHorizontal === 'left' ? 'flex-start' : 
                           currentHorizontal === 'right' ? 'flex-end' : 
                           currentHorizontal === 'justify' ? 'space-between' : 'center',
            alignItems: currentVertical === 'top' ? 'flex-start' : 
                       currentVertical === 'bottom' ? 'flex-end' : 
                       currentVertical === 'stretch' ? 'stretch' : 'center'
          }}
        >
          <div 
            className="bg-primary/20 border border-primary/40 rounded p-3 min-w-[80px]"
            style={{ textAlign: currentTextAlign }}
          >
            <div className="text-xs font-medium">Element</div>
            <div className="text-xs text-muted-foreground mt-1">Sample text</div>
          </div>
          
          {currentHorizontal === 'justify' && (
            <div 
              className="bg-primary/20 border border-primary/40 rounded p-3 min-w-[80px]"
              style={{ textAlign: currentTextAlign }}
            >
              <div className="text-xs font-medium">Element 2</div>
              <div className="text-xs text-muted-foreground mt-1">More text</div>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div>Horizontal: {currentHorizontal}</div>
          <div>Vertical: {currentVertical}</div>
          <div>Text: {currentTextAlign}</div>
        </div>
      </Card>

      {/* CSS Output */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-2 block">Generated CSS</Label>
        <div className="p-3 bg-muted rounded-lg">
          <code className="text-xs font-mono whitespace-pre-wrap">
            {generateAlignmentCSS()}
          </code>
        </div>
      </Card>

      {/* Responsive Configuration */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Responsive Alignment</Label>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              <span>Mobile</span>
            </div>
            <span className="text-muted-foreground">
              H: {alignmentConfig.horizontal.mobile} | V: {alignmentConfig.vertical.mobile} | T: {alignmentConfig.textAlign.mobile}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tablet className="h-3 w-3" />
              <span>Tablet</span>
            </div>
            <span className="text-muted-foreground">
              H: {alignmentConfig.horizontal.tablet} | V: {alignmentConfig.vertical.tablet} | T: {alignmentConfig.textAlign.tablet}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span>Desktop</span>
            </div>
            <span className="text-muted-foreground">
              H: {alignmentConfig.horizontal.desktop} | V: {alignmentConfig.vertical.desktop} | T: {alignmentConfig.textAlign.desktop}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Presets */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({
              horizontal: { ...alignmentConfig.horizontal, [deviceMode]: 'center' },
              vertical: { ...alignmentConfig.vertical, [deviceMode]: 'center' },
              textAlign: { ...alignmentConfig.textAlign, [deviceMode]: 'center' },
            })}
            className="h-10 flex flex-col items-center gap-1 p-2"
          >
            <AlignCenter className="h-3 w-3" />
            <span className="text-xs">Center All</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({
              horizontal: { ...alignmentConfig.horizontal, [deviceMode]: 'left' },
              vertical: { ...alignmentConfig.vertical, [deviceMode]: 'top' },
              textAlign: { ...alignmentConfig.textAlign, [deviceMode]: 'left' },
            })}
            className="h-10 flex flex-col items-center gap-1 p-2"
          >
            <AlignLeft className="h-3 w-3" />
            <span className="text-xs">Top Left</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({
              horizontal: { ...alignmentConfig.horizontal, [deviceMode]: 'right' },
              vertical: { ...alignmentConfig.vertical, [deviceMode]: 'top' },
              textAlign: { ...alignmentConfig.textAlign, [deviceMode]: 'right' },
            })}
            className="h-10 flex flex-col items-center gap-1 p-2"
          >
            <AlignRight className="h-3 w-3" />
            <span className="text-xs">Top Right</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({
              horizontal: { ...alignmentConfig.horizontal, [deviceMode]: 'justify' },
              vertical: { ...alignmentConfig.vertical, [deviceMode]: 'stretch' },
              textAlign: { ...alignmentConfig.textAlign, [deviceMode]: 'justify' },
            })}
            className="h-10 flex flex-col items-center gap-1 p-2"
          >
            <AlignJustify className="h-3 w-3" />
            <span className="text-xs">Justify All</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
