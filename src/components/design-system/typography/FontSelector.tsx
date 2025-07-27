import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Star, Download, Type, Globe } from 'lucide-react';

interface FontSelectorProps {
  selectedFont: string;
  fallbackFonts: string[];
  weights: number[];
  onChange: (font: {
    primary: string;
    fallback: string[];
    weights: number[];
    subsets: string[];
  }) => void;
}

// Popular Google Fonts
const GOOGLE_FONTS = [
  { name: 'Inter', category: 'sans-serif', popularity: 100 },
  { name: 'Roboto', category: 'sans-serif', popularity: 95 },
  { name: 'Open Sans', category: 'sans-serif', popularity: 90 },
  { name: 'Lato', category: 'sans-serif', popularity: 85 },
  { name: 'Montserrat', category: 'sans-serif', popularity: 80 },
  { name: 'Source Sans Pro', category: 'sans-serif', popularity: 75 },
  { name: 'Raleway', category: 'sans-serif', popularity: 70 },
  { name: 'Ubuntu', category: 'sans-serif', popularity: 65 },
  { name: 'Nunito', category: 'sans-serif', popularity: 60 },
  { name: 'Poppins', category: 'sans-serif', popularity: 55 },
  { name: 'Playfair Display', category: 'serif', popularity: 50 },
  { name: 'Merriweather', category: 'serif', popularity: 45 },
  { name: 'Lora', category: 'serif', popularity: 40 },
  { name: 'PT Serif', category: 'serif', popularity: 35 },
  { name: 'Crimson Text', category: 'serif', popularity: 30 },
  { name: 'Fira Code', category: 'monospace', popularity: 25 },
  { name: 'Source Code Pro', category: 'monospace', popularity: 20 },
  { name: 'JetBrains Mono', category: 'monospace', popularity: 15 },
];

// System fonts
const SYSTEM_FONTS = [
  { name: 'system-ui', category: 'system' },
  { name: 'Arial', category: 'system' },
  { name: 'Helvetica', category: 'system' },
  { name: 'Times New Roman', category: 'system' },
  { name: 'Georgia', category: 'system' },
  { name: 'Courier New', category: 'system' },
  { name: 'Verdana', category: 'system' },
  { name: 'Tahoma', category: 'system' },
];

// Font weights
const FONT_WEIGHTS = [
  { value: 100, name: 'Thin' },
  { value: 200, name: 'Extra Light' },
  { value: 300, name: 'Light' },
  { value: 400, name: 'Regular' },
  { value: 500, name: 'Medium' },
  { value: 600, name: 'Semi Bold' },
  { value: 700, name: 'Bold' },
  { value: 800, name: 'Extra Bold' },
  { value: 900, name: 'Black' },
];

export const FontSelector: React.FC<FontSelectorProps> = ({
  selectedFont,
  fallbackFonts,
  weights,
  onChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredFonts = [...GOOGLE_FONTS, ...SYSTEM_FONTS].filter(font => {
    const matchesSearch = font.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || font.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFontSelect = (fontName: string) => {
    const isGoogleFont = GOOGLE_FONTS.find(f => f.name === fontName);
    const newFallback = isGoogleFont 
      ? ['system-ui', 'sans-serif']
      : fallbackFonts;

    onChange({
      primary: fontName,
      fallback: newFallback,
      weights: weights,
      subsets: ['latin']
    });
  };

  const handleWeightToggle = (weight: number) => {
    const newWeights = weights.includes(weight)
      ? weights.filter(w => w !== weight)
      : [...weights, weight].sort((a, b) => a - b);
    
    onChange({
      primary: selectedFont,
      fallback: fallbackFonts,
      weights: newWeights,
      subsets: ['latin']
    });
  };

  const toggleFavorite = (fontName: string) => {
    setFavorites(prev => 
      prev.includes(fontName)
        ? prev.filter(f => f !== fontName)
        : [...prev, fontName]
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fonts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="sans-serif">Sans Serif</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
            <SelectItem value="system">System Fonts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Current Selection */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Selected Font</Label>
            <Badge variant="outline" className="text-xs">
              {GOOGLE_FONTS.find(f => f.name === selectedFont) ? 'Google Font' : 'System Font'}
            </Badge>
          </div>
          
          <div 
            className="text-2xl font-medium p-4 bg-muted rounded-lg"
            style={{ fontFamily: selectedFont }}
          >
            {selectedFont}
          </div>
          
          <div className="text-sm text-muted-foreground">
            The quick brown fox jumps over the lazy dog
          </div>
        </div>
      </Card>

      {/* Font List */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Available Fonts</Label>
        <ScrollArea className="h-64 border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredFonts.map((font) => (
              <div
                key={font.name}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFont === font.name 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleFontSelect(font.name)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="font-medium"
                      style={{ fontFamily: font.name }}
                    >
                      {font.name}
                    </span>
                    {font.category === 'system' && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                    {'popularity' in font && font.popularity > 80 && (
                      <Badge variant="secondary" className="text-xs">Popular</Badge>
                    )}
                  </div>
                  <div 
                    className="text-sm text-muted-foreground mt-1"
                    style={{ fontFamily: font.name }}
                  >
                    The quick brown fox
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {font.category !== 'system' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(font.name);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Star 
                        className={`h-4 w-4 ${
                          favorites.includes(font.name) 
                            ? 'fill-current text-yellow-500' 
                            : 'text-muted-foreground'
                        }`} 
                      />
                    </Button>
                  )}
                  
                  {font.category !== 'system' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Load font"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Font Weights */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Font Weights</Label>
        <div className="grid grid-cols-3 gap-2">
          {FONT_WEIGHTS.map((weight) => (
            <Button
              key={weight.value}
              variant={weights.includes(weight.value) ? "default" : "outline"}
              size="sm"
              onClick={() => handleWeightToggle(weight.value)}
              className="justify-start"
            >
              <span className="font-medium mr-2">{weight.value}</span>
              <span className="text-xs">{weight.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Fallback Fonts */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Fallback Stack</Label>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Primary: <code className="bg-muted px-1 rounded">{selectedFont}</code></div>
          <div>Fallbacks: <code className="bg-muted px-1 rounded">{fallbackFonts.join(', ')}</code></div>
        </div>
      </div>
    </div>
  );
};
