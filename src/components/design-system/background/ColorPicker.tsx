import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Pipette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#f3f4f6'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label = 'Color',
  presets = DEFAULT_PRESETS
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleColorChange = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(newValue) || /^#[0-9A-F]{3}$/i.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if invalid
    if (!/^#[0-9A-F]{6}$/i.test(inputValue) && !/^#[0-9A-F]{3}$/i.test(inputValue)) {
      setInputValue(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="flex items-center space-x-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-12 h-8 p-0 border-2"
              style={{ backgroundColor: value }}
              title="Open color picker"
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-4">
              {/* Native color input */}
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-10 rounded border cursor-pointer"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title="Eyedropper tool"
                >
                  <Pipette className="h-4 w-4" />
                </Button>
              </div>

              {/* Color presets */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
                <div className="grid grid-cols-6 gap-2">
                  {presets.map((preset, index) => (
                    <button
                      key={index}
                      className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                      style={{ backgroundColor: preset }}
                      onClick={() => handleColorChange(preset)}
                      title={preset}
                    />
                  ))}
                </div>
              </div>

              {/* Recent colors placeholder */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Recent</Label>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded border-2 border-dashed border-muted-foreground/30"
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="#000000"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
};
