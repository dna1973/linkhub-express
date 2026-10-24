# Melhorias de visual, sidebar e desempenho — plano de implementação

> **Para agentes executores:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** cor do texto dos botões configurável, onboarding fiel ao modelo escolhido, sidebar funcional em janela estreita e perfil público sem baixar o painel.

**Arquitetura:** um módulo puro, `src/utils/linkButtonStyle.ts`, passa a ser a única fonte do estilo de botão e de fundo. Ele é usado pela página pública, pela prévia e pelo desenho dos modelos. Os modelos saem para um arquivo de dados próprio e o desenho vira um componente único. As rotas passam a carregar sob demanda, e o service worker só é registrado fora de `/:username`.

**Stack:** React 18, Vite 5, TypeScript (`strict: false`), shadcn/ui, Zustand, Supabase, Vitest 2 com Testing Library e jsdom, vite-plugin-pwa.

**Especificação:** `docs/superpowers/specs/2026-10-23-visual-sidebar-desempenho-design.md`

**Convenções do ambiente (Windows):**
- Os comandos rodam no PowerShell, na raiz do repositório.
- `ssh` perde aspas duplas internas: use aspas simples por fora.
- Cada commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Responda e escreva commits em português.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/stores/useDesignStore.ts` | Modificar | Tipo `ThemeConfig`: ganha `buttonStyle.textColor` e `buttonStyle.size` |
| `src/utils/linkButtonStyle.ts` | Criar | Cores, contraste, estilo e classes do botão; fundo da página |
| `src/utils/linkButtonStyle.test.ts` | Criar | Testes do módulo acima |
| `src/components/dashboard/onboardingTemplates.ts` | Criar | Os 10 modelos (só dados) |
| `src/components/dashboard/onboardingTemplates.test.ts` | Criar | Fidelidade dos modelos à tabela da especificação |
| `src/components/dashboard/TemplateMockup.tsx` | Criar | Miniatura de celular de um modelo |
| `src/components/dashboard/OnboardingDialog.tsx` | Modificar | Remove modelos e `PhoneMockup`; usa os novos |
| `src/components/dashboard/DesignTab.tsx` | Modificar | Controle de cor do texto, remoção de Primária/Destaque, correção do save, aba Modelos com `TemplateMockup` |
| `src/pages/PublicProfile.tsx` | Modificar | Usa `getLinkButtonStyle`, `getLinkButtonClassName` e `getBackgroundStyle` |
| `src/components/dashboard/ProfilePreview.tsx` | Modificar | Idem |
| `src/pages/Dashboard.tsx` | Modificar | Remove a aba `design-v2` |
| `src/components/design-system/**`, `src/components/dashboard/DesignSystemTab.tsx`, `src/stores/designStore.ts`, `src/types/design-system.ts`, `src/hooks/useResizable.ts` | Apagar | Editor não usado |
| `src/components/dashboard/AppSidebar.tsx` | Modificar | Rótulos no painel móvel, fecha ao escolher, larguras do componente |
| `src/App.tsx` | Modificar | Rotas com `React.lazy` e `Suspense` |
| `src/lib/serviceWorkerRoutes.ts` | Criar | Decide se a rota é perfil público |
| `src/lib/serviceWorkerRoutes.test.ts` | Criar | Testes da regra |
| `src/registerServiceWorker.ts` | Criar | Registra o SW fora do perfil público |
| `src/main.tsx` | Modificar | Chama o registro |
| `src/vite-env.d.ts` | Modificar | Tipos de `virtual:pwa-register` |
| `vite.config.ts` | Modificar | `injectRegister: false` |

---

### Tarefa 1: tipo `ThemeConfig` e módulo `linkButtonStyle`

**Arquivos:**
- Modificar: `src/stores/useDesignStore.ts:10-14`
- Criar: `src/utils/linkButtonStyle.ts`
- Teste: `src/utils/linkButtonStyle.test.ts`

- [ ] **Passo 1: ampliar o tipo**

Em `src/stores/useDesignStore.ts`, troque o bloco `buttonStyle` por:

```ts
  buttonStyle: {
    type: 'solid' | 'outline' | 'glass' | 'modern' | 'rounded';
    color?: string;
    /** 'auto' (padrão quando ausente) ou uma cor hex */
    textColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    size?: 'sm' | 'md' | 'lg';
  };
```

- [ ] **Passo 2: escrever os testes que falham**

Crie `src/utils/linkButtonStyle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  normalizeHex,
  getContrastText,
  resolveButtonColors,
  getButtonRadius,
  getLinkButtonStyle,
  getLinkButtonClassName,
  getBackgroundStyle,
} from './linkButtonStyle';

describe('normalizeHex', () => {
  it('expande #rgb e põe em minúsculas', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#F5A876')).toBe('#f5a876');
  });
  it('devolve null para valor inválido ou vazio', () => {
    expect(normalizeHex('rgba(255,255,255,0.2)')).toBeNull();
    expect(normalizeHex('azul')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
});

describe('getContrastText', () => {
  it('escolhe preto em cores claras e branco em escuras', () => {
    expect(getContrastText('#ffffff')).toBe('#000000');
    expect(getContrastText('#000000')).toBe('#ffffff');
    expect(getContrastText('#F5A876')).toBe('#000000');
    expect(getContrastText('#FB7185')).toBe('#000000');
    expect(getContrastText('#3D2B1F')).toBe('#ffffff');
    expect(getContrastText('#ABC')).toBe('#000000');
  });
  it('usa branco para entrada inválida', () => {
    expect(getContrastText('nada')).toBe('#ffffff');
  });
});

describe('resolveButtonColors', () => {
  it('usa buttonStyle.color, depois colors.primary, depois #ffffff', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#112233' }, colors: { primary: '#445566' } }).bg).toBe('#112233');
    expect(resolveButtonColors({ buttonStyle: { type: 'solid' }, colors: { primary: '#445566' } }).bg).toBe('#445566');
    expect(resolveButtonColors({ buttonStyle: { type: 'solid' } }).bg).toBe('#ffffff');
  });
  it('texto automático: sólido por contraste, contorno = cor do botão, demais = colors.text', () => {
    const colors = { text: '#E2E8F0' };
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#ffffff' }, colors }).text).toBe('#000000');
    expect(resolveButtonColors({ buttonStyle: { type: 'outline', color: '#00FF88' }, colors }).text).toBe('#00ff88');
    for (const type of ['glass', 'modern', 'rounded'] as const) {
      expect(resolveButtonColors({ buttonStyle: { type, color: '#3B82F6' }, colors }).text).toBe('#e2e8f0');
    }
  });
  it('textColor "auto" equivale a ausente', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#000000', textColor: 'auto' } }).text).toBe('#ffffff');
  });
  it('textColor manual vale para todos os estilos', () => {
    for (const type of ['solid', 'outline', 'glass', 'modern', 'rounded'] as const) {
      expect(resolveButtonColors({ buttonStyle: { type, color: '#F5A876', textColor: '#3D2B1F' } }).text).toBe('#3d2b1f');
    }
  });
  it('sem colors.text, estilos translúcidos usam #ffffff', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'glass' } }).text).toBe('#ffffff');
  });
  it('sem buttonStyle, trata como glass', () => {
    expect(resolveButtonColors({ colors: { text: '#123456' } })).toEqual({ bg: '#ffffff', text: '#123456' });
  });
});

