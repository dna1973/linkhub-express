// Design System 2.0 - Core Types and Interfaces

export type DeviceMode = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveValue<T> {
  mobile: T;
  tablet: T;
  desktop: T;
}

// Color System Types
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // Base color
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  semantic: SemanticColors;
  custom: CustomColor[];
}

export interface CustomColor {
  id: string;
  name: string;
  value: string;
  category?: string;
}

// Background System Types
export interface GradientStop {
  color: string;
  position: number;
}

export interface ImageFilters {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  sepia: number;
  hueRotate: number;
}

export interface OverlayConfig {
  color: string;
  opacity: number;
  blendMode: string;
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'pattern';
  solid?: {
    color: string;
  };
  gradient?: {
    type: 'linear' | 'radial' | 'conic';
    colors: GradientStop[];
    direction: number;
    position: { x: number; y: number };
  };
  image?: {
    url: string;
    position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
    size: 'cover' | 'contain' | 'auto' | 'custom';
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    filters: ImageFilters;
    overlay?: OverlayConfig;
  };
  video?: {
    url: string;
    opacity: number;
    filters: ImageFilters;
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
  };
  pattern?: {
    type: string;
    color: string;
    size: number;
    opacity: number;
  };
}

// Typography System Types
export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface TextOutline {
  width: number;
  color: string;
}

export interface TextGradient {
  colors: string[];
  direction: number;
}

export interface TextAnimation {
  type: 'none' | 'fade' | 'slide' | 'typewriter';
  duration: number;
  delay: number;
}

export interface TextEffects {
  shadow: TextShadow[];
  outline: TextOutline;
  gradient: TextGradient;
  animation: TextAnimation;
}

export interface TextStyle {
  fontSize: ResponsiveValue<number>;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration: 'none' | 'underline' | 'line-through';
  color: string;
  effects: TextEffects;
}

export interface FontConfig {
  primary: string;
  secondary?: string;
  fallback: string[];
  weights: number[];
  subsets: string[];
}

export interface CustomFont {
  id: string;
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  url: string;
  format: 'woff2' | 'woff' | 'ttf';
}

export interface TypographyConfig {
  fontFamily: FontConfig;
  heading: TextStyle;
  body: TextStyle;
  caption: TextStyle;
  button: TextStyle;
  customFonts: CustomFont[];
}

// Layout and Spacing Types
export interface SpacingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BorderConfig {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
  color: string;
  radius: ResponsiveValue<number>;
}

export interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

// Visual Effects Types
export interface GlassmorphismConfig {
  blur: number;
  transparency: number;
  border: BorderConfig;
  shadow: ShadowConfig;
}

export interface NeumorphismConfig {
  intensity: number;
  lightSource: { x: number; y: number };
  backgroundColor: string;
}

export interface GlowConfig {
  color: string;
  intensity: number;
  size: number;
}

export interface BlurConfig {
  amount: number;
  type: 'gaussian' | 'motion' | 'radial';
}

export interface VisualEffects {
  glassmorphism: GlassmorphismConfig;
  neumorphism: NeumorphismConfig;
  glow: GlowConfig;
  blur: BlurConfig;
}

// Button System Types
export interface ButtonLayout {
  width: 'full' | 'auto' | 'custom';
  height: number;
  padding: SpacingConfig;
  margin: SpacingConfig;
  borderRadius: ResponsiveValue<number>;
  alignment: 'left' | 'center' | 'right';
}

export interface ButtonStyle {
  background: BackgroundConfig;
  border: BorderConfig;
  shadow: ShadowConfig;
  typography: TextStyle;
  effects: VisualEffects;
}

