import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Grid3X3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw
} from 'lucide-react';
import type { ResponsiveValue, DeviceMode } from '@/types/design-system';

interface GridConfig {
  columns: ResponsiveValue<number>;
  gap: ResponsiveValue<number>;
  alignment: 'start' | 'center' | 'end' | 'stretch';
  autoFit: boolean;
  minColumnWidth: number;
}

interface GridControlsProps {
  gridConfig: GridConfig;
  deviceMode: DeviceMode;
  onChange: (config: GridConfig) => void;
}

const GRID_PRESETS = [
  { columns: 1, label: '1 Col', description: 'Single column' },
  { columns: 2, label: '2 Col', description: 'Two columns' },
  { columns: 3, label: '3 Col', description: 'Three columns' },
  { columns: 4, label: '4 Col', description: 'Four columns' },
  { columns: 6, label: '6 Col', description: 'Six columns' },
  { columns: 12, label: '12 Col', description: 'Twelve columns' },
];

const ALIGNMENT_OPTIONS = [
  { value: 'start', label: 'Start', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'end', label: 'End', icon: AlignRight },
  { value: 'stretch', label: 'Stretch', icon: AlignJustify },
];

const GAP_PRESETS = [
  { value: 0, label: 'None' },
  { value: 4, label: 'XS' },
  { value: 8, label: 'SM' },
  { value: 16, label: 'MD' },
  { value: 24, label: 'LG' },
  { value: 32, label: 'XL' },
];