describe('getButtonRadius', () => {
  it('mapeia os tamanhos e usa 8px como padrão', () => {
    expect(getButtonRadius('none')).toBe('0px');
    expect(getButtonRadius('sm')).toBe('4px');
    expect(getButtonRadius('md')).toBe('8px');
    expect(getButtonRadius('lg')).toBe('16px');
    expect(getButtonRadius('full')).toBe('9999px');
    expect(getButtonRadius(undefined)).toBe('8px');
  });
  it('aplica radiusScale, exceto em full', () => {
    expect(getButtonRadius('lg', 0.4)).toBe('6.4px');
    expect(getButtonRadius('full', 0.4)).toBe('9999px');
  });
});

describe('getLinkButtonStyle', () => {
  it('sólido: fundo da cor, sem borda, texto por contraste', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#F5A876', borderRadius: 'lg' } })).toEqual({
      background: '#f5a876',
      borderWidth: '0px',
      borderStyle: 'solid',
      borderColor: '#f5a876',
      color: '#000000',
      borderRadius: '16px',
    });
  });
  it('contorno: transparente com borda de 2px', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#1A1A1A' } });
    expect(style.background).toBe('transparent');
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#1a1a1a');
    expect(style.color).toBe('#1a1a1a');
  });
  it('modern com #rgb gera sufixos de opacidade válidos', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'modern', color: '#ABC' } });
    expect(style.background).toBe('linear-gradient(135deg, #aabbcc20, #aabbcc40)');
    expect(style.borderColor).toBe('#aabbcc50');
    expect(style.borderWidth).toBe('1px');
  });
  it('glass: branco translúcido com borda de 1px', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'glass' }, colors: { text: '#ffffff' } });
    expect(style.background).toBe('rgba(255,255,255,0.1)');
    expect(style.borderColor).toBe('rgba(255,255,255,0.2)');
    expect(style.borderWidth).toBe('1px');
  });
  it('repassa radiusScale', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', borderRadius: 'lg' } }, { radiusScale: 0.4 }).borderRadius).toBe('6.4px');
  });
});

describe('getLinkButtonClassName', () => {
  it('não traz classes de borda nem de fundo', () => {
    for (const type of ['solid', 'outline', 'glass', 'modern', 'rounded', undefined]) {
      expect(getLinkButtonClassName(type)).not.toMatch(/(^|\s)(border|bg-)/);
    }
  });
});

describe('getBackgroundStyle', () => {
  it('gradiente 135° com reservas', () => {
    expect(getBackgroundStyle({ background: { type: 'gradient', colors: ['#111111', '#222222'] } })).toBe('linear-gradient(135deg, #111111, #222222)');
    expect(getBackgroundStyle({ background: { type: 'gradient' } })).toBe('linear-gradient(135deg, #111827, #1f2937)');
  });
  it('sólido usa color, depois colors[0], depois #111827', () => {
    expect(getBackgroundStyle({ background: { type: 'solid', color: '#abcdef' } })).toBe('#abcdef');
    expect(getBackgroundStyle({ background: { type: 'solid', colors: ['#FFFFFF'] } })).toBe('#FFFFFF');
    expect(getBackgroundStyle({ background: { type: 'solid' } })).toBe('#111827');
  });
  it('sem config usa #111827', () => {
    expect(getBackgroundStyle(null)).toBe('#111827');
  });
});
```

- [ ] **Passo 3: confirmar que falha**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts`.
Esperado: FAIL, com erro de import (o arquivo `./linkButtonStyle` não existe).

- [ ] **Passo 4: implementar**

Crie `src/utils/linkButtonStyle.ts`:

