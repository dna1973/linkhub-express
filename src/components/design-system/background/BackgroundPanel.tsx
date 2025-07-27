import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Zap, 
  Image as ImageIcon, 
  Video, 
  Grid3X3,
  RotateCcw,
  Copy,
  Save
} from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import { ColorPicker } from './ColorPicker';
import { GradientEditor } from './GradientEditor';
import { MediaUploader } from './MediaUploader';
import { BackgroundPreview } from './BackgroundPreview';
import type { BackgroundConfig, GradientStop, ImageFilters } from '@/types/design-system';

interface BackgroundPanelProps {
  profileId: string;
}

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ profileId }) => {
  const {
    currentTheme,
    deviceMode,
    updateBackgroundConfig,
    saveTheme
  } = useDesignStore();

  const backgroundConfig = currentTheme.background || {
    type: 'solid',
    solid: { color: '#ffffff' }
  };

  const handleBackgroundChange = (updates: Partial<BackgroundConfig>) => {
    const newConfig = { ...backgroundConfig, ...updates };
    updateBackgroundConfig(newConfig);
  };

  const handleSolidColorChange = (color: string) => {
    handleBackgroundChange({
      type: 'solid',
      solid: { color }
    });
  };

  const handleGradientChange = (gradient: {
    type: 'linear' | 'radial' | 'conic';
    colors: GradientStop[];
    direction: number;
    position: { x: number; y: number };
  }) => {
    handleBackgroundChange({
      type: 'gradient',
      gradient
    });
  };

  const handleImageChange = (updates: any) => {
    const currentImage = backgroundConfig.image || {
      url: '',
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
      filters: {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        sepia: 0,
        hueRotate: 0
      }
    };

    handleBackgroundChange({
      type: 'image',
      image: { ...currentImage, ...updates }
    });
  };

  const handleVideoChange = (updates: any) => {
    const currentVideo = backgroundConfig.video || {
      url: '',
      opacity: 100,
      filters: {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        sepia: 0,
        hueRotate: 0
      },
      autoplay: true,
      loop: true,
      muted: true
    };

    handleBackgroundChange({
      type: 'video',
      video: { ...currentVideo, ...updates }
    });
  };

  const resetBackground = () => {
    handleBackgroundChange({
      type: 'solid',
      solid: { color: '#ffffff' }
    });
  };

  const copyBackgroundCSS = () => {
    let css = '';
    
    switch (backgroundConfig.type) {
      case 'solid':
        css = `background-color: ${backgroundConfig.solid?.color || '#ffffff'};`;
        break;
      case 'gradient':
        if (backgroundConfig.gradient) {
          const { type, colors, direction, position } = backgroundConfig.gradient;
          const colorStops = colors
            .sort((a, b) => a.position - b.position)
            .map(stop => `${stop.color} ${stop.position}%`)
            .join(', ');

          switch (type) {
            case 'linear':
              css = `background: linear-gradient(${direction}deg, ${colorStops});`;
              break;
            case 'radial':
              css = `background: radial-gradient(circle at ${position.x}% ${position.y}%, ${colorStops});`;
              break;
            case 'conic':
              css = `background: conic-gradient(from ${direction}deg at ${position.x}% ${position.y}%, ${colorStops});`;
              break;
          }
        }
        break;
      case 'image':
        if (backgroundConfig.image) {
          const { url, position, size, repeat, filters } = backgroundConfig.image;
          css = [
            `background-image: url(${url});`,
            `background-position: ${position};`,
            `background-size: ${size};`,
            `background-repeat: ${repeat};`
          ].join('\n');

          const filterString = [
            `blur(${filters.blur}px)`,
            `brightness(${filters.brightness}%)`,
            `contrast(${filters.contrast}%)`,
            `saturate(${filters.saturate}%)`,
            `sepia(${filters.sepia}%)`,
            `hue-rotate(${filters.hueRotate}deg)`
          ].join(' ');

          if (filterString !== 'blur(0px) brightness(100%) contrast(100%) saturate(100%) sepia(0%) hue-rotate(0deg)') {
            css += `\nfilter: ${filterString};`;
          }
        }
        break;
    }

    navigator.clipboard.writeText(css);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Background</h3>
          <p className="text-xs text-muted-foreground">
            Customize your background with colors, gradients, images, and more
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyBackgroundCSS}
            className="h-8 px-2"
            title="Copy CSS"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetBackground}
            className="h-8 px-2"
            title="Reset background"
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

      {/* Background Type Tabs */}
      <Tabs value={backgroundConfig.type} onValueChange={(value) => handleBackgroundChange({ type: value as any })}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="solid" className="flex flex-col items-center gap-1 p-2">
            <Palette className="h-4 w-4" />
            <span className="text-xs">Solid</span>
          </TabsTrigger>
          <TabsTrigger value="gradient" className="flex flex-col items-center gap-1 p-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs">Gradient</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="flex flex-col items-center gap-1 p-2">
            <ImageIcon className="h-4 w-4" />
            <span className="text-xs">Image</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex flex-col items-center gap-1 p-2">
            <Video className="h-4 w-4" />
            <span className="text-xs">Video</span>
          </TabsTrigger>
          <TabsTrigger value="pattern" className="flex flex-col items-center gap-1 p-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="text-xs">Pattern</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {/* Solid Color */}
          <TabsContent value="solid" className="space-y-4 h-full overflow-y-auto">
            <ColorPicker
              value={backgroundConfig.solid?.color || '#ffffff'}
              onChange={handleSolidColorChange}
              label="Background Color"
            />
          </TabsContent>

          {/* Gradient */}
          <TabsContent value="gradient" className="space-y-4 h-full overflow-y-auto">
            <GradientEditor
              type={backgroundConfig.gradient?.type || 'linear'}
              colors={backgroundConfig.gradient?.colors || [
                { color: '#3b82f6', position: 0 },
                { color: '#8b5cf6', position: 100 }
              ]}
              direction={backgroundConfig.gradient?.direction || 45}
              position={backgroundConfig.gradient?.position || { x: 50, y: 50 }}
              onChange={handleGradientChange}
            />
          </TabsContent>

          {/* Image */}
          <TabsContent value="image" className="space-y-4 h-full overflow-y-auto">
            <MediaUploader
              type="image"
              url={backgroundConfig.image?.url || ''}
              position={backgroundConfig.image?.position || 'center'}
              size={backgroundConfig.image?.size || 'cover'}
              repeat={backgroundConfig.image?.repeat || 'no-repeat'}
              filters={backgroundConfig.image?.filters || {
                blur: 0,
                brightness: 100,
                contrast: 100,
                saturate: 100,
                sepia: 0,
                hueRotate: 0
              }}
              overlay={backgroundConfig.image?.overlay}
              onChange={handleImageChange}
            />
          </TabsContent>

          {/* Video */}
          <TabsContent value="video" className="space-y-4 h-full overflow-y-auto">
            <MediaUploader
              type="video"
              url={backgroundConfig.video?.url || ''}
              position="center"
              size="cover"
              repeat="no-repeat"
              filters={backgroundConfig.video?.filters || {
                blur: 0,
                brightness: 100,
                contrast: 100,
                saturate: 100,
                sepia: 0,
                hueRotate: 0
              }}
              opacity={backgroundConfig.video?.opacity || 100}
              autoplay={backgroundConfig.video?.autoplay || true}
              loop={backgroundConfig.video?.loop || true}
              muted={backgroundConfig.video?.muted || true}
              onChange={handleVideoChange}
            />
          </TabsContent>

          {/* Pattern */}
          <TabsContent value="pattern" className="space-y-4 h-full overflow-y-auto">
            <Card className="p-4">
              <div className="text-center space-y-2">
                <Grid3X3 className="h-8 w-8 mx-auto text-muted-foreground" />
                <h4 className="text-sm font-medium">Pattern Backgrounds</h4>
                <p className="text-xs text-muted-foreground">
                  Pattern backgrounds will be available in a future update.
                </p>
                <p className="text-xs text-muted-foreground">
                  Features: Geometric patterns, textures, custom SVG patterns
                </p>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Separator />

      {/* Live Preview */}
      <BackgroundPreview
        config={backgroundConfig}
        deviceMode={deviceMode}
        className="flex-shrink-0"
      />
    </div>
  );
};
