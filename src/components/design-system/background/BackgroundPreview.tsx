import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import type { BackgroundConfig, DeviceMode } from '@/types/design-system';

interface BackgroundPreviewProps {
  config: BackgroundConfig;
  deviceMode: DeviceMode;
  className?: string;
}

export const BackgroundPreview: React.FC<BackgroundPreviewProps> = ({
  config,
  deviceMode,
  className = ''
}) => {
  const generateBackgroundStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};

    switch (config.type) {
      case 'solid':
        if (config.solid) {
          style.backgroundColor = config.solid.color;
        }
        break;

      case 'gradient':
        if (config.gradient) {
          const { type, colors, direction, position } = config.gradient;
          const colorStops = colors
            .sort((a, b) => a.position - b.position)
            .map(stop => `${stop.color} ${stop.position}%`)
            .join(', ');

          switch (type) {
            case 'linear':
              style.background = `linear-gradient(${direction}deg, ${colorStops})`;
              break;
            case 'radial':
              style.background = `radial-gradient(circle at ${position.x}% ${position.y}%, ${colorStops})`;
              break;
            case 'conic':
              style.background = `conic-gradient(from ${direction}deg at ${position.x}% ${position.y}%, ${colorStops})`;
              break;
          }
        }
        break;

      case 'image':
        if (config.image) {
          const { url, position, size, repeat, filters, overlay } = config.image;
          
          style.backgroundImage = `url(${url})`;
          style.backgroundPosition = position === 'custom' ? 'center' : position;
          style.backgroundSize = size === 'custom' ? 'cover' : size;
          style.backgroundRepeat = repeat;

          // Apply filters
          const filterString = [
            `blur(${filters.blur}px)`,
            `brightness(${filters.brightness}%)`,
            `contrast(${filters.contrast}%)`,
            `saturate(${filters.saturate}%)`,
            `sepia(${filters.sepia}%)`,
            `hue-rotate(${filters.hueRotate}deg)`
          ].join(' ');

          if (filterString !== 'blur(0px) brightness(100%) contrast(100%) saturate(100%) sepia(0%) hue-rotate(0deg)') {
            style.filter = filterString;
          }

          // Apply overlay
          if (overlay) {
            style.position = 'relative';
          }
        }
        break;

      case 'video':
        // Video backgrounds would need special handling
        style.backgroundColor = '#000';
        break;

      case 'pattern':
        if (config.pattern) {
          // Pattern implementation would go here
          style.backgroundColor = config.pattern.color;
          style.opacity = config.pattern.opacity / 100;
        }
        break;
    }

    return style;
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

  const getDeviceDimensions = () => {
    switch (deviceMode) {
      case 'mobile':
        return { width: '320px', height: '568px' };
      case 'tablet':
        return { width: '768px', height: '432px' };
      case 'desktop':
        return { width: '100%', height: '300px' };
    }
  };

  const dimensions = getDeviceDimensions();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Live Preview</Label>
        <div className="flex items-center space-x-2">
          {getDeviceIcon()}
          <Badge variant="outline" className="text-xs">
            {deviceMode.charAt(0).toUpperCase() + deviceMode.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Preview Container */}
      <Card className="p-4">
        <div 
          className="relative rounded-lg border-2 border-border overflow-hidden transition-all duration-300"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            maxWidth: '100%',
            margin: '0 auto',
            ...generateBackgroundStyle()
          }}
        >
          {/* Overlay for image backgrounds */}
          {config.type === 'image' && config.image?.overlay && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: config.image.overlay.color,
                opacity: config.image.overlay.opacity / 100,
                mixBlendMode: config.image.overlay.blendMode as any
              }}
            />
          )}

          {/* Video element for video backgrounds */}
          {config.type === 'video' && config.video?.url && (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={config.video.url}
              autoPlay={config.video.autoplay}
              loop={config.video.loop}
              muted={config.video.muted}
              style={{
                opacity: config.video.opacity / 100,
                filter: [
                  `blur(${config.video.filters.blur}px)`,
                  `brightness(${config.video.filters.brightness}%)`,
                  `contrast(${config.video.filters.contrast}%)`,
                  `saturate(${config.video.filters.saturate}%)`,
                  `sepia(${config.video.filters.sepia}%)`,
                  `hue-rotate(${config.video.filters.hueRotate}deg)`
                ].join(' ')
              }}
            />
          )}

          {/* Sample content overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 p-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center">
                <div className="w-8 h-8 bg-white/40 rounded-full" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-white/30 rounded w-24 mx-auto" />
                <div className="h-2 bg-white/20 rounded w-16 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Background Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="capitalize">{config.type}</span>
        </div>
        
        {config.type === 'solid' && config.solid && (
          <div className="flex justify-between">
            <span>Color:</span>
            <span className="font-mono">{config.solid.color}</span>
          </div>
        )}
        
        {config.type === 'gradient' && config.gradient && (
          <>
            <div className="flex justify-between">
              <span>Gradient:</span>
              <span className="capitalize">{config.gradient.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Colors:</span>
              <span>{config.gradient.colors.length} stops</span>
            </div>
          </>
        )}
        
        {config.type === 'image' && config.image && (
          <>
            <div className="flex justify-between">
              <span>Position:</span>
              <span className="capitalize">{config.image.position}</span>
            </div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="capitalize">{config.image.size}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
