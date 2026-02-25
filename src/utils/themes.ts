import { ThemeConfig } from '@/stores/useDesignStore';

export const PREDEFINED_THEMES: { id: string; name: string; preview: string; config: ThemeConfig }[] = [
  {
    id: 'pebble-blue',
    name: 'Pebble Blue',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#cbd5e1', accent: '#60a5fa', text: '#ffffff' },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    preview: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    config: {
      background: { type: 'gradient', colors: ['#f59e0b', '#dc2626'] },
      buttonStyle: { type: 'outline', color: '#ffffff', borderRadius: 'full' },
      font: { family: 'playfair', size: 'lg', weight: 'bold' },
      colors: { primary: '#ffffff', secondary: '#fef3c7', accent: '#fbbf24', text: '#ffffff' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    preview: 'linear-gradient(135deg, #0891b2 0%, #1e40af 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0891b2', '#1e40af'] },
      buttonStyle: { type: 'modern', color: '#22d3ee', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'medium' },
      colors: { primary: '#22d3ee', secondary: '#67e8f9', accent: '#0ea5e9', text: '#ffffff' },
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    preview: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#065f46', '#064e3b'] },
      buttonStyle: { type: 'glass', color: '#10b981', borderRadius: 'lg' },
      font: { family: 'roboto-mono', size: 'md', weight: 'normal' },
      colors: { primary: '#10b981', secondary: '#6ee7b7', accent: '#34d399', text: '#ffffff' },
    },
  },
  {
    id: 'purple-rain',
    name: 'Purple Rain',
    preview: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
    config: {
      background: { type: 'gradient', colors: ['#7c3aed', '#c026d3'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#ffffff', secondary: '#e9d5ff', accent: '#d946ef', text: '#ffffff' },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0f172a', '#1e293b'] },
      buttonStyle: { type: 'glass', color: '#3b82f6', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'normal' },
      colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#06b6d4', text: '#ffffff' },
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    config: {
      background: { type: 'gradient', colors: ['#fbbf24', '#f59e0b'] },
      buttonStyle: { type: 'modern', color: '#92400e', borderRadius: 'full' },
      font: { family: 'lora', size: 'md', weight: 'medium' },
      colors: { primary: '#92400e', secondary: '#fcd34d', accent: '#d97706', text: '#92400e' },
    },
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    preview: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%)',
    config: {
      background: { type: 'gradient', colors: ['#0c0c0c', '#1a1a1a'] },
      buttonStyle: { type: 'outline', color: '#00ff88', borderRadius: 'none' },
      font: { family: 'source-code-pro', size: 'md', weight: 'bold' },
      colors: { primary: '#00ff88', secondary: '#00ccff', accent: '#ff0066', text: '#ffffff' },
    },
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    preview: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
    config: {
      background: { type: 'gradient', colors: ['#ff6b6b', '#4ecdc4'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
      font: { family: 'poppins', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#ffe0e0', accent: '#45b7aa', text: '#ffffff' },
    },
  },
  {
    id: 'arctic-ice',
    name: 'Arctic Ice',
    preview: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
    config: {
      background: { type: 'gradient', colors: ['#e0f2fe', '#b3e5fc'] },
      buttonStyle: { type: 'modern', color: '#0277bd', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'medium' },
      colors: { primary: '#0277bd', secondary: '#4fc3f7', accent: '#29b6f6', text: '#01579b' },
    },
  },
  {
    id: 'volcanic-ash',
    name: 'Volcanic Ash',
    preview: 'linear-gradient(135deg, #424242 0%, #212121 100%)',
    config: {
      background: { type: 'gradient', colors: ['#424242', '#212121'] },
      buttonStyle: { type: 'glass', color: '#ff5722', borderRadius: 'md' },
      font: { family: 'inter', size: 'md', weight: 'bold' },
      colors: { primary: '#ff5722', secondary: '#ffab91', accent: '#ff7043', text: '#ffffff' },
    },
  },
  {
    id: 'spring-meadow',
    name: 'Spring Meadow',
    preview: 'linear-gradient(135deg, #8bc34a 0%, #4caf50 100%)',
    config: {
      background: { type: 'gradient', colors: ['#8bc34a', '#4caf50'] },
      buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'full' },
      font: { family: 'inter', size: 'md', weight: 'medium' },
      colors: { primary: '#ffffff', secondary: '#c8e6c9', accent: '#66bb6a', text: '#ffffff' },
    },
  },
];

/** Resolve a ThemeConfig from theme_options (handles null custom) */
export function resolveThemeConfig(themeOptions: Record<string, any> | null): ThemeConfig | null {
  if (!themeOptions) return null;
  
  // If custom config exists, use it directly
  if (themeOptions.custom) return themeOptions.custom as ThemeConfig;
  
  // Otherwise resolve from themeId
  if (themeOptions.themeId) {
    const predefined = PREDEFINED_THEMES.find(t => t.id === themeOptions.themeId);
    if (predefined) return predefined.config;
  }
  
  return null;
}
