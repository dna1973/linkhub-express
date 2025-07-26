import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useCurrentTheme } from '@/stores/designStore';
import { cn } from '@/lib/utils';
import type { DeviceMode } from '@/types/design-system';

interface PreviewCanvasProps {
  profileId: string;
  deviceMode: DeviceMode;
  isFullscreen?: boolean;
}

const DEVICE_DIMENSIONS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
};

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  profileId,
  deviceMode,
  isFullscreen = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const currentTheme = useCurrentTheme();

  const deviceDimensions = DEVICE_DIMENSIONS[deviceMode];

  // Calculate scale to fit preview in container
  useEffect(() => {
    const calculateScale = () => {
      if (isFullscreen) {
        setScale(1);
        return;
      }

      const container = iframeRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const padding = 40; // Padding around preview
      
      const availableWidth = containerRect.width - padding;
      const availableHeight = containerRect.height - padding;
      
      const scaleX = availableWidth / deviceDimensions.width;
      const scaleY = availableHeight / deviceDimensions.height;
      
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [deviceMode, isFullscreen, deviceDimensions]);

  // Generate preview content based on current theme
  const generatePreviewHTML = () => {
    const { background, typography, buttons, layout, colors } = currentTheme;

    // Generate CSS from theme configuration
    const generateCSS = () => {
      let css = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${typography.fontFamily.primary}, ${typography.fontFamily.fallback.join(', ')};
          line-height: 1.6;
          overflow-x: hidden;
        }
        
        .preview-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${layout.container.padding[deviceMode].top}px ${layout.container.padding[deviceMode].right}px ${layout.container.padding[deviceMode].bottom}px ${layout.container.padding[deviceMode].left}px;
        }
        
        .profile-content {
          width: 100%;
          max-width: ${layout.container.maxWidth[deviceMode]}px;
          text-align: ${layout.container.alignment};
        }
        
        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]});
          margin: 0 auto ${layout.spacing.element[deviceMode]}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          font-weight: bold;
        }
        
        .profile-name {
          font-size: ${typography.heading.fontSize[deviceMode]}px;
          font-weight: ${typography.heading.fontWeight};
          line-height: ${typography.heading.lineHeight};
          letter-spacing: ${typography.heading.letterSpacing}em;
          color: ${typography.heading.color};
          margin-bottom: ${layout.spacing.component[deviceMode]}px;
          text-transform: ${typography.heading.textTransform};
        }
        
        .profile-bio {
          font-size: ${typography.body.fontSize[deviceMode]}px;
          font-weight: ${typography.body.fontWeight};
          line-height: ${typography.body.lineHeight};
          color: ${typography.body.color};
          margin-bottom: ${layout.spacing.section[deviceMode]}px;
          text-transform: ${typography.body.textTransform};
        }
        
        .links-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: ${layout.spacing.element[deviceMode]}px;
        }
        
        .link-button {
          display: block;
          width: ${buttons.layout.width === 'full' ? '100%' : buttons.layout.width === 'auto' ? 'auto' : buttons.layout.width};
          height: ${buttons.layout.height}px;
          padding: ${buttons.layout.padding.top}px ${buttons.layout.padding.right}px ${buttons.layout.padding.bottom}px ${buttons.layout.padding.left}px;
          margin: ${buttons.layout.margin.top}px ${buttons.layout.margin.right}px ${buttons.layout.margin.bottom}px ${buttons.layout.margin.left}px;
          border-radius: ${buttons.default.border.radius[deviceMode]}px;
          border: ${buttons.default.border.width}px ${buttons.default.border.style} ${buttons.default.border.color};
          font-size: ${buttons.default.typography.fontSize[deviceMode]}px;
          font-weight: ${buttons.default.typography.fontWeight};
          color: ${buttons.default.typography.color};
          text-decoration: none;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .link-button:hover {
          transform: scale(1.02);
        }
      `;

      // Add background styles
      if (background.type === 'solid' && background.solid) {
        css += `
          .preview-container {
            background-color: ${background.solid.color};
          }
        `;
      } else if (background.type === 'gradient' && background.gradient) {
        const { type, colors, direction } = background.gradient;
        const colorStops = colors.map(stop => `${stop.color} ${stop.position}%`).join(', ');
        
        if (type === 'linear') {
          css += `
            .preview-container {
              background: linear-gradient(${direction}deg, ${colorStops});
            }
          `;
        } else if (type === 'radial') {
          css += `
            .preview-container {
              background: radial-gradient(circle, ${colorStops});
            }
          `;
        }
      }

      // Add button background styles
      if (buttons.default.background.type === 'solid' && buttons.default.background.solid) {
        css += `
          .link-button {
            background-color: ${buttons.default.background.solid.color};
          }
          .link-button:hover {
            background-color: ${buttons.hover.background.solid?.color || buttons.default.background.solid.color};
          }
        `;
      } else if (buttons.default.background.type === 'gradient' && buttons.default.background.gradient) {
        const { type, colors, direction } = buttons.default.background.gradient;
        const colorStops = colors.map(stop => `${stop.color} ${stop.position}%`).join(', ');
        
        if (type === 'linear') {
          css += `
            .link-button {
              background: linear-gradient(${direction}deg, ${colorStops});
            }
          `;
        }
      }

      // Add shadow styles
      if (buttons.default.shadow) {
        const { offsetX, offsetY, blur, spread, color, inset } = buttons.default.shadow;
        css += `
          .link-button {
            box-shadow: ${inset ? 'inset ' : ''}${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color};
          }
        `;
      }

      return css;
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        <style>${generateCSS()}</style>
      </head>
      <body>
        <div class="preview-container">
          <div class="profile-content">
            <div class="profile-avatar">
              U
            </div>
            <h1 class="profile-name">Your Name</h1>
            <p class="profile-bio">Your bio description goes here. This is a preview of how your profile will look.</p>
            <div class="links-container">
              <a href="#" class="link-button">🌐 Website</a>
              <a href="#" class="link-button">📱 Instagram</a>
              <a href="#" class="link-button">🐦 Twitter</a>
              <a href="#" class="link-button">💼 LinkedIn</a>
              <a href="#" class="link-button">📧 Contact</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Update iframe content when theme changes
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(generatePreviewHTML());
        doc.close();
      }
    }
  }, [currentTheme, deviceMode]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (doc) {
          doc.open();
          doc.write(generatePreviewHTML());
          doc.close();
        }
      }
      setIsLoading(false);
    }, 500);
  };

  const handleOpenInNewTab = () => {
    const previewHTML = generatePreviewHTML();
    const blob = new Blob([previewHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      {!isFullscreen && (
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <span className="text-xs text-muted-foreground">
              {deviceDimensions.width} × {deviceDimensions.height}
            </span>
            {scale < 1 && (
              <span className="text-xs text-muted-foreground">
                ({Math.round(scale * 100)}%)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh Preview"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInNewTab}
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-lg overflow-hidden',
            isFullscreen && 'w-full h-full rounded-none shadow-none'
          )}
          style={{
            width: isFullscreen ? '100%' : deviceDimensions.width * scale,
            height: isFullscreen ? '100%' : deviceDimensions.height * scale,
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            style={{
              transform: isFullscreen ? 'none' : `scale(${scale})`,
              transformOrigin: 'top left',
              width: isFullscreen ? '100%' : deviceDimensions.width,
              height: isFullscreen ? '100%' : deviceDimensions.height,
            }}
            title="Theme Preview"
            sandbox="allow-scripts allow-same-origin"
          />
          
          {/* Device Frame Overlay */}
          {!isFullscreen && deviceMode === 'mobile' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-800 rounded-full opacity-20" />
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-800 rounded-full opacity-20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};