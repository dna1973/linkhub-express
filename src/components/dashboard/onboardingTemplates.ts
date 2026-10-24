import type { ThemeConfig } from '@/stores/useDesignStore';

export interface OnboardingTemplate {
  id: string;
  name: string;
  /** Família CSS usada só no desenho em miniatura */
  font: string;
  config: ThemeConfig;
}

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'warm-peach',
    name: 'Peach',
    font: 'Poppins, sans-serif',
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
    font: 'Inter, sans-serif',
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
    font: 'Montserrat, sans-serif',
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
    font: 'Playfair Display, serif',
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
    font: 'Inter, sans-serif',
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
    font: 'Roboto Mono, monospace',
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
    font: 'Source Code Pro, monospace',
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
    font: 'Lora, serif',
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
    font: 'Poppins, sans-serif',
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
    font: 'Montserrat, sans-serif',
    config: {
      background: { type: 'gradient', colors: ['#7C3AED', '#C026D3'] },
      buttonStyle: { type: 'glass', color: '#D946EF', textColor: 'auto', borderRadius: 'md' },
      font: { family: 'montserrat', size: 'md', weight: 'bold' },
      colors: { primary: '#D946EF', secondary: '#3D2B5E', accent: '#D946EF', text: '#2D1B4E' },
    },
  },
];
