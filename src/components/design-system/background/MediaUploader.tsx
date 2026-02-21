import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Link, 
  Image as ImageIcon, 
  Video, 
  X, 
  Eye, 
  EyeOff,
  RotateCcw 
} from 'lucide-react';
import type { ImageFilters, OverlayConfig } from '@/types/design-system';

interface MediaUploaderProps {
  type: 'image' | 'video';
  url: string;
  position: string;
  size: string;
  repeat: string;
  filters: ImageFilters;
  overlay?: OverlayConfig;
  opacity?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onChange: (config: any) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  type,
  url,
  position,
  size,
  repeat,
  filters,
  overlay,
  opacity = 100,
  autoplay = true,
  loop = true,
  muted = true,
  onChange
}) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState(url);
  const [showOverlay, setShowOverlay] = useState(!!overlay);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a server or cloud storage
      const fileUrl = URL.createObjectURL(file);
      onChange({ url: fileUrl });
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange({ url: urlInput.trim() });
    }
  };

  const handleFilterChange = (filter: keyof ImageFilters, value: number[]) => {
    const newFilters = { ...filters, [filter]: value[0] };
    onChange({ filters: newFilters });
  };

  const handleOverlayChange = (field: keyof OverlayConfig, value: any) => {
    const newOverlay = overlay ? { ...overlay, [field]: value } : {
      color: '#000000',
      opacity: 50,
      blendMode: 'normal',
      [field]: value
    };
    onChange({ overlay: newOverlay });
  };

  const resetFilters = () => {
    const defaultFilters: ImageFilters = {
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      sepia: 0,
      hueRotate: 0
    };
    onChange({ filters: defaultFilters });
  };

  const removeMedia = () => {
    onChange({ url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Media Upload/URL */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {type === 'image' ? 'Image' : 'Video'} Source
        </Label>
        
        <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'file' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose {type === 'image' ? 'Image' : 'Video'}
              </Button>
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeMedia}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileUpload}
              className="hidden"
            />
          </TabsContent>
          
          <TabsContent value="url" className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`Enter ${type} URL...`}
                className="flex-1"
              />
              <Button onClick={handleUrlSubmit} size="sm">
                <Link className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Media Preview */}
        {url && (
          <Card className="mt-3 p-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                {type === 'image' ? (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Video className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {url.split('/').pop() || 'Media file'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === 'image' ? 'Image' : 'Video'} • Ready
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Position & Size (for images) */}
      {type === 'image' && url && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Position</Label>
            <Select value={position} onValueChange={(value) => onChange({ position: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Size</Label>
            <Select value={size} onValueChange={(value) => onChange({ size: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Repeat</Label>
            <Select value={repeat} onValueChange={(value) => onChange({ repeat: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-repeat">No Repeat</SelectItem>
                <SelectItem value="repeat">Repeat</SelectItem>
                <SelectItem value="repeat-x">Repeat X</SelectItem>
                <SelectItem value="repeat-y">Repeat Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Video Controls */}
      {type === 'video' && url && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Opacity ({opacity}%)
            </Label>
            <Slider
              value={[opacity]}
              onValueChange={(value) => onChange({ opacity: value[0] })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => onChange({ autoplay: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Autoplay</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => onChange({ loop: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Loop</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={muted}
                onChange={(e) => onChange({ muted: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Muted</span>
            </label>
          </div>
        </div>
      )}

      {/* Filters */}
      {url && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Filters</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2"
              title="Reset filters"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Blur ({filters.blur}px)
              </Label>
              <Slider
                value={[filters.blur]}
                onValueChange={(value) => handleFilterChange('blur', value)}
                min={0}
                max={20}
                step={0.1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Brightness ({filters.brightness}%)
              </Label>
              <Slider
                value={[filters.brightness]}
                onValueChange={(value) => handleFilterChange('brightness', value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Contrast ({filters.contrast}%)
              </Label>
              <Slider
                value={[filters.contrast]}
                onValueChange={(value) => handleFilterChange('contrast', value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Saturation ({filters.saturate}%)
              </Label>
              <Slider
                value={[filters.saturate]}
                onValueChange={(value) => handleFilterChange('saturate', value)}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Sepia ({filters.sepia}%)
              </Label>
              <Slider
                value={[filters.sepia]}
                onValueChange={(value) => handleFilterChange('sepia', value)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Hue Rotate ({filters.hueRotate}°)
              </Label>
              <Slider
                value={[filters.hueRotate]}
                onValueChange={(value) => handleFilterChange('hueRotate', value)}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {url && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Overlay</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOverlay(!showOverlay)}
              className="h-8 px-2"
            >
              {showOverlay ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>

          {showOverlay && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Color</Label>
                <Input
                  type="color"
                  value={overlay?.color || '#000000'}
                  onChange={(e) => handleOverlayChange('color', e.target.value)}
                  className="w-full h-10"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Opacity ({overlay?.opacity || 50}%)
                </Label>
                <Slider
                  value={[overlay?.opacity || 50]}
                  onValueChange={(value) => handleOverlayChange('opacity', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Blend Mode</Label>
                <Select 
                  value={overlay?.blendMode || 'normal'} 
                  onValueChange={(value) => handleOverlayChange('blendMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="multiply">Multiply</SelectItem>
                    <SelectItem value="screen">Screen</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                    <SelectItem value="darken">Darken</SelectItem>
                    <SelectItem value="lighten">Lighten</SelectItem>
                    <SelectItem value="color-dodge">Color Dodge</SelectItem>
                    <SelectItem value="color-burn">Color Burn</SelectItem>
                    <SelectItem value="hard-light">Hard Light</SelectItem>
                    <SelectItem value="soft-light">Soft Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