```ts
import type { CSSProperties } from 'react';
import type { ThemeConfig } from '@/stores/useDesignStore';

/** Parte da config que define o botão. Tudo opcional: dados antigos podem vir incompletos. */
export interface LinkButtonConfig {
  buttonStyle?: Partial<ThemeConfig['buttonStyle']>;
  colors?: ThemeConfig['colors'];
}

type BorderRadius = NonNullable<ThemeConfig['buttonStyle']['borderRadius']>;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** '#ABC' -> '#aabbcc'. Devolve null se não for hex válido. */
export function normalizeHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const value = color.trim();
  if (!HEX_RE.test(value)) return null;
  const hex = value.slice(1).toLowerCase();
  if (hex.length === 3) return `#${hex.split('').map((c) => c + c).join('')}`;
  return `#${hex}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Preto ou branco, o que tiver maior contraste (WCAG 2.x) com a cor dada. */
export function getContrastText(color: string | null | undefined): '#000000' | '#ffffff' {
  const hex = normalizeHex(color);
  if (!hex) return '#ffffff';
  const l = relativeLuminance(hex);
  return contrastRatio(l, 0) > contrastRatio(l, 1) ? '#000000' : '#ffffff';
}

/** Cor do botão e do texto do botão, já com reservas e modo automático. */
export function resolveButtonColors(config: LinkButtonConfig): { bg: string; text: string } {
  const bg = normalizeHex(config.buttonStyle?.color) ?? normalizeHex(config.colors?.primary) ?? '#ffffff';

  const textSetting = config.buttonStyle?.textColor;
  const manual = textSetting && textSetting !== 'auto' ? normalizeHex(textSetting) : null;
  if (manual) return { bg, text: manual };

  switch (config.buttonStyle?.type) {
    case 'solid':
      return { bg, text: getContrastText(bg) };
    case 'outline':
      return { bg, text: bg };
    default:
      return { bg, text: normalizeHex(config.colors?.text) ?? '#ffffff' };
  }
}

const RADIUS_PX: Record<BorderRadius, number> = { none: 0, sm: 4, md: 8, lg: 16, full: 9999 };

export function getButtonRadius(radius: string | undefined, radiusScale = 1): string {
  if (radius === 'full') return '9999px';
  const px = RADIUS_PX[radius as BorderRadius] ?? RADIUS_PX.md;
  return `${px * radiusScale}px`;
}

/** Estilo inline completo do botão de link. Única fonte de verdade para fundo, borda e cor. */
export function getLinkButtonStyle(config: LinkButtonConfig, options: { radiusScale?: number } = {}): CSSProperties {
  const { bg, text } = resolveButtonColors(config);
  const borderRadius = getButtonRadius(config.buttonStyle?.borderRadius, options.radiusScale ?? 1);

  switch (config.buttonStyle?.type) {
    case 'solid':
      return { background: bg, borderWidth: '0px', borderStyle: 'solid', borderColor: bg, color: text, borderRadius };
    case 'outline':
      return { background: 'transparent', borderWidth: '2px', borderStyle: 'solid', borderColor: bg, color: text, borderRadius };
    case 'modern':
    case 'rounded':
      return {
        background: `linear-gradient(135deg, ${bg}20, ${bg}40)`,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: `${bg}50`,
        color: text,
        borderRadius,
      };
    default:
      return {
        background: 'rgba(255,255,255,0.1)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.2)',
        color: text,
        borderRadius,
      };
  }
}

/** Classes que sobram depois do estilo inline (sem borda nem fundo). */
export function getLinkButtonClassName(type: string | undefined): string {
  return type === 'solid' || type === 'outline' ? 'hover:opacity-90' : 'backdrop-blur-sm hover:opacity-90';
}

/** Fundo da página do perfil. Mesma regra da página pública. */
export function getBackgroundStyle(config: Pick<Partial<ThemeConfig>, 'background'> | null | undefined): string {
  const background = config?.background;
  if (!background) return '#111827';
  if (background.type === 'gradient') {
    return `linear-gradient(135deg, ${background.colors?.[0] || '#111827'}, ${background.colors?.[1] || '#1f2937'})`;
  }
  return background.color || background.colors?.[0] || '#111827';
}
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts`.
Esperado: PASS, todos os testes verdes.

- [ ] **Passo 6: checar tipos**

Rode `npx tsc --noEmit -p tsconfig.app.json`. Esperado: saída vazia, código 0.

- [ ] **Passo 7: commit**

```powershell
git add src/stores/useDesignStore.ts src/utils/linkButtonStyle.ts src/utils/linkButtonStyle.test.ts
git commit -m "Cria módulo único de estilo dos botões de link" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 2: modelos do onboarding em arquivo próprio

**Arquivos:**
- Criar: `src/components/dashboard/onboardingTemplates.ts`
- Teste: `src/components/dashboard/onboardingTemplates.test.ts`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/components/dashboard/onboardingTemplates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { resolveButtonColors } from '@/utils/linkButtonStyle';

// Valores da tabela da seção 3 da especificação (já normalizados)
const ESPERADO: Record<string, { bg: string; text: string; pageText: string }> = {
  'warm-peach': { bg: '#f5a876', text: '#3d2b1f', pageText: '#3D2B1F' },
  'clean-white': { bg: '#1a1a1a', text: '#1a1a1a', pageText: '#1A1A1A' },
  'ocean-deep': { bg: '#22d3ee', text: '#ffffff', pageText: '#FFFFFF' },
  'sunset-warm': { bg: '#ffffff', text: '#ffffff', pageText: '#FFFFFF' },
  'midnight-dark': { bg: '#3b82f6', text: '#e2e8f0', pageText: '#E2E8F0' },
  'forest-green': { bg: '#10b981', text: '#6ee7b7', pageText: '#D1FAE5' },
  'cyber-neon': { bg: '#00ff88', text: '#00ff88', pageText: '#00FF88' },
  'rose-elegant': { bg: '#fb7185', text: '#ffffff', pageText: '#881337' },
  'sand-cream': { bg: '#d97706', text: '#fffbeb', pageText: '#78350F' },
  'purple-haze': { bg: '#d946ef', text: '#2d1b4e', pageText: '#2D1B4E' },
};

describe('ONBOARDING_TEMPLATES', () => {
  it('tem os 10 modelos da especificação', () => {
    expect(ONBOARDING_TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it.each(ONBOARDING_TEMPLATES.map((t) => [t.id, t] as const))('%s produz as cores da tabela', (id, template) => {
    const esperado = ESPERADO[id];
    expect(resolveButtonColors(template.config)).toEqual({ bg: esperado.bg, text: esperado.text });
    expect(template.config.colors.text).toBe(esperado.pageText);
  });

  it('colors.primary é igual à cor do botão', () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(t.config.colors.primary?.toLowerCase()).toBe(t.config.buttonStyle.color?.toLowerCase());
    }
  });

  it('nenhum botão sólido tem texto da mesma cor do fundo', () => {
    for (const t of ONBOARDING_TEMPLATES.filter((t) => t.config.buttonStyle.type === 'solid')) {
      const { bg, text } = resolveButtonColors(t.config);
      expect(text).not.toBe(bg);
    }
  });

  it('não carrega campos antigos de desenho', () => {
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/onboardingTemplates.test.ts`.
Esperado: FAIL, com erro de import.

- [ ] **Passo 3: implementar**

Crie `src/components/dashboard/onboardingTemplates.ts`:

```ts
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
```

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/components/dashboard/onboardingTemplates.test.ts`. Esperado: PASS.

- [ ] **Passo 5: commit**

```powershell
git add src/components/dashboard/onboardingTemplates.ts src/components/dashboard/onboardingTemplates.test.ts
git commit -m "Move modelos do onboarding para arquivo próprio com cores revisadas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 3: componente `TemplateMockup` no onboarding e na aba Modelos

