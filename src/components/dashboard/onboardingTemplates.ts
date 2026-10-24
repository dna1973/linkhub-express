import type { ThemeConfig } from '@/stores/useDesignStore';

export type TemplateCategory = 'classico' | 'profissional' | 'brutalista' | 'neon' | 'suave';

export interface OnboardingTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** A miniatura usa a mesma config: a fonte vem de FONT_FAMILY_CSS[config.font.family] */
  config: ThemeConfig;
}

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'warm-peach',
    name: 'Peach',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#FDDCB5', '#F8C4A0'] },
      buttonStyle: { type: 'solid', color: '#F5A876', textColor: '#3D2B1F', borderRadius: 'lg' },
      font: { family: 'poppins', size: 'md', weight: 'medium' },
      colors: { primary: '#F5A876', secondary: '#5C3D2E', accent: '#F5A876', text: '#3D2B1F' },
    },
  },
  {
    id: 'clean-white',
    name: 'Clean',
    category: 'classico',
    config: {
      background: { type: 'solid', color: '#FFFFFF', colors: ['#FFFFFF', '#F9FAFB'] },
      buttonStyle: { type: 'outline', color: '#1A1A1A', textColor: 'auto', borderRadius: 'full' },
      font: { family: 'inter', size: 'md', weight: 'normal' },
      colors: { primary: '#1A1A1A', secondary: '#6B7280', accent: '#3B82F6', text: '#1A1A1A' },
    },
  },
  {
    id: 'ocean-deep',
    name: 'Ocean',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#0891B2', '#1E40AF'] },
      buttonStyle: { type: 'glass', color: '#22D3EE', textColor: 'auto', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'medium' },
      colors: { primary: '#22D3EE', secondary: '#67E8F9', accent: '#0EA5E9', text: '#FFFFFF' },
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#F59E0B', '#DC2626'] },
      buttonStyle: { type: 'outline', color: '#FFFFFF', textColor: 'auto', borderRadius: 'full' },
      font: { family: 'playfair', size: 'lg', weight: 'bold' },
      colors: { primary: '#FFFFFF', secondary: '#FEF3C7', accent: '#FBBF24', text: '#FFFFFF' },
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#0F172A', '#1E293B'] },
      buttonStyle: { type: 'glass', color: '#3B82F6', textColor: 'auto', borderRadius: 'lg' },
      font: { family: 'inter', size: 'md', weight: 'normal' },
      colors: { primary: '#3B82F6', secondary: '#64748B', accent: '#06B6D4', text: '#E2E8F0' },
    },
  },
  {
    id: 'forest-green',
    name: 'Forest',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#065F46', '#064E3B'] },
      buttonStyle: { type: 'glass', color: '#10B981', textColor: '#6EE7B7', borderRadius: 'lg' },
      font: { family: 'roboto-mono', size: 'md', weight: 'normal' },
      colors: { primary: '#10B981', secondary: '#6EE7B7', accent: '#34D399', text: '#D1FAE5' },
    },
  },
  {
    id: 'cyber-neon',
    name: 'Neon',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#0C0C0C', '#1A1A2E'] },
      buttonStyle: { type: 'outline', color: '#00FF88', textColor: 'auto', borderRadius: 'none' },
      font: { family: 'source-code-pro', size: 'md', weight: 'bold' },
      colors: { primary: '#00FF88', secondary: '#00CCFF', accent: '#FF0066', text: '#00FF88' },
    },
  },
  {
    id: 'rose-elegant',
    name: 'Rose',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#FFF1F2', '#FFE4E6'] },
      // Texto branco mantido por escolha de desenho (contraste ~2,7:1). Ver especificação, seção 3.
      buttonStyle: { type: 'solid', color: '#FB7185', textColor: '#FFFFFF', borderRadius: 'full' },
      font: { family: 'lora', size: 'md', weight: 'medium' },
      colors: { primary: '#FB7185', secondary: '#BE185D', accent: '#FB7185', text: '#881337' },
    },
  },
  {
    id: 'sand-cream',
    name: 'Sand',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#FEF3C7', '#FDE68A'] },
      buttonStyle: { type: 'solid', color: '#D97706', textColor: '#FFFBEB', borderRadius: 'lg' },
      font: { family: 'poppins', size: 'md', weight: 'medium' },
      colors: { primary: '#D97706', secondary: '#92400E', accent: '#D97706', text: '#78350F' },
    },
  },
  {
    id: 'purple-haze',
    name: 'Purple',
    category: 'classico',
    config: {
      background: { type: 'gradient', colors: ['#7C3AED', '#C026D3'] },
      buttonStyle: { type: 'glass', color: '#D946EF', textColor: 'auto', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#D946EF', secondary: '#3D2B5E', accent: '#D946EF', text: '#2D1B4E' },
    },
  },

  // Profissional
  {
    id: 'pro-navy',
    name: 'Marinho',
    category: 'profissional',
    config: {
      background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
      buttonStyle: { type: 'solid', color: '#FFFFFF', textColor: 'auto', borderRadius: 'md', shadow: 'soft' },
      font: { family: 'inter', size: 'md', weight: 'medium' },
      colors: { primary: '#FFFFFF', text: '#F1F5F9' },
      avatar: { shape: 'circle' },
    },
  },
  {
    id: 'pro-slate',
    name: 'Grafite',
    category: 'profissional',
    config: {
      background: { type: 'solid', color: '#F8FAFC', pattern: 'grid' },
      buttonStyle: { type: 'outline', color: '#1E293B', textColor: 'auto', borderRadius: 'sm', shadow: 'none' },
      font: { family: 'inter', size: 'md', weight: 'normal' },
      colors: { primary: '#1E293B', text: '#0F172A' },
      avatar: { shape: 'rounded' },
    },
  },
  {
    id: 'pro-olive',
    name: 'Oliva',
    category: 'profissional',
    config: {
      background: { type: 'gradient', colors: ['#1F3B2D', '#2F5D46'] },
      buttonStyle: { type: 'solid', color: '#E9F5EC', textColor: '#1F3B2D', borderRadius: 'lg', shadow: 'soft' },
      font: { family: 'lora', size: 'md', weight: 'medium' },
      colors: { primary: '#E9F5EC', text: '#F0FDF4' },
      avatar: { shape: 'circle' },
    },
  },

  // Neo-brutalista
  {
    id: 'brut-yellow',
    name: 'Amarelo',
    category: 'brutalista',
    config: {
      background: { type: 'solid', color: '#FDE047' },
      buttonStyle: { type: 'solid', color: '#FFFFFF', textColor: 'auto', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
      font: { family: 'poppins', size: 'md', weight: 'bold' },
      colors: { primary: '#FFFFFF', text: '#111111' },
      avatar: { shape: 'rounded' },
    },
  },
  {
    id: 'brut-pink',
    name: 'Chiclete',
    category: 'brutalista',
    config: {
      background: { type: 'solid', color: '#F9A8D4', pattern: 'dots' },
      buttonStyle: { type: 'solid', color: '#A3E635', textColor: 'auto', borderRadius: 'sm', shadow: 'hard', shadowColor: '#000000' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#A3E635', text: '#111111' },
      avatar: { shape: 'hexagon' },
    },
  },
  {
    id: 'brut-cobalt',
    name: 'Cobalto',
    category: 'brutalista',
    config: {
      background: { type: 'solid', color: '#2563EB' },
      buttonStyle: { type: 'solid', color: '#FFFFFF', textColor: 'auto', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
      font: { family: 'poppins', size: 'md', weight: 'bold' },
      colors: { primary: '#FFFFFF', text: '#FFFFFF' },
      avatar: { shape: 'rounded' },
    },
  },

  // Neon / tech
  {
    id: 'neon-cyber',
    name: 'Cyber',
    category: 'neon',
    config: {
      background: { type: 'gradient', colors: ['#0F0C29', '#302B63'], pattern: 'grid', animated: true },
      buttonStyle: { type: 'outline', color: '#00F0FF', textColor: 'auto', borderRadius: 'sm', shadow: 'glow' },
      font: { family: 'source-code-pro', size: 'md', weight: 'medium' },
      colors: { primary: '#00F0FF', text: '#E0F7FF' },
      avatar: { shape: 'hexagon' },
    },
  },
  {
    id: 'neon-synth',
    name: 'Synthwave',
    category: 'neon',
    config: {
      background: { type: 'gradient', colors: ['#2B1055', '#D53369'], animated: true },
      // Texto branco mantido por escolha de estilo (contraste ~3,4:1), como no Rose. Ver especificação, seção 5.
      buttonStyle: { type: 'solid', color: '#FF2E97', textColor: '#FFFFFF', borderRadius: 'full', shadow: 'glow' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#FF2E97', text: '#FFE3F1' },
      avatar: { shape: 'circle' },
    },
  },
  {
    id: 'neon-terminal',
    name: 'Terminal',
    category: 'neon',
    config: {
      background: { type: 'solid', color: '#050505', pattern: 'stripes' },
      buttonStyle: { type: 'outline', color: '#39FF14', textColor: 'auto', borderRadius: 'none', shadow: 'glow' },
      font: { family: 'roboto-mono', size: 'md', weight: 'normal' },
      colors: { primary: '#39FF14', text: '#39FF14' },
      avatar: { shape: 'rounded' },
    },
  },

  // Suave
  {
    id: 'soft-lavender',
    name: 'Lavanda',
    category: 'suave',
    config: {
      background: { type: 'gradient', colors: ['#E9D5FF', '#FBCFE8'], pattern: 'dots' },
      buttonStyle: { type: 'solid', color: '#FFFFFF', textColor: '#6B21A8', borderRadius: 'full', shadow: 'soft' },
      font: { family: 'poppins', size: 'md', weight: 'medium' },
      colors: { primary: '#FFFFFF', text: '#4C1D95' },
      avatar: { shape: 'circle' },
    },
  },
  {
    id: 'soft-mint',
    name: 'Menta',
    category: 'suave',
    config: {
      background: { type: 'gradient', colors: ['#D1FAE5', '#CFFAFE'], pattern: 'waves', animated: true },
      // modern em vez de glass: o glass ignora a cor e some sobre o fundo claro
      buttonStyle: { type: 'modern', color: '#10B981', textColor: 'auto', borderRadius: 'lg', shadow: 'soft' },
      font: { family: 'lora', size: 'md', weight: 'normal' },
      colors: { primary: '#10B981', text: '#065F46' },
      avatar: { shape: 'rounded' },
    },
  },
  {
    id: 'soft-blush',
    name: 'Blush',
    category: 'suave',
    config: {
      background: { type: 'solid', color: '#FFF7ED', pattern: 'grid' },
      buttonStyle: { type: 'solid', color: '#FDBA74', textColor: '#7C2D12', borderRadius: 'lg', shadow: 'soft' },
      font: { family: 'dancing-script', size: 'lg', weight: 'medium' },
      colors: { primary: '#FDBA74', text: '#7C2D12' },
      avatar: { shape: 'rounded' },
    },
  },
];