export const GridControls: React.FC<GridControlsProps> = ({
  gridConfig,
  deviceMode,
  onChange
}) => {
  const currentColumns = gridConfig.columns[deviceMode];
  const currentGap = gridConfig.gap[deviceMode];

  const handleColumnsChange = (columns: number) => {
    onChange({
      ...gridConfig,
      columns: {
        ...gridConfig.columns,
        [deviceMode]: columns
      }
    });
  };

  const handleGapChange = (gap: number) => {
    onChange({
      ...gridConfig,
      gap: {
        ...gridConfig.gap,
        [deviceMode]: gap
      }
    });
  };

  const handleAlignmentChange = (alignment: GridConfig['alignment']) => {
    onChange({
      ...gridConfig,
      alignment
    });
  };

  const handleAutoFitChange = (autoFit: boolean) => {
    onChange({
      ...gridConfig,
      autoFit
    });
  };

  const handleMinColumnWidthChange = (minColumnWidth: number) => {
    onChange({
      ...gridConfig,
      minColumnWidth
    });
  };

  const resetGrid = () => {
    onChange({
      columns: { mobile: 1, tablet: 2, desktop: 3 },
      gap: { mobile: 16, tablet: 16, desktop: 16 },
      alignment: 'start',
      autoFit: false,
      minColumnWidth: 200,
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

  const generateGridCSS = () => {
    if (gridConfig.autoFit) {
      return `
display: grid;
grid-template-columns: repeat(auto-fit, minmax(${gridConfig.minColumnWidth}px, 1fr));
gap: ${currentGap}px;
align-items: ${gridConfig.alignment};
      `.trim();
    }
    
    return `
display: grid;
grid-template-columns: repeat(${currentColumns}, 1fr);
gap: ${currentGap}px;
align-items: ${gridConfig.alignment};
    `.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">Grid System</Label>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            {getDeviceIcon()}
            <span className="capitalize">{deviceMode}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetGrid}
          className="h-8 px-2"
          title="Reset grid"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Auto-fit Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <Label className="text-sm font-medium">Auto-fit Columns</Label>
          <p className="text-xs text-muted-foreground">
            Automatically fit columns based on minimum width
          </p>
        </div>
        <Switch
          checked={gridConfig.autoFit}
          onCheckedChange={handleAutoFitChange}
        />
      </div>

      {/* Columns Configuration */}
      {!gridConfig.autoFit ? (
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Columns ({currentColumns})
          </Label>
          
          {/* Column Presets */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {GRID_PRESETS.map((preset) => (
              <Button
                key={preset.columns}
                variant={currentColumns === preset.columns ? "default" : "outline"}
                size="sm"
                onClick={() => handleColumnsChange(preset.columns)}
                className="h-12 flex flex-col items-center gap-1 p-2"
                title={preset.description}
              >
                <span className="text-xs font-medium">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.columns}</span>
              </Button>
            ))}
          </div>

          {/* Custom Column Slider */}
          <Slider
            value={[currentColumns]}
            onValueChange={(value) => handleColumnsChange(value[0])}
            min={1}
            max={12}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 column</span>
            <span>12 columns</span>
          </div>
        </div>
      ) : (
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Minimum Column Width ({gridConfig.minColumnWidth}px)
          </Label>
          <Slider
            value={[gridConfig.minColumnWidth]}
            onValueChange={(value) => handleMinColumnWidthChange(value[0])}
            min={100}
            max={500}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>100px</span>
            <span>500px</span>
          </div>
        </div>
      )}

      {/* Gap Configuration */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Gap ({currentGap}px)
        </Label>
        
        {/* Gap Presets */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {GAP_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant={currentGap === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleGapChange(preset.value)}
              className="h-10 flex flex-col items-center gap-1 p-2"
            >
              <span className="text-xs">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.value}px</span>
            </Button>
          ))}
        </div>

        {/* Custom Gap Slider */}
        <Slider
          value={[currentGap]}
          onValueChange={(value) => handleGapChange(value[0])}
          min={0}
          max={64}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0px</span>
          <span>64px</span>
        </div>
      </div>

      {/* Alignment Configuration */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Grid Alignment</Label>
        <div className="grid grid-cols-2 gap-2">
          {ALIGNMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={gridConfig.alignment === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleAlignmentChange(option.value as GridConfig['alignment'])}
                className="h-12 flex flex-col items-center gap-1 p-2"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Grid Preview */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Grid Preview</Label>
        <div 
          className="border rounded-lg p-4 bg-muted/20"
          style={{
            display: 'grid',
            gridTemplateColumns: gridConfig.autoFit 
              ? `repeat(auto-fit, minmax(${Math.min(gridConfig.minColumnWidth, 80)}px, 1fr))`
              : `repeat(${Math.min(currentColumns, 6)}, 1fr)`,
            gap: `${Math.min(currentGap, 16)}px`,
            alignItems: gridConfig.alignment
          }}
        >
          {Array.from({ length: gridConfig.autoFit ? 8 : Math.min(currentColumns, 6) }).map((_, index) => (
            <div
              key={index}
              className="bg-primary/10 border border-primary/20 rounded p-2 flex items-center justify-center min-h-[40px]"
            >
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div>
            Columns: {gridConfig.autoFit ? `Auto-fit (min: ${gridConfig.minColumnWidth}px)` : currentColumns}
          </div>
          <div>Gap: {currentGap}px</div>
          <div>Alignment: {gridConfig.alignment}</div>
        </div>
      </Card>

      {/* CSS Output */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-2 block">Generated CSS</Label>
        <div className="p-3 bg-muted rounded-lg">
          <code className="text-xs font-mono whitespace-pre-wrap">
            {generateGridCSS()}
          </code>
        </div>
      </Card>

      {/* Responsive Breakpoints Info */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Responsive Configuration</Label>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              <span>Mobile</span>
            </div>
            <span className="text-muted-foreground">
              {gridConfig.columns.mobile} cols, {gridConfig.gap.mobile}px gap
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tablet className="h-3 w-3" />
              <span>Tablet</span>
            </div>
            <span className="text-muted-foreground">
              {gridConfig.columns.tablet} cols, {gridConfig.gap.tablet}px gap
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span>Desktop</span>
            </div>
            <span className="text-muted-foreground">
              {gridConfig.columns.desktop} cols, {gridConfig.gap.desktop}px gap
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