**Arquivos:**
- Criar: `src/components/dashboard/TemplateMockup.tsx`
- Modificar: `src/components/dashboard/OnboardingDialog.tsx` (linhas 9, 43-271 e 623-630)
- Modificar: `src/components/dashboard/DesignTab.tsx` (linhas 17 e 461-529)

- [ ] **Passo 1: criar o componente**

Crie `src/components/dashboard/TemplateMockup.tsx`:

```tsx
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBackgroundStyle, getLinkButtonStyle } from '@/utils/linkButtonStyle';
import type { OnboardingTemplate } from './onboardingTemplates';

interface TemplateMockupProps {
  template: OnboardingTemplate;
  isSelected: boolean;
  onClick: () => void;
  /** Classes de tamanho, que mudam conforme o lugar onde o desenho aparece */
  className?: string;
}

/** Miniatura de celular gerada da própria config do modelo: o que aparece aqui é o que o perfil publica. */
export const TemplateMockup: React.FC<TemplateMockupProps> = ({ template, isSelected, onClick, className }) => {
  const textColor = template.config.colors.text || '#ffffff';
  const buttonStyle = getLinkButtonStyle(template.config, { radiusScale: 0.4 });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        isSelected ? 'ring-3 ring-primary shadow-xl scale-105' : 'ring-1 ring-border/30 hover:ring-primary/50',
        className
      )}
    >
      <div
        className="w-full h-full flex flex-col items-center pt-6 px-3 pb-3"
        style={{ background: getBackgroundStyle(template.config) }}
      >
        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white/50 mb-2" />
        <div
          className="text-[10px] font-bold mb-0.5 truncate w-full text-center"
          style={{ color: textColor, fontFamily: template.font }}
        >
          Seu Nome
        </div>
        <div className="text-[7px] opacity-70 mb-3 truncate w-full text-center" style={{ color: textColor }}>
          Sua bio aqui
        </div>
        <div className="w-full space-y-1.5">
          {['Meu site', 'YouTube', 'Instagram'].map((label) => (
            <div
              key={label}
              className="w-full h-5 flex items-center justify-center text-[7px] font-medium"
              style={{ ...buttonStyle, fontFamily: template.font }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm py-1">
        <p className="text-[9px] text-white text-center font-medium">{template.name}</p>
      </div>
    </button>
  );
};
```

- [ ] **Passo 2: usar no onboarding**

Em `src/components/dashboard/OnboardingDialog.tsx`:

1. Troque a linha 9 (`import { ThemeConfig } from '@/stores/useDesignStore';`) por:

```tsx
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { TemplateMockup } from './TemplateMockup';
```

2. Apague todo o bloco que vai de `export const ONBOARDING_TEMPLATES = [` (linha 43) até o fim do componente `PhoneMockup`: o `};` logo antes de `const PLATFORMS = [`, por volta da linha 271. Nada mais do arquivo usa o `PhoneMockup`.

3. No passo 3 do assistente (por volta da linha 624), troque:

```tsx
                <PhoneMockup
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                />
```

por:

```tsx
                <TemplateMockup
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className="flex-shrink-0 w-full max-w-[130px] h-[220px] sm:max-w-[140px] sm:h-[240px]"
                />
```

As linhas que gravam `{ themeId: template.id, custom: template.config }` (por volta de 378-380 e 446-447) continuam iguais.

- [ ] **Passo 3: usar na aba Modelos**

Em `src/components/dashboard/DesignTab.tsx`:

1. Troque a linha 17 por:

```tsx
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { TemplateMockup } from '@/components/dashboard/TemplateMockup';
```

2. Troque todo o `{ONBOARDING_TEMPLATES.map((template) => { ... })}` dentro de `<TabsContent value="templates">` (de `{ONBOARDING_TEMPLATES.map((template) => {`, na linha 461, até o `})}` que fecha o map, na linha 529) por:

```tsx
            {ONBOARDING_TEMPLATES.map((template) => (
              <TemplateMockup
                key={template.id}
                template={template}
                isSelected={selectedTheme === template.id}
                onClick={() => {
                  setSelectedTheme(template.id);
                  setCurrentTheme(template.id);
                  setCustomTheme(template.config);
                  setCustomConfig(template.config);
                }}
                className="w-full h-[220px] sm:h-[240px]"
              />
            ))}
```

- [ ] **Passo 4: conferir que não sobrou referência aos campos antigos**

Procure com Grep por `btnBg|btnText|btnRadius|PhoneMockup` só em `src/components/dashboard/OnboardingDialog.tsx`, `src/components/dashboard/DesignTab.tsx` e `src/components/dashboard/TemplateMockup.tsx`.
Esperado: nenhum resultado. Em `src` como um todo vão aparecer outros resultados, e eles não são erro. `src/pages/ExampleProfile.tsx` tem uma variável local `btnBg` sem relação com os modelos. `onboardingTemplates.test.ts` cita esses nomes de propósito. Não mexa nesses arquivos.

- [ ] **Passo 5: tipos, testes e build**

Rode, nesta ordem:

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; todos os testes passando; build terminando com `✓ built in`.

- [ ] **Passo 6: commit**

```powershell
git add src/components/dashboard/TemplateMockup.tsx src/components/dashboard/OnboardingDialog.tsx src/components/dashboard/DesignTab.tsx
git commit -m "Gera o desenho dos modelos a partir da própria config" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: página pública e prévia com o módulo único

**Arquivos:**
- Modificar: `src/pages/PublicProfile.tsx` (linhas 10, 184-261 e 439-446)
- Modificar: `src/components/dashboard/ProfilePreview.tsx` (linhas 10, 80-149 e 382-389)

- [ ] **Passo 1: PublicProfile, import**

Depois da linha 10 (`import { resolveThemeConfig } from '@/utils/themes';`), adicione:

```tsx
import { getBackgroundStyle, getLinkButtonClassName, getLinkButtonStyle } from '@/utils/linkButtonStyle';
```

- [ ] **Passo 2: PublicProfile, estilos**

Troque o bloco que vai de `const getThemeStyles = () => {` (linha 184) até o fim de `getButtonStyle` (o `};` da linha 261, logo antes de `const getIconComponent`) por:

```tsx
  const getThemeStyles = () => {
    const resolved = resolveThemeConfig(profile?.theme_options as Record<string, any> | null);
    const config = resolved ?? { colors: { text: '#ffffff' } };

    return {
      background: getBackgroundStyle(resolved),
      buttonStyle: resolved?.buttonStyle?.type || 'glass',
      buttonSize: resolved?.buttonStyle?.size || 'md',
      linkButtonStyle: getLinkButtonStyle(config),
      font: resolved?.font,
      colors: config.colors,
    };
  };
