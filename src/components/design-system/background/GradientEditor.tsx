import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import type { GradientStop } from '@/types/design-system';

interface GradientEditorProps {
  type: 'linear' | 'radial' | 'conic';
  colors: GradientStop[];
  direction: number;
  position: { x: number; y: number };
  onChange: (gradient: {
    type: 'linear' | 'radial' | 'conic';
    colors: GradientStop[];
    direction: number;
    position: { x: number; y: number };
  }) => void;
}

export const GradientEditor: React.FC<GradientEditorProps> = ({
  type,
  colors,
  direction,
  position,
  onChange
}) => {
  const [selectedStop, setSelectedStop] = useState<number>(0);

  const generateGradientCSS = () => {
    const colorStops = colors
      .sort((a, b) => a.position - b.position)
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    switch (type) {
      case 'linear':
        return `linear-gradient(${direction}deg, ${colorStops})`;
      case 'radial':
        return `radial-gradient(circle at ${position.x}% ${position.y}%, ${colorStops})`;
      case 'conic':
        return `conic-gradient(from ${direction}deg at ${position.x}% ${position.y}%, ${colorStops})`;
      default:
        return `linear-gradient(${direction}deg, ${colorStops})`;
    }
  };

  const handleTypeChange = (newType: 'linear' | 'radial' | 'conic') => {
    onChange({ type: newType, colors, direction, position });
  };

  const handleDirectionChange = (newDirection: number[]) => {
    onChange({ type, colors, direction: newDirection[0], position });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number[]) => {
    const newPosition = { ...position, [axis]: value[0] };
    onChange({ type, colors, direction, position: newPosition });
  };

  const handleColorStopChange = (index: number, field: 'color' | 'position', value: string | number) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    onChange({ type, colors: newColors, direction, position });
  };

  const addColorStop = () => {
    const newPosition = colors.length > 0 
      ? Math.max(...colors.map(c => c.position)) + 10
      : 50;
    
    const newColors = [...colors, {
      color: '#ffffff',
      position: Math.min(newPosition, 100)
    }];
    
    onChange({ type, colors: newColors, direction, position });
    setSelectedStop(newColors.length - 1);
  };

  const removeColorStop = (index: number) => {
    if (colors.length <= 2) return; // Minimum 2 colors
    
    const newColors = colors.filter((_, i) => i !== index);
    onChange({ type, colors: newColors, direction, position });
    setSelectedStop(Math.max(0, Math.min(selectedStop, newColors.length - 1)));
  };

  const resetGradient = () => {
    const defaultColors: GradientStop[] = [
      { color: '#3b82f6', position: 0 },
      { color: '#8b5cf6', position: 100 }
    ];
    onChange({ 
      type: 'linear', 
      colors: defaultColors, 
      direction: 45, 
      position: { x: 50, y: 50 } 
    });
    setSelectedStop(0);
  };

  return (
    <div className="space-y-6">
      {/* Gradient Preview */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Preview</Label>
        <div 
          className="w-full h-24 rounded-lg border-2 border-border"
          style={{ background: generateGradientCSS() }}
        />
      </div>

      {/* Gradient Type */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Type</Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
            <SelectItem value="conic">Conic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Direction/Angle */}
      {(type === 'linear' || type === 'conic') && (
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {type === 'linear' ? 'Direction' : 'Angle'} ({direction}°)
          </Label>
          <Slider
            value={[direction]}
            onValueChange={handleDirectionChange}
            min={0}
            max={360}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Position (for radial and conic) */}
      {(type === 'radial' || type === 'conic') && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Center X ({position.x}%)
            </Label>
            <Slider
              value={[position.x]}
              onValueChange={(value) => handlePositionChange('x', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Center Y ({position.y}%)
            </Label>
            <Slider
              value={[position.y]}
              onValueChange={(value) => handlePositionChange('y', value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Color Stops */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Color Stops</Label>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={addColorStop}
              className="h-8 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetGradient}
              className="h-8 px-2"
              title="Reset gradient"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {colors.map((stop, index) => (
            <Card key={index} className={`p-3 ${selectedStop === index ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded border-2 border-border cursor-pointer"
                  style={{ backgroundColor: stop.color }}
                  onClick={() => setSelectedStop(index)}
                />
                
                <div className="flex-1 space-y-2">
                  <ColorPicker
                    value={stop.color}
                    onChange={(color) => handleColorStopChange(index, 'color', color)}
                    label={`Color ${index + 1}`}
                  />
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Position ({stop.position}%)
                    </Label>
                    <Slider
                      value={[stop.position]}
                      onValueChange={(value) => handleColorStopChange(index, 'position', value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {colors.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColorStop(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CSS Output */}
      <div>
        <Label className="text-sm font-medium mb-2 block">CSS</Label>
        <div className="p-3 bg-muted rounded-lg">
          <code className="text-xs font-mono break-all">
            background: {generateGradientCSS()};
          </code>
        </div>
      </div>
    </div>
  );
};
