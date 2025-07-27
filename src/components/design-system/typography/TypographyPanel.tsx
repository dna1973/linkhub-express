import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Settings, 
  Sparkles,
  RotateCcw,
  Copy,
  Save
} from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import { FontSelector } from './FontSelector';
import { TextStyleControls } from './TextStyleControls';
import { TextEffects } from './TextEffects';
import type { TextStyle } from '@/types/design-system';

interface TypographyPanelProps {
  profileId: string;
}

export const TypographyPanel: React.FC<TypographyPanelProps> = ({ profileId }) => {
  const {
    currentTheme,
    deviceMode,
    updateTheme,
    saveTheme
  } = useDesignStore();

  const typography = currentTheme.typography;

  const handleFontFamilyChange = (fontConfig: {
    primary: string;
    fallback: string[];
    weights: number[];
    subsets: string[];
  }) => {
    updateTheme({
      typography: {
        ...typography,
        fontFamily: fontConfig
      }
    });
  };

  const handleTextStyleChange = (textType: keyof typeof typography, updates: Partial<TextStyle>) => {
    updateTheme({
      typography: {
        ...typography,
        [textType]: {
          ...typography[textType],
          ...updates
        }
      }
    });
  };

  const handleTextEffectsChange = (textType: keyof typeof typography, effects: any) => {
    updateTheme({
      typography: {
        ...typography,
        [textType]: {
          ...typography[textType],
          effects
        }
      }
    });
  };

  const resetTypography = () => {
    updateTheme({
      typography: {
        fontFamily: {
          primary: 'Inter',
          fallback: ['system-ui', 'sans-serif'],
          weights: [400, 500, 600, 700],
          subsets: ['latin'],
        },
        heading: {
          fontSize: { mobile: 24, tablet: 28, desktop: 32 },
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: -0.02,
          textTransform: 'none',
          textDecoration: 'none',
          color: '#ffffff',
          effects: {
            shadow: [],
            outline: { width: 0, color: 'transparent' },
            gradient: { colors: [], direction: 0 },
            animation: { type: 'none', duration: 0, delay: 0 },
          },
        },
        body: {
          fontSize: { mobile: 14, tablet: 16, desktop: 16 },
          fontWeight: 400,
          lineHeight: 1.5,
          letterSpacing: 0,
          textTransform: 'none',
          textDecoration: 'none',
          color: '#d1d5db',
          effects: {
            shadow: [],
            outline: { width: 0, color: 'transparent' },
            gradient: { colors: [], direction: 0 },
            animation: { type: 'none', duration: 0, delay: 0 },
          },
        },
        caption: {
          fontSize: { mobile: 12, tablet: 14, desktop: 14 },
          fontWeight: 400,
          lineHeight: 1.4,
          letterSpacing: 0,
          textTransform: 'none',
          textDecoration: 'none',
          color: '#9ca3af',
          effects: {
            shadow: [],
            outline: { width: 0, color: 'transparent' },
            gradient: { colors: [], direction: 0 },
            animation: { type: 'none', duration: 0, delay: 0 },
          },
        },
        button: {
          fontSize: { mobile: 14, tablet: 16, desktop: 16 },
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: 0,
          textTransform: 'none',
          textDecoration: 'none',
          color: '#ffffff',
          effects: {
            shadow: [],
            outline: { width: 0, color: 'transparent' },
            gradient: { colors: [], direction: 0 },
            animation: { type: 'none', duration: 0, delay: 0 },
          },
        },
        customFonts: [],
      }
    });
  };

  const copyTypographyCSS = () => {
    const css = `
/* Typography System */
:root {
  --font-primary: ${typography.fontFamily.primary}, ${typography.fontFamily.fallback.join(', ')};
}

.heading {
  font-family: var(--font-primary);
  font-size: ${typography.heading.fontSize[deviceMode]}px;
  font-weight: ${typography.heading.fontWeight};
  line-height: ${typography.heading.lineHeight};
  letter-spacing: ${typography.heading.letterSpacing}em;
  color: ${typography.heading.color};
  text-transform: ${typography.heading.textTransform};
  text-decoration: ${typography.heading.textDecoration};
}

.body {
  font-family: var(--font-primary);
  font-size: ${typography.body.fontSize[deviceMode]}px;
  font-weight: ${typography.body.fontWeight};
  line-height: ${typography.body.lineHeight};
  letter-spacing: ${typography.body.letterSpacing}em;
  color: ${typography.body.color};
}

.caption {
  font-family: var(--font-primary);
  font-size: ${typography.caption.fontSize[deviceMode]}px;
  font-weight: ${typography.caption.fontWeight};
  line-height: ${typography.caption.lineHeight};
  letter-spacing: ${typography.caption.letterSpacing}em;
  color: ${typography.caption.color};
}

.button-text {
  font-family: var(--font-primary);
  font-size: ${typography.button.fontSize[deviceMode]}px;
  font-weight: ${typography.button.fontWeight};
  line-height: ${typography.button.lineHeight};
  letter-spacing: ${typography.button.letterSpacing}em;
  color: ${typography.button.color};
}
    `.trim();

    navigator.clipboard.writeText(css);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Typography</h3>
          <p className="text-xs text-muted-foreground">
            Configure fonts, text styles, and effects for your design system
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyTypographyCSS}
            className="h-8 px-2"
            title="Copy CSS"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetTypography}
            className="h-8 px-2"
            title="Reset typography"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveTheme}
            className="h-8 px-2"
            title="Save changes"
          >
            <Save className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Typography Configuration */}
      <Tabs defaultValue="fonts" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fonts" className="flex items-center gap-1">
            <Type className="h-4 w-4" />
            Fonts
          </TabsTrigger>
          <TabsTrigger value="styles" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Styles
          </TabsTrigger>
          <TabsTrigger value="effects" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Effects
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {/* Font Selection */}
          <TabsContent value="fonts" className="space-y-4 h-full overflow-y-auto">
            <FontSelector
              selectedFont={typography.fontFamily.primary}
              fallbackFonts={typography.fontFamily.fallback}
              weights={typography.fontFamily.weights}
              onChange={handleFontFamilyChange}
            />
          </TabsContent>

          {/* Text Styles */}
          <TabsContent value="styles" className="space-y-4 h-full overflow-y-auto">
            <Tabs defaultValue="heading" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="heading">Heading</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="caption">Caption</TabsTrigger>
                <TabsTrigger value="button">Button</TabsTrigger>
              </TabsList>

              <TabsContent value="heading">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Heading Style</Label>
                  <TextStyleControls
                    fontSize={typography.heading.fontSize}
                    fontWeight={typography.heading.fontWeight}
                    lineHeight={typography.heading.lineHeight}
                    letterSpacing={typography.heading.letterSpacing}
                    textTransform={typography.heading.textTransform}
                    textDecoration={typography.heading.textDecoration}
                    color={typography.heading.color}
                    deviceMode={deviceMode}
                    onChange={(updates) => handleTextStyleChange('heading', updates)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="body">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Body Text Style</Label>
                  <TextStyleControls
                    fontSize={typography.body.fontSize}
                    fontWeight={typography.body.fontWeight}
                    lineHeight={typography.body.lineHeight}
                    letterSpacing={typography.body.letterSpacing}
                    textTransform={typography.body.textTransform}
                    textDecoration={typography.body.textDecoration}
                    color={typography.body.color}
                    deviceMode={deviceMode}
                    onChange={(updates) => handleTextStyleChange('body', updates)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="caption">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Caption Style</Label>
                  <TextStyleControls
                    fontSize={typography.caption.fontSize}
                    fontWeight={typography.caption.fontWeight}
                    lineHeight={typography.caption.lineHeight}
                    letterSpacing={typography.caption.letterSpacing}
                    textTransform={typography.caption.textTransform}
                    textDecoration={typography.caption.textDecoration}
                    color={typography.caption.color}
                    deviceMode={deviceMode}
                    onChange={(updates) => handleTextStyleChange('caption', updates)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="button">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Button Text Style</Label>
                  <TextStyleControls
                    fontSize={typography.button.fontSize}
                    fontWeight={typography.button.fontWeight}
                    lineHeight={typography.button.lineHeight}
                    letterSpacing={typography.button.letterSpacing}
                    textTransform={typography.button.textTransform}
                    textDecoration={typography.button.textDecoration}
                    color={typography.button.color}
                    deviceMode={deviceMode}
                    onChange={(updates) => handleTextStyleChange('button', updates)}
                  />
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Text Effects */}
          <TabsContent value="effects" className="space-y-4 h-full overflow-y-auto">
            <Tabs defaultValue="heading" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="heading">Heading</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="caption">Caption</TabsTrigger>
                <TabsTrigger value="button">Button</TabsTrigger>
              </TabsList>

              <TabsContent value="heading">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Heading Effects</Label>
                  <TextEffects
                    shadows={typography.heading.effects.shadow}
                    outline={typography.heading.effects.outline}
                    gradient={typography.heading.effects.gradient}
                    onChange={(effects) => handleTextEffectsChange('heading', effects)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="body">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Body Text Effects</Label>
                  <TextEffects
                    shadows={typography.body.effects.shadow}
                    outline={typography.body.effects.outline}
                    gradient={typography.body.effects.gradient}
                    onChange={(effects) => handleTextEffectsChange('body', effects)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="caption">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Caption Effects</Label>
                  <TextEffects
                    shadows={typography.caption.effects.shadow}
                    outline={typography.caption.effects.outline}
                    gradient={typography.caption.effects.gradient}
                    onChange={(effects) => handleTextEffectsChange('caption', effects)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="button">
                <Card className="p-4">
                  <Label className="text-sm font-medium mb-4 block">Button Text Effects</Label>
                  <TextEffects
                    shadows={typography.button.effects.shadow}
                    outline={typography.button.effects.outline}
                    gradient={typography.button.effects.gradient}
                    onChange={(effects) => handleTextEffectsChange('button', effects)}
                  />
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </div>
      </Tabs>

      <Separator />

      {/* Typography Preview */}
      <Card className="p-4 flex-shrink-0">
        <Label className="text-sm font-medium mb-3 block">Typography Preview</Label>
        <div className="space-y-4" style={{ fontFamily: typography.fontFamily.primary }}>
          <div 
            style={{
              fontSize: `${typography.heading.fontSize[deviceMode]}px`,
              fontWeight: typography.heading.fontWeight,
              lineHeight: typography.heading.lineHeight,
              letterSpacing: `${typography.heading.letterSpacing}em`,
              color: typography.heading.color,
              textTransform: typography.heading.textTransform as any,
              textDecoration: typography.heading.textDecoration,
            }}
          >
            This is a heading example
          </div>
          
          <div 
            style={{
              fontSize: `${typography.body.fontSize[deviceMode]}px`,
              fontWeight: typography.body.fontWeight,
              lineHeight: typography.body.lineHeight,
              letterSpacing: `${typography.body.letterSpacing}em`,
              color: typography.body.color,
            }}
          >
            This is body text that shows how your content will look with the current typography settings. It demonstrates line height, letter spacing, and overall readability.
          </div>
          
          <div 
            style={{
              fontSize: `${typography.caption.fontSize[deviceMode]}px`,
              fontWeight: typography.caption.fontWeight,
              lineHeight: typography.caption.lineHeight,
              letterSpacing: `${typography.caption.letterSpacing}em`,
              color: typography.caption.color,
            }}
          >
            This is caption text for smaller details
          </div>
          
          <Button 
            style={{
              fontSize: `${typography.button.fontSize[deviceMode]}px`,
              fontWeight: typography.button.fontWeight,
              lineHeight: typography.button.lineHeight,
              letterSpacing: `${typography.button.letterSpacing}em`,
              textTransform: typography.button.textTransform as any,
            }}
          >
            Button Text Example
          </Button>
        </div>
      </Card>
    </div>
  );
};