```

- [ ] **Passo 3: PublicProfile, botão do link**

No `links.map`, troque:

```tsx
                    className={`w-full ${(themeStyles as any).buttonSize === 'sm' ? 'h-10' : (themeStyles as any).buttonSize === 'lg' ? 'h-14' : 'h-12'} ${getButtonClassName(themeStyles.buttonStyle, themeStyles.colors)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200 text-lg`}
                    style={{
                      ...getButtonStyle(themeStyles.buttonStyle, themeStyles.colors),
                      borderRadius: (themeStyles as any).buttonBorderRadius === 'none' ? '0px' : (themeStyles as any).buttonBorderRadius === 'sm' ? '4px' : (themeStyles as any).buttonBorderRadius === 'lg' ? '16px' : (themeStyles as any).buttonBorderRadius === 'full' ? '9999px' : '8px',
                    }}
```

por:

```tsx
                    className={`w-full ${themeStyles.buttonSize === 'sm' ? 'h-10' : themeStyles.buttonSize === 'lg' ? 'h-14' : 'h-12'} ${getLinkButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200 text-lg`}
                    style={themeStyles.linkButtonStyle}
```

- [ ] **Passo 4: ProfilePreview, import**

Depois da linha 10 (`import { useDesignStore } from '@/stores/useDesignStore';`), adicione:

```tsx
import { getBackgroundStyle, getLinkButtonClassName, getLinkButtonStyle } from '@/utils/linkButtonStyle';
```

- [ ] **Passo 5: ProfilePreview, estilos**

Troque o bloco que vai de `const getThemeStyles = () => {` (linha 80) até o fim de `getButtonStyle` (o `};` da linha 149, logo antes de `const getIconComponent`) por:

```tsx
  const getThemeStyles = () => {
    // Sempre usar o customTheme do store para preview em tempo real
    const custom = customTheme;

    return {
      background: getBackgroundStyle(custom),
      buttonStyle: custom.buttonStyle?.type || 'glass',
      buttonSize: custom.buttonStyle?.size || 'md',
      linkButtonStyle: getLinkButtonStyle(custom),
      font: custom.font || { family: 'inter', size: 'md', weight: 'normal' },
      colors: custom.colors || { primary: '#ffffff', secondary: '#f3f4f6', accent: '#3b82f6', text: '#ffffff' },
    };
  };
```

- [ ] **Passo 6: ProfilePreview, botão do link**

No `links.map`, troque:

```tsx
                      className={`w-full ${themeStyles.buttonSize === 'sm' ? 'h-10' : themeStyles.buttonSize === 'lg' ? 'h-14' : 'h-12'} ${getButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200`}
                      style={{
                        ...getButtonStyle(themeStyles.buttonStyle),
                        borderRadius: themeStyles.buttonBorderRadius === 'none' ? '0px' : themeStyles.buttonBorderRadius === 'sm' ? '4px' : themeStyles.buttonBorderRadius === 'lg' ? '16px' : themeStyles.buttonBorderRadius === 'full' ? '9999px' : '8px',
                      }}
```

por:

```tsx
                      className={`w-full ${themeStyles.buttonSize === 'sm' ? 'h-10' : themeStyles.buttonSize === 'lg' ? 'h-14' : 'h-12'} ${getLinkButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200`}
                      style={themeStyles.linkButtonStyle}
```

- [ ] **Passo 7: conferir que não sobrou nada**

Procure com Grep por `getButtonStyle|getButtonClassName|buttonBorderRadius` em `src/pages/PublicProfile.tsx` e `src/components/dashboard/ProfilePreview.tsx`.
Esperado: nenhum resultado.

- [ ] **Passo 8: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 9: commit**

```powershell
git add src/pages/PublicProfile.tsx src/components/dashboard/ProfilePreview.tsx
git commit -m "Página pública e prévia usam o mesmo estilo de botão e fundo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: aba Design, cor do texto do botão e correção do save

**Arquivos:**
- Modificar: `src/components/dashboard/DesignTab.tsx` (imports, `handleSaveTheme` em 147-179, sub-aba Botões em 383-445, botões de salvar em 450 e 532)

- [ ] **Passo 1: imports**

Junto aos demais imports do topo, adicione:

```tsx
import { Switch } from '@/components/ui/switch';
import { normalizeHex, resolveButtonColors } from '@/utils/linkButtonStyle';
```

- [ ] **Passo 2: save sempre com a config da tela**

Troque o começo de `handleSaveTheme`:

```tsx
  const handleSaveTheme = async () => {
    if (!user) return;

    setLoading(true);

    // Always save custom config — onboarding templates also use it
    const isPredefined = PREDEFINED_THEMES.some(t => t.id === selectedTheme);
    const themeOptions = {
      themeId: selectedTheme,
      custom: selectedTheme === 'custom' || !isPredefined ? customConfig : (PREDEFINED_THEMES.find(t => t.id === selectedTheme)?.config || null),
    };
```

por:

```tsx
  // Recebe o id por parâmetro para não depender de estado ainda não atualizado.
  // Grava sempre a config que está na tela (modelos e edição manual usam customConfig).
  const handleSaveTheme = async (themeId: string) => {
    if (!user) return;

    setLoading(true);

    // Grava a cor efetiva do botão em buttonStyle.color, inclusive quando ela vinha da reserva colors.primary
    const custom = {
      ...customConfig,
      buttonStyle: { ...customConfig.buttonStyle, color: resolveButtonColors(customConfig).bg },
    };
    const themeOptions = { themeId, custom };
```

O resto da função não muda. (`resolveButtonColors` vem do import do passo 1.)

- [ ] **Passo 3: chamadas do save**

Na linha 450, troque `handleSaveTheme();` por `handleSaveTheme('custom');`. A linha fica:

