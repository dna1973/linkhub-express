import { create } from 'zustand';

export interface ThemeConfig {
  background: {
    type: 'solid' | 'gradient' | 'pattern';
    color?: string;
    colors?: string[];
    pattern?: string;
  };
  buttonStyle: {
    type: 'solid' | 'outline' | 'glass' | 'modern' | 'rounded';
    color?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  };
  font: {
    family: 'inter' | 'playfair' | 'poppins' | 'roboto-mono' | 'dancing-script' | 'montserrat' | 'lora' | 'source-code-pro';
    size: 'sm' | 'md' | 'lg';
    weight: 'light' | 'normal' | 'medium' | 'bold';
  };
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    avatarBorder?: string;
  };
}

interface DesignState {
  currentTheme: string;
  customTheme: ThemeConfig;
  isPreviewMode: boolean;
  setCurrentTheme: (theme: string) => void;
  setCustomTheme: (theme: ThemeConfig) => void;
  setPreviewMode: (enabled: boolean) => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  currentTheme: 'pebble-blue',
  customTheme: {
    background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
    buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
    font: { family: 'inter', size: 'md', weight: 'medium' },
    colors: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      accent: '#60a5fa',
      text: '#ffffff'
    },
  },
  isPreviewMode: false,
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setCustomTheme: (theme) => set({ customTheme: theme }),
  setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
}));