export interface AnimationConfig {
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
  duration: number;
  delay: number;
  easing: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface ButtonAnimations {
  hover: AnimationConfig;
  click: AnimationConfig;
  entrance: AnimationConfig;
}

export interface ButtonVariant {
  name: string;
  style: ButtonStyle;
  animations: ButtonAnimations;
}

export interface ButtonConfig {
  default: ButtonStyle;
  hover: ButtonStyle;
  active: ButtonStyle;
  variants: Record<string, ButtonVariant>;
  layout: ButtonLayout;
  animations: ButtonAnimations;
}

// Animation System Types
export interface KeyframeAnimation {
  keyframes: Record<string, any>[];
  duration: number;
  easing: string;
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate';
}

export interface EntranceAnimation {
  element: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration: number;
  delay: number;
  easing: string;
  stagger?: number;
}

export interface HoverAnimation {
  element: string;
  animation: KeyframeAnimation;
  trigger: 'hover' | 'focus';
}

export interface ScrollAnimation {
  element: string;
  animation: KeyframeAnimation;
  trigger: 'inView' | 'scroll';
  offset: number;
}

export interface MicroInteraction {
  trigger: 'hover' | 'click' | 'focus';
  element: string;
  animation: KeyframeAnimation;
  feedback: {
    haptic: boolean;
    sound: boolean;
  };
}

export interface GlobalAnimations {
  pageTransition: AnimationConfig;
  loadingAnimation: AnimationConfig;
  scrollBehavior: 'smooth' | 'auto';
}

export interface AnimationSystemConfig {
  entrance: EntranceAnimation[];
  hover: HoverAnimation[];
  scroll: ScrollAnimation[];
  micro: MicroInteraction[];
  global: GlobalAnimations;
  performance: {
    useGPU: boolean;
    respectReducedMotion: boolean;
    maxAnimations: number;
    fallbackStatic: boolean;
  };
}

// Layout System Types
export interface LayoutConfig {
  container: {
    maxWidth: ResponsiveValue<number>;
    padding: ResponsiveValue<SpacingConfig>;
    alignment: 'left' | 'center' | 'right';
  };
  spacing: {
    section: ResponsiveValue<number>;
    element: ResponsiveValue<number>;
    component: ResponsiveValue<number>;
  };
  grid: {
    columns: ResponsiveValue<number>;
    gap: ResponsiveValue<number>;
    alignment: 'start' | 'center' | 'end' | 'stretch';
  };
}

// Main Theme Configuration
export interface ThemeMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isPremium: boolean;
  price?: number;
}

export interface ThemeConfig {
  metadata: ThemeMetadata;
  colors: ColorPalette;
  background: BackgroundConfig;
  typography: TypographyConfig;
  buttons: ButtonConfig;
  layout: LayoutConfig;
  animations: AnimationSystemConfig;
  effects: VisualEffects;
}

// Design Editor State Types
export interface DesignState {
  currentTheme: ThemeConfig;
  history: ThemeConfig[];
  historyIndex: number;
  isPreviewMode: boolean;
  selectedElement: string | null;
  deviceMode: DeviceMode;
  isDirty: boolean;
  activePanel: string;
  isLoading: boolean;
  error: string | null;
}

export interface DesignActions {
  // Theme management
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  updateBackgroundConfig: (backgroundConfig: BackgroundConfig) => void;
  loadTheme: (themeId: string) => Promise<void>;
  saveTheme: () => Promise<void>;
  resetTheme: () => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // UI state
  setSelectedElement: (elementId: string | null) => void;
  setDeviceMode: (mode: DeviceMode) => void;
  setActivePanel: (panel: string) => void;
  setPreviewMode: (enabled: boolean) => void;
  
  // Utility
  exportTheme: () => string;
  importTheme: (themeJson: string) => void;
  duplicateTheme: () => void;
}

// Template System Types
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface TemplateAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  preview: string;
  theme: ThemeConfig;
  tags: string[];
  popularity: number;
  author: TemplateAuthor;
  isPremium: boolean;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateMarketplace {
  featured: Template[];
  categories: TemplateCategory[];
  trending: Template[];
  recent: Template[];
  userTemplates: Template[];
}

// Asset Management Types
export interface AssetMetadata {
  width?: number;
  height?: number;
  size: number;
  format: string;
  colorPalette?: string[];
  dominantColor?: string;
}

export interface UserAsset {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  type: 'image' | 'video' | 'font' | 'icon';
  metadata: AssetMetadata;
  tags: string[];
  createdAt: Date;
}

// Performance and Accessibility Types
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  animationFPS: number;
  loadTime: number;
}

export interface AccessibilityReport {
  contrastRatio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  keyboardNavigable: boolean;
  screenReaderFriendly: boolean;
  recommendations: string[];
}

// Export/Import Types
export interface ExportOptions {
  includeAssets: boolean;
  optimizeCSS: boolean;
  minify: boolean;
  format: 'json' | 'css' | 'zip';
}

export interface ImportResult {
  success: boolean;
  theme?: ThemeConfig;
  errors: string[];
  warnings: string[];
}