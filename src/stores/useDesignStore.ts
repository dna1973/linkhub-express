import { create } from 'zustand';

export interface ThemeConfig {
  background: {
    /** 'pattern' é valor legado do editor: é lido como sólido, com o padrão desenhado por cima */
    type: 'solid' | 'gradient' | 'pattern';
    color?: string;
    colors?: string[];
    /** Camada desenhada sobre qualquer tipo de fundo. Ausente ou 'none': sem padrão */
    pattern?: 'none' | 'dots' | 'grid' | 'waves' | 'stripes';
    /** Só vale para gradiente */
    animated?: boolean;
  };
  buttonStyle: {
    type: 'solid' | 'outline' | 'glass' | 'modern' | 'rounded';
    color?: string;
    /** 'auto' (padrão quando ausente) ou uma cor hex */
    textColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    size?: 'sm' | 'md' | 'lg';
    /** Ausente ou 'none': sem sombra */
    shadow?: 'none' | 'soft' | 'hard' | 'glow';
    /** Hex. Usado pelos modelos; o editor não tem controle e preserva o valor */
    shadowColor?: string;
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
  /** Ausente: círculo */
  avatar?: {
    shape?: 'circle' | 'rounded' | 'hexagon';
  };
}

export const DEFAULT_THEME_ID = 'pebble-blue';

/** Tema inicial do editor. É função para cada chamada devolver um objeto novo. */
export function createDefaultCustomTheme(): ThemeConfig {
  return {
    background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
    buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
    font: { family: 'inter', size: 'md', weight: 'medium' },
    colors: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      accent: '#60a5fa',
      text: '#ffffff'
    },
  };
}

interface DesignState {
  currentTheme: string;
  customTheme: ThemeConfig;
  isPreviewMode: boolean;
  setCurrentTheme: (theme: string) => void;
  setCustomTheme: (theme: ThemeConfig) => void;
  setPreviewMode: (enabled: boolean) => void;
  /** Volta ao tema inicial. Usado ao trocar para um perfil sem tema salvo. */
  resetDesign: () => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  currentTheme: DEFAULT_THEME_ID,
  customTheme: createDefaultCustomTheme(),
  isPreviewMode: false,
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setCustomTheme: (theme) => set({ customTheme: theme }),
  setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
  resetDesign: () => set({ currentTheme: DEFAULT_THEME_ID, customTheme: createDefaultCustomTheme() }),
}));
