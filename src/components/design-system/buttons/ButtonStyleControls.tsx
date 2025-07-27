import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Square,
  Circle,
  CornerDownRight,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { ColorPicker } from '../background/ColorPicker';
import type { ResponsiveValue, DeviceMode, BorderConfig, ShadowConfig } from '@/types/design-system';

interface ButtonStyleControlsProps {
  borderRadius: ResponsiveValue<number>;
  border: BorderConfig;
  shadow: ShadowConfig;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  deviceMode: DeviceMode;
  onChange: (updates: any) => void;
}

const BORDER_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'none', label: 'None' },
];

const RADIUS_PRESETS = [
  { value: 0, label: 'None', icon: Square },
  { value: 4, label: 'Small', icon: CornerDownRight },
  { value: 8, label: 'Medium', icon: CornerDownRight },
  { value: 16, label: 'Large', icon: CornerDownRight },
  { value: 9999, label: 'Full', icon: Circle },
];

export const ButtonStyleControls: React.FC<ButtonStyleControlsProps> = ({
  borderRadius,
  border,
  shadow,
  padding,
  deviceMode,
  onChange
}) => {
  const currentRadius = borderRadius[deviceMode];

  const handleRadiusChange = (value: number[]) => {
    onChange({
      borderRadius: {
        ...borderRadius,
        [deviceMode]: value[0]
      }
    });
  };

  const handleRadiusPreset = (value: number) => {
    onChange({
      borderRadius: {
        ...borderRadius,
        [deviceMode]: value
      }
    });
  };

  const handleBorderChange = (field: keyof BorderConfig, value: any) => {
    onChange({
      border: {
        ...border,
        [field]: value
      }
    });
  };

  const handleShadowChange = (field: keyof ShadowConfig, value: any) => {
    onChange({
      shadow: {
        ...shadow,
        [field]: value
      }
    });
  };

  const handlePaddingChange = (side: keyof typeof padding, value: number[]) => {
    onChange({
      padding: {
        ...padding,
        [side]: value[0]
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
        <Label className="text-sm font-medium">Button Style Controls</Label>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {getDeviceIcon()}
          <span className="capitalize">{deviceMode}</span>
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Border Radius ({currentRadius}px)
        </Label>
        
        {/* Radius Presets */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {RADIUS_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.value}
                variant={currentRadius === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleRadiusPreset(preset.value)}
                className="h-12 flex flex-col items-center gap-1 p-2"
                title={preset.label}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{preset.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Custom Radius Slider */}
        <Slider
          value={[currentRadius]}
          onValueChange={handleRadiusChange}
          min={0}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0px</span>
          <span>50px</span>
        </div>
      </div>

      {/* Border */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Border</Label>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Width ({border.width}px)
            </Label>
            <Slider
              value={[border.width]}
              onValueChange={(value) => handleBorderChange('width', value[0])}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Style</Label>
            <Select 
              value={border.style} 
              onValueChange={(value) => handleBorderChange('style', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BORDER_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ColorPicker
            value={border.color}
            onChange={(color) => handleBorderChange('color', color)}
            label="Border Color"
          />
        </div>
      </div>

      {/* Padding */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Padding</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Top ({padding.top}px)
            </Label>
            <Slider
              value={[padding.top]}
              onValueChange={(value) => handlePaddingChange('top', value)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Right ({padding.right}px)
            </Label>
            <Slider
              value={[padding.right]}
              onValueChange={(value) => handlePaddingChange('right', value)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Bottom ({padding.bottom}px)
            </Label>
            <Slider
              value={[padding.bottom]}
              onValueChange={(value) => handlePaddingChange('bottom', value)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Left ({padding.left}px)
            </Label>
            <Slider
              value={[padding.left]}
              onValueChange={(value) => handlePaddingChange('left', value)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Shadow */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Shadow</Label>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                X Offset ({shadow.offsetX}px)
              </Label>
              <Slider
                value={[shadow.offsetX]}
                onValueChange={(value) => handleShadowChange('offsetX', value[0])}
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
                onValueChange={(value) => handleShadowChange('offsetY', value[0])}
                min={-20}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Blur ({shadow.blur}px)
              </Label>
              <Slider
                value={[shadow.blur]}
                onValueChange={(value) => handleShadowChange('blur', value[0])}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Spread ({shadow.spread}px)
              </Label>
              <Slider
                value={[shadow.spread]}
                onValueChange={(value) => handleShadowChange('spread', value[0])}
                min={-20}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <ColorPicker
            value={shadow.color}
            onChange={(color) => handleShadowChange('color', color)}
            label="Shadow Color"
          />
        </div>
      </div>

      {/* Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Style Preview</Label>
        <div className="flex justify-center">
          <Button
            style={{
              borderRadius: `${currentRadius}px`,
              border: border.width > 0 ? `${border.width}px ${border.style} ${border.color}` : 'none',
              padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
              boxShadow: shadow.blur > 0 || shadow.spread !== 0 
                ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`
                : 'none'
            }}
          >
            Sample Button
          </Button>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Radius: {currentRadius}px • Border: {border.width}px • Shadow: {shadow.blur}px blur
        </div>
      </Card>
    </div>
  );
};
