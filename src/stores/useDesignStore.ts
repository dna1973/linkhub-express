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
    family: 'system' | 'serif' | 'mono' | 'display' | 'handwriting';
    size: 'sm' | 'md' | 'lg';
    weight: 'light' | 'normal' | 'medium' | 'bold';
  };
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
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
  currentTheme: 'default',
  customTheme: {
    background: { type: 'solid', color: '#111827' },
    buttonStyle: { type: 'glass', color: '#3b82f6', borderRadius: 'md' },
    font: { family: 'system', size: 'md', weight: 'normal' },
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      text: '#ffffff'
    },
  },
  isPreviewMode: false,
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setCustomTheme: (theme) => set({ customTheme: theme }),
  setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
}));