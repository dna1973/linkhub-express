import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Square,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw
} from 'lucide-react';
import type { ResponsiveValue, DeviceMode, SpacingConfig } from '@/types/design-system';

interface SpacingControlsProps {
  margin: ResponsiveValue<SpacingConfig>;
  padding: ResponsiveValue<SpacingConfig>;
  deviceMode: DeviceMode;
  onChange: (updates: {
    margin?: ResponsiveValue<SpacingConfig>;
    padding?: ResponsiveValue<SpacingConfig>;
  }) => void;
}

const SPACING_PRESETS = [
  { value: 0, label: 'None' },
  { value: 4, label: 'XS' },
  { value: 8, label: 'SM' },
  { value: 16, label: 'MD' },
  { value: 24, label: 'LG' },
  { value: 32, label: 'XL' },
  { value: 48, label: '2XL' },
  { value: 64, label: '3XL' },
];

export const SpacingControls: React.FC<SpacingControlsProps> = ({
  margin,
  padding,
  deviceMode,
  onChange
}) => {
  const currentMargin = margin[deviceMode];
  const currentPadding = padding[deviceMode];

  const handleMarginChange = (side: keyof SpacingConfig, value: number) => {
    const newMargin = {
      ...margin,
      [deviceMode]: {
        ...currentMargin,
        [side]: value
      }
    };
    onChange({ margin: newMargin });
  };

  const handlePaddingChange = (side: keyof SpacingConfig, value: number) => {
    const newPadding = {
      ...padding,
      [deviceMode]: {
        ...currentPadding,
        [side]: value
      }
    };
    onChange({ padding: newPadding });
  };

  const handleMarginPreset = (preset: number) => {
    const newMargin = {
      ...margin,
      [deviceMode]: {
        top: preset,
        right: preset,
        bottom: preset,
        left: preset
      }
    };
    onChange({ margin: newMargin });
  };

  const handlePaddingPreset = (preset: number) => {
    const newPadding = {
      ...padding,
      [deviceMode]: {
        top: preset,
        right: preset,
        bottom: preset,
        left: preset
      }
    };
    onChange({ padding: newPadding });
  };

  const resetSpacing = () => {
    const resetConfig = { top: 0, right: 0, bottom: 0, left: 0 };
    onChange({
      margin: { ...margin, [deviceMode]: resetConfig },
      padding: { ...padding, [deviceMode]: resetConfig }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">Spacing Controls</Label>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            {getDeviceIcon()}
            <span className="capitalize">{deviceMode}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSpacing}
          className="h-8 px-2"
          title="Reset spacing"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      <Tabs defaultValue="margin" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="margin">Margin</TabsTrigger>
          <TabsTrigger value="padding">Padding</TabsTrigger>
        </TabsList>

        {/* Margin Controls */}
        <TabsContent value="margin" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Margin Spacing</Label>
            
            {/* Margin Presets */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {SPACING_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarginPreset(preset.value)}
                  className="h-10 flex flex-col items-center gap-1 p-2"
                  title={`${preset.value}px`}
                >
                  <span className="text-xs">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.value}px</span>
                </Button>
              ))}
            </div>

            {/* Individual Margin Controls */}
            <div className="space-y-4">
              {/* Top Margin */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Top ({currentMargin.top}px)
                  </Label>
                </div>
                <Slider
                  value={[currentMargin.top]}
                  onValueChange={(value) => handleMarginChange('top', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Right Margin */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Right ({currentMargin.right}px)
                  </Label>
                </div>
                <Slider
                  value={[currentMargin.right]}
                  onValueChange={(value) => handleMarginChange('right', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Bottom Margin */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Bottom ({currentMargin.bottom}px)
                  </Label>
                </div>
                <Slider
                  value={[currentMargin.bottom]}
                  onValueChange={(value) => handleMarginChange('bottom', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Left Margin */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Left ({currentMargin.left}px)
                  </Label>
                </div>
                <Slider
                  value={[currentMargin.left]}
                  onValueChange={(value) => handleMarginChange('left', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Margin Preview */}
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">Margin Preview</Label>
            <div 
              className="border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950 flex items-center justify-center"
              style={{
                padding: `${currentMargin.top}px ${currentMargin.right}px ${currentMargin.bottom}px ${currentMargin.left}px`
              }}
            >
              <div className="bg-white dark:bg-gray-800 border rounded p-4 text-center">
                <Square className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Element</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Margin: {currentMargin.top}px {currentMargin.right}px {currentMargin.bottom}px {currentMargin.left}px
            </div>
          </Card>
        </TabsContent>

        {/* Padding Controls */}
        <TabsContent value="padding" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Padding Spacing</Label>
            
            {/* Padding Presets */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {SPACING_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaddingPreset(preset.value)}
                  className="h-10 flex flex-col items-center gap-1 p-2"
                  title={`${preset.value}px`}
                >
                  <span className="text-xs">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.value}px</span>
                </Button>
              ))}
            </div>

            {/* Individual Padding Controls */}
            <div className="space-y-4">
              {/* Top Padding */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Top ({currentPadding.top}px)
                  </Label>
                </div>
                <Slider
                  value={[currentPadding.top]}
                  onValueChange={(value) => handlePaddingChange('top', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Right Padding */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Right ({currentPadding.right}px)
                  </Label>
                </div>
                <Slider
                  value={[currentPadding.right]}
                  onValueChange={(value) => handlePaddingChange('right', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Bottom Padding */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Bottom ({currentPadding.bottom}px)
                  </Label>
                </div>
                <Slider
                  value={[currentPadding.bottom]}
                  onValueChange={(value) => handlePaddingChange('bottom', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Left Padding */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    Left ({currentPadding.left}px)
                  </Label>
                </div>
                <Slider
                  value={[currentPadding.left]}
                  onValueChange={(value) => handlePaddingChange('left', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Padding Preview */}
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">Padding Preview</Label>
            <div className="border rounded bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <div 
                className="bg-white dark:bg-gray-800 border-2 border-dashed border-green-300 flex items-center justify-center text-center"
                style={{
                  padding: `${currentPadding.top}px ${currentPadding.right}px ${currentPadding.bottom}px ${currentPadding.left}px`
                }}
              >
                <div>
                  <Square className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Content</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Padding: {currentPadding.top}px {currentPadding.right}px {currentPadding.bottom}px {currentPadding.left}px
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Combined Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Combined Spacing Preview</Label>
        <div 
          className="border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950"
          style={{
            margin: `${currentMargin.top}px ${currentMargin.right}px ${currentMargin.bottom}px ${currentMargin.left}px`
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 border-2 border-dashed border-green-300 bg-green-50 dark:bg-green-950 flex items-center justify-center text-center"
            style={{
              padding: `${currentPadding.top}px ${currentPadding.right}px ${currentPadding.bottom}px ${currentPadding.left}px`
            }}
          >
            <div>
              <Square className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Element</span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <div>Margin: {currentMargin.top}px {currentMargin.right}px {currentMargin.bottom}px {currentMargin.left}px</div>
          <div>Padding: {currentPadding.top}px {currentPadding.right}px {currentPadding.bottom}px {currentPadding.left}px</div>
        </div>
      </Card>
    </div>
  );
};
