import { create } from 'zustand';

export interface ThemeConfig {
  background: {
    type: 'solid' | 'gradient';
    color?: string;
    colors?: string[];
  };
  buttonStyle: 'solid' | 'outline' | 'glass';
  font: 'system' | 'serif' | 'mono';
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
    buttonStyle: 'glass',
    font: 'system',
  },
  isPreviewMode: false,
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setCustomTheme: (theme) => set({ customTheme: theme }),
  setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
}));