```tsx
          <Button onClick={() => { if (selectedTheme !== 'custom') handleThemeSelect('custom'); handleSaveTheme('custom'); }} disabled={loading} className="w-full btn-gradient-primary hover-bounce">
```

Na linha 532, troque `onClick={handleSaveTheme}` por `onClick={() => handleSaveTheme(selectedTheme)}`.

- [ ] **Passo 4: valores calculados para a sub-aba Botões**

Logo antes do `return (` do componente (por volta da linha 204), adicione:

```tsx
  const buttonColors = resolveButtonColors(customConfig);
  // Só undefined e 'auto' contam como automático: apagar o campo manual não pode religar o interruptor
  const isAutoButtonText = customConfig.buttonStyle.textColor === undefined || customConfig.buttonStyle.textColor === 'auto';
  const manualButtonText = normalizeHex(customConfig.buttonStyle.textColor) ?? buttonColors.text;
```

- [ ] **Passo 5: "Cor do Botão" mostra a cor efetiva**

Nos dois `Input` de "Cor do Botão" (linhas 387-388), o `value={customConfig.buttonStyle.color || '#3b82f6'}` muda assim:
- no `type="color"` (linha 387): `value={buttonColors.bg}`, porque o seletor exige `#rrggbb`;
- no `type="text"` (linha 388): `value={customConfig.buttonStyle.color ?? buttonColors.bg}`. Assim, valores intermediários enquanto se digita (`#`, `#12`) não são trocados pela cor de reserva.

O `onChange` dos dois continua igual.

- [ ] **Passo 6: controle novo e remoção de Primária/Destaque**

Troque todo o bloco `<div className="space-y-4">` que contém o título "Cores do Tema" (linhas 424-445, da abertura `<div className="space-y-4">` até o `</div>` que fecha o grid de "Cor Primária" e "Cor de Destaque") por:

```tsx
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="button-text-auto" className="text-sm">Cor do texto do botão</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Automático</span>
                          <Switch
                            id="button-text-auto"
                            checked={isAutoButtonText}
                            onCheckedChange={(checked) =>
                              updateCustomConfig('buttonStyle', { textColor: checked ? 'auto' : buttonColors.text })
                            }
                          />
                        </div>
                      </div>
                      {isAutoButtonText ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          Sólido: preto ou branco, o que for mais legível. Contorno: a cor do botão. Demais estilos: a cor do texto da página.
                        </p>
                      ) : (
                        <div className="flex items-center space-x-2 mt-2">
                          <Input type="color" value={manualButtonText} onChange={(e) => updateCustomConfig('buttonStyle', { textColor: e.target.value })} className="w-12 h-10 p-1 rounded" />
                          <Input type="text" value={customConfig.buttonStyle.textColor} onChange={(e) => updateCustomConfig('buttonStyle', { textColor: e.target.value })} className="flex-1" />
                        </div>
                      )}
                    </div>
```

- [ ] **Passo 7: conferir que Primária e Destaque saíram da tela**

Procure com Grep (regex) por `Cor Primária|Cor de Destaque|colors\?\.primary|colors\?\.accent` em `src/components/dashboard/DesignTab.tsx`. Os `\?\.` escapados são necessários; sem eles, a regex não casa o texto literal.
Esperado: nenhum resultado.

- [ ] **Passo 8: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 9: commit**

```powershell
git add src/components/dashboard/DesignTab.tsx
git commit -m "Adiciona cor do texto do botão e corrige salvamento da aba Design" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: remover o Design System

**Arquivos:**
- Apagar: `src/components/design-system/` (pasta inteira), `src/components/dashboard/DesignSystemTab.tsx`, `src/stores/designStore.ts`, `src/types/design-system.ts`, `src/hooks/useResizable.ts`
- Modificar: `src/pages/Dashboard.tsx` (linhas 9, 118, 120, 122, 132-134 e 149)

- [ ] **Passo 1: confirmar que nada de fora usa esses arquivos**

Procure com Grep, em `src`, excluindo os próprios arquivos a apagar, por: `design-system`, `designStore`, `DesignSystemTab`, `useResizable`.
Esperado: só `src/pages/Dashboard.tsx` (import e uso de `DesignSystemTab`). Se aparecer outro arquivo, pare e reporte.

- [ ] **Passo 2: limpar o Dashboard**

Em `src/pages/Dashboard.tsx`:
- apague a linha 9: `import { DesignSystemTab } from '@/components/dashboard/DesignSystemTab';`
- apague o bloco das linhas 132-134:

```tsx
                        <TabsContent value="design-v2" className="mt-0 p-0">
                          <DesignSystemTab profile={profile} onProfileUpdate={loadProfile} />
                        </TabsContent>
```

- nas linhas 118, 120 e 122, troque `activeTab === 'analytics' || activeTab === 'design-v2'` por `activeTab === 'analytics'`;
- na linha 149, troque `activeTab !== 'analytics' && activeTab !== 'design-v2'` por `activeTab !== 'analytics'`.

- [ ] **Passo 3: apagar os arquivos**

```powershell
git rm -r -q src/components/design-system src/components/dashboard/DesignSystemTab.tsx src/stores/designStore.ts src/types/design-system.ts src/hooks/useResizable.ts
```

- [ ] **Passo 4: conferir**

Procure com Grep por `design-v2|DesignSystemTab|designStore|design-system|useResizable` em `src`. Esperado: nenhum resultado.

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 5: commit**

```powershell
git add src/pages/Dashboard.tsx
git commit -m "Remove o editor Design System, que não salvava nem aparecia no menu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 7: sidebar em janela estreita

Use @superpowers:systematic-debugging no passo 1. Corrija a causa antes de mexer no resto.

**Arquivos:**
- Modificar: `src/components/dashboard/AppSidebar.tsx` (linhas 40-45, 88, 115 e 137)
- Outros, conforme o diagnóstico do passo 1

- [ ] **Passo 1: reproduzir e achar a causa**

