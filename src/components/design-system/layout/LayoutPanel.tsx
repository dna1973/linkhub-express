import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Move,
  Grid3X3,
  AlignCenter,
  Eye,
  Copy,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { SpacingControls } from './SpacingControls';
import { GridControls } from './GridControls';
import { AlignmentControls } from './AlignmentControls';
import { useDesignStore } from '@/stores/designStore';
import type { 
  DeviceMode, 
  ResponsiveValue, 
  SpacingConfig
} from '@/types/design-system';

interface LayoutConfig {
  margin: ResponsiveValue<SpacingConfig>;
  padding: ResponsiveValue<SpacingConfig>;
  grid: {
    columns: ResponsiveValue<number>;
    gap: ResponsiveValue<number>;
    alignment: 'start' | 'center' | 'end' | 'stretch';
    autoFit: boolean;
    minColumnWidth: number;
  };
  alignment: {
    horizontal: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
    vertical: ResponsiveValue<'top' | 'center' | 'bottom' | 'stretch'>;
    textAlign: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
  };
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  margin: {
    mobile: { top: 0, right: 0, bottom: 0, left: 0 },
    tablet: { top: 0, right: 0, bottom: 0, left: 0 },
    desktop: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  padding: {
    mobile: { top: 16, right: 16, bottom: 16, left: 16 },
    tablet: { top: 24, right: 24, bottom: 24, left: 24 },
    desktop: { top: 32, right: 32, bottom: 32, left: 32 },
  },
  grid: {
    columns: { mobile: 1, tablet: 2, desktop: 3 },
    gap: { mobile: 16, tablet: 16, desktop: 24 },
    alignment: 'start',
    autoFit: false,
    minColumnWidth: 200,
  },
  alignment: {
    horizontal: { mobile: 'left', tablet: 'left', desktop: 'left' },
    vertical: { mobile: 'top', tablet: 'top', desktop: 'top' },
    textAlign: { mobile: 'left', tablet: 'left', desktop: 'left' },
  },
};

export const LayoutPanel: React.FC = () => {
  const { deviceMode } = useDesignStore();
  const [activeTab, setActiveTab] = useState<'spacing' | 'grid' | 'alignment' | 'preview'>('spacing');
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [copiedCSS, setCopiedCSS] = useState(false);

  const handleSpacingChange = (updates: {
    margin?: ResponsiveValue<SpacingConfig>;
    padding?: ResponsiveValue<SpacingConfig>;
  }) => {
    setLayoutConfig(prev => ({ ...prev, ...updates }));
  };

  const handleGridChange = (gridConfig: LayoutConfig['grid']) => {
    setLayoutConfig(prev => ({ ...prev, grid: gridConfig }));
  };

  const handleAlignmentChange = (alignmentConfig: LayoutConfig['alignment']) => {
    setLayoutConfig(prev => ({ ...prev, alignment: alignmentConfig }));
  };

  const resetConfig = () => {
    setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
  };

  const saveConfig = () => {
    // Here you would typically save to the design store
    console.log('Saving layout config:', layoutConfig);
    // TODO: Implement save to design store
  };

  const generateCSS = (): string => {
    const { margin, padding, grid, alignment } = layoutConfig;
    const currentMargin = margin[deviceMode];
    const currentPadding = padding[deviceMode];
    const currentColumns = grid.columns[deviceMode];
    const currentGap = grid.gap[deviceMode];
    const currentHorizontal = alignment.horizontal[deviceMode];
    const currentVertical = alignment.vertical[deviceMode];
    const currentTextAlign = alignment.textAlign[deviceMode];
    
    let css = '.layout-container {\n';
    
    // Margin
    css += `  margin: ${currentMargin.top}px ${currentMargin.right}px ${currentMargin.bottom}px ${currentMargin.left}px;\n`;
    
    // Padding
    css += `  padding: ${currentPadding.top}px ${currentPadding.right}px ${currentPadding.bottom}px ${currentPadding.left}px;\n`;
    
    // Grid
    css += `  display: grid;\n`;
    if (grid.autoFit) {
      css += `  grid-template-columns: repeat(auto-fit, minmax(${grid.minColumnWidth}px, 1fr));\n`;
    } else {
      css += `  grid-template-columns: repeat(${currentColumns}, 1fr);\n`;
    }
    css += `  gap: ${currentGap}px;\n`;
    css += `  align-items: ${grid.alignment};\n`;
    
    // Alignment
    css += `  justify-content: ${currentHorizontal === 'left' ? 'flex-start' : 
                                currentHorizontal === 'right' ? 'flex-end' : 
                                currentHorizontal === 'justify' ? 'space-between' : 'center'};\n`;
    css += `  text-align: ${currentTextAlign};\n`;
    
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
          <h3 className="text-lg font-semibold">Layout Designer</h3>
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
            <TabsTrigger value="spacing" className="flex items-center gap-1">
              <Move className="h-4 w-4" />
              Spacing
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-1">
              <Grid3X3 className="h-4 w-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="alignment" className="flex items-center gap-1">
              <AlignCenter className="h-4 w-4" />
              Alignment
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Spacing Tab */}
            <TabsContent value="spacing" className="mt-0">
              <SpacingControls
                margin={layoutConfig.margin}
                padding={layoutConfig.padding}
                deviceMode={deviceMode}
                onChange={handleSpacingChange}
              />
            </TabsContent>

            {/* Grid Tab */}
            <TabsContent value="grid" className="mt-0">
              <GridControls
                gridConfig={layoutConfig.grid}
                deviceMode={deviceMode}
                onChange={handleGridChange}
              />
            </TabsContent>

            {/* Alignment Tab */}
            <TabsContent value="alignment" className="mt-0">
              <AlignmentControls
                alignmentConfig={layoutConfig.alignment}
                deviceMode={deviceMode}
                onChange={handleAlignmentChange}
              />
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0 space-y-6">
              <div>
                <Label className="text-sm font-medium mb-4 block">Layout Preview</Label>
                
                {/* Complete Layout Preview */}
                <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                  <div 
                    className="border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950 min-h-[200px]"
                    style={{
                      margin: `${layoutConfig.margin[deviceMode].top}px ${layoutConfig.margin[deviceMode].right}px ${layoutConfig.margin[deviceMode].bottom}px ${layoutConfig.margin[deviceMode].left}px`,
                      padding: `${layoutConfig.padding[deviceMode].top}px ${layoutConfig.padding[deviceMode].right}px ${layoutConfig.padding[deviceMode].bottom}px ${layoutConfig.padding[deviceMode].left}px`,
                      display: 'grid',
                      gridTemplateColumns: layoutConfig.grid.autoFit 
                        ? `repeat(auto-fit, minmax(${Math.min(layoutConfig.grid.minColumnWidth, 120)}px, 1fr))`
                        : `repeat(${Math.min(layoutConfig.grid.columns[deviceMode], 4)}, 1fr)`,
                      gap: `${layoutConfig.grid.gap[deviceMode]}px`,
                      alignItems: layoutConfig.grid.alignment,
                      justifyContent: layoutConfig.alignment.horizontal[deviceMode] === 'left' ? 'flex-start' : 
                                     layoutConfig.alignment.horizontal[deviceMode] === 'right' ? 'flex-end' : 
                                     layoutConfig.alignment.horizontal[deviceMode] === 'justify' ? 'space-between' : 'center',
                      textAlign: layoutConfig.alignment.textAlign[deviceMode]
                    }}
                  >
                    {Array.from({ length: layoutConfig.grid.autoFit ? 6 : Math.min(layoutConfig.grid.columns[deviceMode], 4) }).map((_, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 border rounded-lg p-4 min-h-[80px] flex flex-col items-center justify-center"
                      >
                        <div className="w-8 h-8 bg-primary/20 rounded mb-2"></div>
                        <span className="text-xs font-medium">Item {index + 1}</span>
                        <span className="text-xs text-muted-foreground">Sample content</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Configuration Summary */}
                <Card className="p-4 mt-6">
                  <Label className="text-sm font-medium mb-3 block">Configuration Summary</Label>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-medium mb-2">Spacing</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>Margin: {layoutConfig.margin[deviceMode].top}px {layoutConfig.margin[deviceMode].right}px {layoutConfig.margin[deviceMode].bottom}px {layoutConfig.margin[deviceMode].left}px</div>
                        <div>Padding: {layoutConfig.padding[deviceMode].top}px {layoutConfig.padding[deviceMode].right}px {layoutConfig.padding[deviceMode].bottom}px {layoutConfig.padding[deviceMode].left}px</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-2">Grid</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>Columns: {layoutConfig.grid.autoFit ? `Auto-fit (${layoutConfig.grid.minColumnWidth}px)` : layoutConfig.grid.columns[deviceMode]}</div>
                        <div>Gap: {layoutConfig.grid.gap[deviceMode]}px</div>
                        <div>Alignment: {layoutConfig.grid.alignment}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-2">Alignment</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>Horizontal: {layoutConfig.alignment.horizontal[deviceMode]}</div>
                        <div>Vertical: {layoutConfig.alignment.vertical[deviceMode]}</div>
                        <div>Text: {layoutConfig.alignment.textAlign[deviceMode]}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-2">Device</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>Mode: {deviceMode}</div>
                        <div>Responsive: Yes</div>
                        <div>Breakpoints: 3</div>
                      </div>
                    </div>
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
                          <Copy className="h-3 w-3 mr-1" />
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

                {/* Responsive Breakpoints */}
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-3 block">Responsive Configuration</Label>
                  <div className="space-y-3">
                    {(['mobile', 'tablet', 'desktop'] as DeviceMode[]).map((mode) => (
                      <div key={mode} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {mode === 'mobile' && <Smartphone className="h-4 w-4" />}
                          {mode === 'tablet' && <Tablet className="h-4 w-4" />}
                          {mode === 'desktop' && <Monitor className="h-4 w-4" />}
                          <span className="font-medium capitalize">{mode}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {layoutConfig.grid.columns[mode]} cols • {layoutConfig.grid.gap[mode]}px gap • {layoutConfig.alignment.horizontal[mode]} align
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
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
