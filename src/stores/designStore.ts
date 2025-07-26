import { create } from 'zustand';
import type { 
  DesignState, 
  DesignActions, 
  ThemeConfig, 
  DeviceMode 
} from '@/types/design-system';

// Helper function to generate UUID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Default theme configuration
const createDefaultTheme = (): ThemeConfig => ({
  metadata: {
    id: generateId(),
    name: 'Untitled Theme',
    version: '1.0.0',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false,
    isPremium: false,
  },
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    custom: [],
  },
  background: {
    type: 'solid',
    solid: {
      color: '#111827',
    },
  },
  typography: {
    fontFamily: {
      primary: 'Inter',
      fallback: ['system-ui', 'sans-serif'],
      weights: [400, 500, 600, 700],
      subsets: ['latin'],
    },
    heading: {
      fontSize: {
        mobile: 24,
        tablet: 28,
        desktop: 32,
      },
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: -0.02,
      textTransform: 'none',
      textDecoration: 'none',
      color: '#ffffff',
      effects: {
        shadow: [],
        outline: { width: 0, color: 'transparent' },
        gradient: { colors: [], direction: 0 },
        animation: { type: 'none', duration: 0, delay: 0 },
      },
    },
    body: {
      fontSize: {
        mobile: 14,
        tablet: 16,
        desktop: 16,
      },
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: 0,
      textTransform: 'none',
      textDecoration: 'none',
      color: '#d1d5db',
      effects: {
        shadow: [],
        outline: { width: 0, color: 'transparent' },
        gradient: { colors: [], direction: 0 },
        animation: { type: 'none', duration: 0, delay: 0 },
      },
    },
    caption: {
      fontSize: {
        mobile: 12,
        tablet: 14,
        desktop: 14,
      },
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: 0,
      textTransform: 'none',
      textDecoration: 'none',
      color: '#9ca3af',
      effects: {
        shadow: [],
        outline: { width: 0, color: 'transparent' },
        gradient: { colors: [], direction: 0 },
        animation: { type: 'none', duration: 0, delay: 0 },
      },
    },
    button: {
      fontSize: {
        mobile: 14,
        tablet: 16,
        desktop: 16,
      },
      fontWeight: 500,
      lineHeight: 1,
      letterSpacing: 0,
      textTransform: 'none',
      textDecoration: 'none',
      color: '#ffffff',
      effects: {
        shadow: [],
        outline: { width: 0, color: 'transparent' },
        gradient: { colors: [], direction: 0 },
        animation: { type: 'none', duration: 0, delay: 0 },
      },
    },
    customFonts: [],
  },
  buttons: {
    default: {
      background: {
        type: 'solid',
        solid: { color: '#3b82f6' },
      },
      border: {
        width: 0,
        style: 'solid',
        color: 'transparent',
        radius: {
          mobile: 8,
          tablet: 8,
          desktop: 8,
        },
      },
      shadow: {
        offsetX: 0,
        offsetY: 2,
        blur: 4,
        spread: 0,
        color: 'rgba(0, 0, 0, 0.1)',
        inset: false,
      },
      typography: {
        fontSize: {
          mobile: 14,
          tablet: 16,
          desktop: 16,
        },
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: 0,
        textTransform: 'none',
        textDecoration: 'none',
        color: '#ffffff',
        effects: {
          shadow: [],
          outline: { width: 0, color: 'transparent' },
          gradient: { colors: [], direction: 0 },
          animation: { type: 'none', duration: 0, delay: 0 },
        },
      },
      effects: {
        glassmorphism: {
          blur: 0,
          transparency: 0,
          border: {
            width: 0,
            style: 'solid',
            color: 'transparent',
            radius: { mobile: 0, tablet: 0, desktop: 0 },
          },
          shadow: {
            offsetX: 0,
            offsetY: 0,
            blur: 0,
            spread: 0,
            color: 'transparent',
            inset: false,
          },
        },
        neumorphism: {
          intensity: 0,
          lightSource: { x: 0.5, y: 0.5 },
          backgroundColor: '#ffffff',
        },
        glow: {
          color: 'transparent',
          intensity: 0,
          size: 0,
        },
        blur: {
          amount: 0,
          type: 'gaussian',
        },
      },
    },
    hover: {
      background: {
        type: 'solid',
        solid: { color: '#2563eb' },
      },
      border: {
        width: 0,
        style: 'solid',
        color: 'transparent',
        radius: {
          mobile: 8,
          tablet: 8,
          desktop: 8,
        },
      },
      shadow: {
        offsetX: 0,
        offsetY: 4,
        blur: 8,
        spread: 0,
        color: 'rgba(0, 0, 0, 0.15)',
        inset: false,
      },
      typography: {
        fontSize: {
          mobile: 14,
          tablet: 16,
          desktop: 16,
        },
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: 0,
        textTransform: 'none',
        textDecoration: 'none',
        color: '#ffffff',
        effects: {
          shadow: [],
          outline: { width: 0, color: 'transparent' },
          gradient: { colors: [], direction: 0 },
          animation: { type: 'none', duration: 0, delay: 0 },
        },
      },
      effects: {
        glassmorphism: {
          blur: 0,
          transparency: 0,
          border: {
            width: 0,
            style: 'solid',
            color: 'transparent',
            radius: { mobile: 0, tablet: 0, desktop: 0 },
          },
          shadow: {
            offsetX: 0,
            offsetY: 0,
            blur: 0,
            spread: 0,
            color: 'transparent',
            inset: false,
          },
        },
        neumorphism: {
          intensity: 0,
          lightSource: { x: 0.5, y: 0.5 },
          backgroundColor: '#ffffff',
        },
        glow: {
          color: 'transparent',
          intensity: 0,
          size: 0,
        },
        blur: {
          amount: 0,
          type: 'gaussian',
        },
      },
    },
    active: {
      background: {
        type: 'solid',
        solid: { color: '#1d4ed8' },
      },
      border: {
        width: 0,
        style: 'solid',
        color: 'transparent',
        radius: {
          mobile: 8,
          tablet: 8,
          desktop: 8,
        },
      },
      shadow: {
        offsetX: 0,
        offsetY: 1,
        blur: 2,
        spread: 0,
        color: 'rgba(0, 0, 0, 0.1)',
        inset: false,
      },
      typography: {
        fontSize: {
          mobile: 14,
          tablet: 16,
          desktop: 16,
        },
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: 0,
        textTransform: 'none',
        textDecoration: 'none',
        color: '#ffffff',
        effects: {
          shadow: [],
          outline: { width: 0, color: 'transparent' },
          gradient: { colors: [], direction: 0 },
          animation: { type: 'none', duration: 0, delay: 0 },
        },
      },
      effects: {
        glassmorphism: {
          blur: 0,
          transparency: 0,
          border: {
            width: 0,
            style: 'solid',
            color: 'transparent',
            radius: { mobile: 0, tablet: 0, desktop: 0 },
          },
          shadow: {
            offsetX: 0,
            offsetY: 0,
            blur: 0,
            spread: 0,
            color: 'transparent',
            inset: false,
          },
        },
        neumorphism: {
          intensity: 0,
          lightSource: { x: 0.5, y: 0.5 },
          backgroundColor: '#ffffff',
        },
        glow: {
          color: 'transparent',
          intensity: 0,
          size: 0,
        },
        blur: {
          amount: 0,
          type: 'gaussian',
        },
      },
    },
    variants: {},
    layout: {
      width: 'full',
      height: 48,
      padding: {
        top: 12,
        right: 24,
        bottom: 12,
        left: 24,
      },
      margin: {
        top: 8,
        right: 0,
        bottom: 8,
        left: 0,
      },
      borderRadius: {
        mobile: 8,
        tablet: 8,
        desktop: 8,
      },
      alignment: 'center',
    },
    animations: {
      hover: {
        type: 'scale',
        duration: 200,
        delay: 0,
        easing: 'ease-out',
      },
      click: {
        type: 'scale',
        duration: 100,
        delay: 0,
        easing: 'ease-in',
      },
      entrance: {
        type: 'fade',
        duration: 300,
        delay: 0,
        easing: 'ease-out',
      },
    },
  },
  layout: {
    container: {
      maxWidth: {
        mobile: 320,
        tablet: 768,
        desktop: 1024,
      },
      padding: {
        mobile: { top: 16, right: 16, bottom: 16, left: 16 },
        tablet: { top: 24, right: 24, bottom: 24, left: 24 },
        desktop: { top: 32, right: 32, bottom: 32, left: 32 },
      },
      alignment: 'center',
    },
    spacing: {
      section: {
        mobile: 32,
        tablet: 48,
        desktop: 64,
      },
      element: {
        mobile: 16,
        tablet: 20,
        desktop: 24,
      },
      component: {
        mobile: 8,
        tablet: 12,
        desktop: 16,
      },
    },
    grid: {
      columns: {
        mobile: 1,
        tablet: 2,
        desktop: 3,
      },
      gap: {
        mobile: 16,
        tablet: 20,
        desktop: 24,
      },
      alignment: 'center',
    },
  },
  animations: {
    entrance: [],
    hover: [],
    scroll: [],
    micro: [],
    global: {
      pageTransition: {
        type: 'fade',
        duration: 300,
        delay: 0,
        easing: 'ease-in-out',
      },
      loadingAnimation: {
        type: 'fade',
        duration: 200,
        delay: 0,
        easing: 'ease-out',
      },
      scrollBehavior: 'smooth',
    },
    performance: {
      useGPU: true,
      respectReducedMotion: true,
      maxAnimations: 10,
      fallbackStatic: false,
    },
  },
  effects: {
    glassmorphism: {
      blur: 0,
      transparency: 0,
      border: {
        width: 0,
        style: 'solid',
        color: 'transparent',
        radius: { mobile: 0, tablet: 0, desktop: 0 },
      },
      shadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        spread: 0,
        color: 'transparent',
        inset: false,
      },
    },
    neumorphism: {
      intensity: 0,
      lightSource: { x: 0.5, y: 0.5 },
      backgroundColor: '#ffffff',
    },
    glow: {
      color: 'transparent',
      intensity: 0,
      size: 0,
    },
    blur: {
      amount: 0,
      type: 'gaussian',
    },
  },
});