1. Peça ao usuário para abrir `https://linkhub.avila.ia.br/auth` no navegador embutido (`mcp__Claude_Browser__preview_start` com `url`) e fazer login. Quem digita a senha ou usa o Google é ele, nunca o agente.
2. Com o painel aberto em `/dashboard`, use `mcp__Claude_Browser__resize_window` com `width: 600, height: 900`, recarregue a página e clique no botão do topo (o `SidebarTrigger`, ao lado do título).
3. Registre o que acontece. Use `mcp__Claude_Browser__read_page` para ver se o `SheetContent` (`data-mobile="true"`) entra no DOM, `mcp__Claude_Browser__read_console_messages` para erros, e `mcp__Claude_Browser__javascript_tool` para inspecionar posição e tamanho, por exemplo com `document.querySelector('[data-mobile="true"]')?.getBoundingClientRect()`.
4. Repita em 375 e em 767 px de largura.
5. Escreva a causa encontrada, com evidência, antes de corrigir. Hipóteses a testar: o painel abre fora da tela ou sem largura (variável CSS `--sidebar-width` não aplicada); o `Sheet` abre e fecha no mesmo clique; o estado `collapsed` esconde todos os rótulos e deixa o painel vazio; erro de JavaScript ao abrir.
6. Volte a largura com `resize_window` `preset: "desktop"`.

- [ ] **Passo 2: corrigir a causa**

Aplique a correção mínima da causa achada no passo 1. Se a causa estiver no `AppSidebar`, os passos 3 a 5 podem já cobri-la. Se estiver em `src/components/ui/sidebar.tsx` ou `sheet.tsx`, corrija ali e explique no commit.

- [ ] **Passo 3: rótulos no painel móvel e fechar ao escolher**

Em `src/components/dashboard/AppSidebar.tsx`, troque:

```tsx
  const { state } = useSidebar();
```

por:

```tsx
  const { state, isMobile, setOpenMobile } = useSidebar();
```

Troque:

```tsx
  const isCollapsed = state === 'collapsed';
```

por:

```tsx
  // No painel móvel os rótulos sempre aparecem, mesmo que a barra do desktop esteja recolhida
  const isCollapsed = state === 'collapsed' && !isMobile;
```

Depois de `handleSignOut`, adicione:

```tsx
  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) setOpenMobile(false);
  };
```

Nos dois `SidebarMenuButton` (dos `menuItems` e dos `analyticsItems`), troque `onClick={() => onTabChange(item.id)}` por `onClick={() => handleTabChange(item.id)}`.

- [ ] **Passo 4: larguras do componente**

Troque:

```tsx
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'} collapsible="icon">
```

por:

```tsx
    <Sidebar collapsible="icon">
```

- [ ] **Passo 5: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 6: verificar localmente**

1. Inicie o servidor de desenvolvimento com `mcp__Claude_Browser__preview_start`. Se `.claude/launch.json` não existir, crie com uma configuração `linkhub-dev`: `runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 8080`.
2. Peça ao usuário para entrar em `http://localhost:8080/auth` com email e senha. O login com Google não volta para localhost, porque localhost não está nos redirects do GoTrue.
3. Em `/dashboard`, verifique:
   - em 375, 600 e 767 px: o botão abre o painel com os nomes dos menus, e escolher "Design" troca a aba e fecha o painel;
   - em 900 e 1280 px: a barra fica fixa, o botão alterna entre aberta e só ícones, e o conteúdo não fica escondido nem com sobra em branco.
4. Volte a largura para `preset: "desktop"`.

Se o usuário não puder logar localmente, faça essa verificação depois do deploy da Tarefa 9, em produção.

- [ ] **Passo 7: commit**

```powershell
git add src/components/dashboard/AppSidebar.tsx
git commit -m "Corrige sidebar em janela estreita" -m "<causa encontrada no passo 1, em uma frase>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Inclua no `git add` qualquer outro arquivo alterado no passo 2.

---

### Tarefa 8: perfil público leve

**Arquivos:**
- Criar: `src/lib/serviceWorkerRoutes.ts`, `src/lib/serviceWorkerRoutes.test.ts`, `src/registerServiceWorker.ts`
- Modificar: `src/App.tsx`, `src/main.tsx`, `src/vite-env.d.ts`, `vite.config.ts:13-14`

- [ ] **Passo 1: medir o tamanho atual**

```powershell
npm run build
```

Anote o tamanho do `dist/assets/index-*.js` mostrado pelo build (hoje cerca de 1.525 kB, ou 427 kB em gzip). Hoje esse é todo o JS que `/:username` baixa.

- [ ] **Passo 2: escrever o teste da regra de rota**

Crie `src/lib/serviceWorkerRoutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isPublicProfilePath } from './serviceWorkerRoutes';

describe('isPublicProfilePath', () => {
  it('reconhece /:username como perfil público', () => {
    expect(isPublicProfilePath('/dna')).toBe(true);
    expect(isPublicProfilePath('/dna/')).toBe(true);
    expect(isPublicProfilePath('/Maria_Silva')).toBe(true);
  });
  it('não trata rotas do app como perfil', () => {
    for (const path of ['/', '', '/auth', '/auth/callback', '/dashboard', '/admin', '/analytics', '/exemplo', '/install', '/privacy', '/Dashboard']) {
      expect(isPublicProfilePath(path)).toBe(false);
    }
  });
});
```

- [ ] **Passo 3: confirmar que falha**

Rode `npx vitest run src/lib/serviceWorkerRoutes.test.ts`. Esperado: FAIL, com erro de import.

- [ ] **Passo 4: implementar a regra**

Crie `src/lib/serviceWorkerRoutes.ts`:

```ts
/**
 * Primeiro segmento de cada rota do app que não é perfil público.
 * Mantenha em sincronia com as <Route> de src/App.tsx.
 */
export const APP_ROUTE_SEGMENTS = ['auth', 'dashboard', 'admin', 'analytics', 'exemplo', 'install', 'privacy'] as const;

/** true quando o caminho é /:username (um segmento que não é rota do app). */
export function isPublicProfilePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;
  return !(APP_ROUTE_SEGMENTS as readonly string[]).includes(segments[0].toLowerCase());
}
```

Rode `npx vitest run src/lib/serviceWorkerRoutes.test.ts`. Esperado: PASS.

- [ ] **Passo 5: registro manual do service worker**

Em `vite.config.ts`, dentro de `VitePWA({`, logo depois de `registerType: 'autoUpdate',`, adicione:

```ts
      // O registro é feito em src/registerServiceWorker.ts, só fora do perfil público
      injectRegister: false,
```

Em `src/vite-env.d.ts`, adicione na segunda linha:

```ts
/// <reference types="vite-plugin-pwa/client" />
```

Crie `src/registerServiceWorker.ts`:

```ts
import { isPublicProfilePath } from '@/lib/serviceWorkerRoutes';

/**
 * O visitante de /:username não precisa do app instalável. Sem o service worker,
 * ele não baixa em segundo plano os arquivos do painel.
 */
export function registerServiceWorkerOutsidePublicProfile(pathname: string = window.location.pathname): void {
  if (isPublicProfilePath(pathname)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((error) => console.error('Falha ao registrar o service worker:', error));
}
```

Troque `src/main.tsx` por:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorkerOutsidePublicProfile } from './registerServiceWorker'

createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorkerOutsidePublicProfile();
```

- [ ] **Passo 6: rotas sob demanda**

Em `src/App.tsx`:

1. Troque `import React from "react";` por `import React, { Suspense, lazy } from "react";`.
2. Troque os 11 imports de páginas (de `import Index from "./pages/Index";` até `import Privacy from "./pages/Privacy";`) por:

```tsx
// Cada página vira um arquivo separado: quem abre /:username não baixa painel, admin nem gráficos.
// Ao criar rota nova, atualize também APP_ROUTE_SEGMENTS em src/lib/serviceWorkerRoutes.ts.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Analytics = lazy(() => import("./pages/Analytics"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ExampleProfile = lazy(() => import("./pages/ExampleProfile"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const Privacy = lazy(() => import("./pages/Privacy"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
  </div>
);
```

3. Envolva o `<Routes>` com `<Suspense>`:

```tsx
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* rotas inalteradas */}
              </Routes>
            </Suspense>
          </BrowserRouter>
```

As `<Route>` continuam exatamente como estão; só ganham um nível de indentação.

- [ ] **Passo 7: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tudo verde. O build lista vários JS (`Dashboard-*.js`, `Analytics-*.js`, `PublicProfile-*.js` etc.) e ainda gera `dist/sw.js`. Confira que `dist/index.html` não tem mais `registerSW.js`, com `Select-String -Path dist/index.html -Pattern registerSW`, que não deve retornar nada.

- [ ] **Passo 8: medir o perfil público numa visita limpa**

1. Rode `npm run preview` em segundo plano (porta 4173). Ele usa o `.env` de produção.
2. Abra `http://localhost:4173/dna` no navegador embutido (`preview_start` com `url`). O perfil público não precisa de login.
3. Pegue a lista de JS carregados com `mcp__Claude_Browser__javascript_tool`:

```js
performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js')).map(e => new URL(e.name).pathname)
```

4. Confirme que a lista não tem `Dashboard-`, `Admin-`, `Analytics-` nem chunks com `recharts` ou `react-simple-maps`. Confirme também que não há service worker: `navigator.serviceWorker.getRegistrations().then(r => r.length)` deve dar `0`.
5. Some os tamanhos em gzip desses arquivos, passando os caminhos para este script (troque a lista):

```powershell
node -e "const fs=require('fs'),z=require('zlib');const files=process.argv.slice(1);let t=0;for(const f of files){const n=z.gzipSync(fs.readFileSync('dist'+f)).length;t+=n;console.log(f,(n/1024).toFixed(1)+' kB')}console.log('TOTAL',(t/1024).toFixed(1)+' kB gzip')" /assets/index-XXXX.js /assets/PublicProfile-XXXX.js
```

6. Só depois de medir: abra `http://localhost:4173/dashboard` e confirme que `navigator.serviceWorker.getRegistrations()` passa a ter 1 registro (pode levar alguns segundos). A partir daqui, o service worker fica registrado na origem `localhost:4173`. Para repetir a medição do passo 3, remova antes o registro (`navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`) e recarregue.
7. Pare o preview.

Depois do build há mais de um `index-*.js`, e a entrada é o que está em `dist/index.html`. Use sempre os nomes vindos da lista do `performance`.

- [ ] **Passo 9: commit com os números**

```powershell
git add src/App.tsx src/main.tsx src/vite-env.d.ts vite.config.ts src/registerServiceWorker.ts src/lib/serviceWorkerRoutes.ts src/lib/serviceWorkerRoutes.test.ts
git commit -m "Perfil público baixa só o necessário" -m "Rotas sob demanda e service worker fora de /:username. JS do perfil público: antes <X> kB gzip, depois <Y> kB gzip." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 9: verificação final e deploy

- [ ] **Passo 1: suíte completa**

```powershell
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 2: conferir os dados antes do deploy**

Refaça a consulta da especificação, enviando o SQL pela entrada padrão:

```powershell
@'
SELECT username, theme_options->'custom'->'buttonStyle'->>'color' AS cor,
       theme_options->'custom'->'colors'->>'primary' AS primaria
FROM linkhub.profiles;
'@ | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres'
```

Se algum perfil tiver `cor` diferente de `primaria`, pare e avise o usuário: o botão desse perfil vai mudar de cor.

- [ ] **Passo 3: deploy** (procedimento "Atualizações futuras" do `deploy/vpsavila/DEPLOY.md`)

```powershell
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -mindepth 1 -delete'
scp -r dist/* avila@192.168.1.24:~/docker/linkhub-frontend/html/
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend/html -type f -exec chmod 644 {} + && docker inspect --format "{{.State.Health.Status}}" linkhub-nginx'
```

Esperado: `healthy`. Confira que `https://linkhub.avila.ia.br` serve o `index-*.js` novo, comparando o nome do arquivo em `dist/index.html` com o HTML servido.

- [ ] **Passo 4: verificação no navegador, com login do usuário**

1. Aba Design → Botões: ligue e desligue "Automático", escolha uma cor de texto, salve, recarregue e confirme que persistiu. Confira que o perfil público mostra a cor.
2. Aba Design → Modelos: clique em Peach, salve e abra o perfil público. O botão deve sair pêssego (`#F5A876`) com texto marrom (`#3D2B1F`), igual à miniatura.
3. Restaure o visual que o usuário tinha antes (glass com `#22D3EE`) ou pergunte se ele quer manter o novo.
4. Sidebar em 600 px e em 1280 px, se a Tarefa 7 não tiver sido verificada localmente.

- [ ] **Passo 5: commit final, se algo mudou**

Se os passos acima geraram ajustes, faça commit deles com uma mensagem descritiva. Não faça push sem o usuário pedir.