interface DesignStore extends DesignState, DesignActions {}

export const useDesignStore = create<DesignStore>((set, get) => ({
  // Initial state
  currentTheme: createDefaultTheme(),
  history: [],
  historyIndex: -1,
  isPreviewMode: false,
  selectedElement: null,
  deviceMode: 'desktop' as DeviceMode,
  isDirty: false,
  activePanel: 'background',
  isLoading: false,
  error: null,

  // Theme management actions
  updateTheme: (updates: Partial<ThemeConfig>) => {
    set((state) => {
      // Save current state to history before making changes
      if (state.historyIndex < state.history.length - 1) {
        // Remove any future history if we're not at the end
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      
      // Add current theme to history
      state.history.push(JSON.parse(JSON.stringify(state.currentTheme)));
      state.historyIndex = state.history.length - 1;
      
      // Limit history to prevent memory issues
      if (state.history.length > 50) {
        state.history = state.history.slice(-50);
        state.historyIndex = state.history.length - 1;
      }

      // Apply updates
      const updatedTheme = { ...state.currentTheme, ...updates };
      updatedTheme.metadata.updatedAt = new Date();
      
      return {
        ...state,
        currentTheme: updatedTheme,
        isDirty: true,
      };
    });
  },

  loadTheme: async (themeId: string) => {
    set({ isLoading: true, error: null });

    try {
      // TODO: Implement API call to load theme
      // For now, just use default theme
      const defaultTheme = createDefaultTheme();
      defaultTheme.metadata.id = themeId;
      
      set({
        currentTheme: defaultTheme,
        history: [],
        historyIndex: -1,
        isDirty: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load theme',
        isLoading: false,
      });
    }
  },

  saveTheme: async () => {
    set({ isLoading: true, error: null });

    try {
      // TODO: Implement API call to save theme
      
      set((state) => ({
        ...state,
        isDirty: false,
        isLoading: false,
        currentTheme: {
          ...state.currentTheme,
          metadata: {
            ...state.currentTheme.metadata,
            updatedAt: new Date(),
          },
        },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save theme',
        isLoading: false,
      });
    }
  },

  resetTheme: () => {
    set({
      currentTheme: createDefaultTheme(),
      history: [],
      historyIndex: -1,
      isDirty: false,
    });
  },

  // History actions
  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        return {
          ...state,
          historyIndex: state.historyIndex - 1,
          currentTheme: JSON.parse(JSON.stringify(state.history[state.historyIndex - 1])),
          isDirty: true,
        };
      }
      return state;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          historyIndex: state.historyIndex + 1,
          currentTheme: JSON.parse(JSON.stringify(state.history[state.historyIndex + 1])),
          isDirty: true,
        };
      }
      return state;
    });
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  // UI state actions
  setSelectedElement: (elementId: string | null) => {
    set({ selectedElement: elementId });
  },

  setDeviceMode: (mode: DeviceMode) => {
    set({ deviceMode: mode });
  },

  setActivePanel: (panel: string) => {
    set({ activePanel: panel });
  },

  setPreviewMode: (enabled: boolean) => {
    set({ isPreviewMode: enabled });
  },

  // Utility actions
  exportTheme: () => {
    const state = get();
    return JSON.stringify(state.currentTheme, null, 2);
  },

  importTheme: (themeJson: string) => {
    try {
      const theme = JSON.parse(themeJson) as ThemeConfig;
      set({
        currentTheme: theme,
        history: [],
        historyIndex: -1,
        isDirty: true,
      });
    } catch (error) {
      set({
        error: 'Invalid theme format',
      });
    }
  },

  duplicateTheme: () => {
    set((state) => {
      const duplicated = JSON.parse(JSON.stringify(state.currentTheme));
      duplicated.metadata.id = generateId();
      duplicated.metadata.name = `${duplicated.metadata.name} (Copy)`;
      duplicated.metadata.createdAt = new Date();
      duplicated.metadata.updatedAt = new Date();
      
      return {
        ...state,
        currentTheme: duplicated,
        history: [],
        historyIndex: -1,
        isDirty: true,
      };
    });
  },
}));

// Selectors for better performance
export const useCurrentTheme = () => useDesignStore((state) => state.currentTheme);
export const useDeviceMode = () => useDesignStore((state) => state.deviceMode);
export const useSelectedElement = () => useDesignStore((state) => state.selectedElement);
export const useActivePanel = () => useDesignStore((state) => state.activePanel);
export const useIsPreviewMode = () => useDesignStore((state) => state.isPreviewMode);
export const useIsDirty = () => useDesignStore((state) => state.isDirty);
export const useCanUndo = () => useDesignStore((state) => state.canUndo());
export const useCanRedo = () => useDesignStore((state) => state.canRedo());