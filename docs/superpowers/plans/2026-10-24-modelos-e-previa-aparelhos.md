# Mais modelos visuais e prévia por aparelho — plano de implementação

> **Para agentes executores:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** 12 modelos visuais novos em quatro estilos, recursos visuais novos no perfil (fonte na página pública, padrão de fundo, gradiente animado, sombra/brilho no botão, formato do avatar) e prévia do perfil dentro de um aparelho real escolhido (iPhone ou Galaxy), também em tela estreita.

**Arquitetura:** funções puras novas em `src/utils/profileAppearance.ts` (fundo, padrão, avatar, fonte) e a sombra em `src/utils/linkButtonStyle.ts`. Um componente único, `src/components/profile/ProfileView.tsx`, desenha o perfil para a página pública (`variant="page"`) e para a prévia (`variant="device"`). A prévia passa a ser uma coluna com seletor de aparelho e uma moldura desenhada em CSS (`DeviceFrame`), com a tela no tamanho real reduzida por `transform: scale(f)`. Os modelos ganham categoria e filtros. Em tela estreita, um botão "Prévia" abre a mesma prévia num `Dialog` de tela cheia.

**Stack:** React 18, Vite 5, TypeScript (`strict: false`), shadcn/ui, Zustand, Supabase, Vitest 2 com Testing Library e jsdom, vite-plugin-pwa.

**Especificação:** `docs/superpowers/specs/2026-10-24-modelos-e-previa-aparelhos-design.md`

**Convenções do ambiente (Windows):**
- Os comandos rodam no PowerShell, na raiz do repositório.
- `ssh` perde aspas duplas internas: use aspas simples por fora.
- Cada commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Responda e escreva commits em português.
- Vários arquivos de `src` estão com CRLF na cópia de trabalho (`core.autocrlf=true`). As trocas de trecho deste plano valem pelo texto; a ferramenta Edit cuida do final de linha.
- Se o `npm test` falhar com `Error: UNKNOWN: unknown error, open '...\ssr\...'` e mostrar menos arquivos de teste que o esperado, é falha intermitente do cache temporário do Vitest no Windows, não do código: rode de novo. Só conte a contagem de referência de uma execução sem esse erro.
- Push não faz parte de nenhuma tarefa.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/stores/useDesignStore.ts` | Modificar | `ThemeConfig`: `background.pattern` tipado, `background.animated`, `buttonStyle.shadow`/`shadowColor`, bloco `avatar` |
| `src/utils/linkButtonStyle.ts` | Modificar | Sombra `soft`/`hard`/`glow` no `getLinkButtonStyle` |
| `src/utils/linkButtonStyle.test.ts` | Modificar | Testes da sombra |
| `src/utils/profileAppearance.ts` | Criar | Padrão, camada de fundo, cor base, formato do avatar, mapa de fontes, peso e tamanho |
| `src/utils/profileAppearance.test.ts` | Criar | Testes do módulo acima |
| `src/index.css` | Modificar | Keyframes `linkhub-gradient-shift`, classe `.linkhub-gradient-animated`, bloco `prefers-reduced-motion` |
| `src/components/profile/linkIcons.tsx` | Criar | `ICON_MAP` e `getLinkIcon`, tirados das duas cópias |
| `src/components/profile/ProfileView.tsx` | Criar | Perfil único (`page` e `device`) |
| `src/components/profile/ProfileView.test.tsx` | Criar | Testes do perfil |
| `src/pages/PublicProfile.tsx` | Modificar | Renderiza `ProfileView variant="page"` |
| `src/components/dashboard/ProfilePreview.tsx` | Reescrever (2 vezes) | Tarefa 4: `ProfileView` na moldura antiga. Tarefa 10: coluna com seletor e aparelho |
| `src/components/dashboard/ProfilePreview.test.tsx` | Criar | Links sem recarga por tema e prévia sem registrar clique |
| `src/components/dashboard/DesignTab.tsx` | Modificar | Padrão em qualquer fundo, "Animado", "Sombra", "Formato" do avatar, mapa único de fontes, filtros da aba Modelos |
| `src/components/dashboard/onboardingTemplates.ts` | Modificar | `category`, sem `font`, 12 modelos novos, filtros |
| `src/components/dashboard/onboardingTemplates.test.ts` | Modificar | Categoria, 22 modelos, tabela dos novos, filtros |
| `src/components/dashboard/TemplateMockup.tsx` | Reescrever | Miniatura com fundo animado, padrão, sombra, fonte e avatar |
| `src/components/dashboard/TemplateCategoryChips.tsx` | Criar | Linha de chips de categoria |
| `src/components/dashboard/TemplateCategoryChips.test.tsx` | Criar | Teste dos chips |
| `src/components/dashboard/OnboardingDialog.tsx` | Modificar | Chips no passo 3 |
| `src/components/preview/devices.ts` | Criar | Catálogo dos 7 aparelhos, tamanho total e escala |
| `src/components/preview/devices.test.ts` | Criar | Testes do catálogo |
| `src/components/preview/DeviceFrame.tsx` | Criar | Moldura, recorte, barra de status, tela e escala |
| `src/components/preview/DeviceFrame.test.tsx` | Criar | Testes da moldura (f = 1 no jsdom) |
| `src/components/preview/DeviceSelect.tsx` | Criar | `Select` agrupado por marca |
| `src/hooks/useSelectedDevice.ts` | Criar | Aparelho lembrado em `localStorage` |
| `src/hooks/useSelectedDevice.test.ts` | Criar | Testes do hook |
| `src/pages/Dashboard.tsx` | Modificar | Coluna da prévia com altura definida; botão "Prévia" e `Dialog` em tela estreita |

Testes existentes: `AppSidebar.test.tsx`, `useAutosave.test.ts`, `ChunkErrorBoundary.test.tsx` e `serviceWorkerRoutes.test.ts` não são tocados e continuam passando. `linkButtonStyle.test.ts` só ganha testes no fim; o teste antigo `sólido: fundo da cor, sem borda...` usa `toEqual` e continua passando porque, sem `shadow`, o estilo não ganha a chave `boxShadow`. `onboardingTemplates.test.ts` muda de propósito nas Tarefas 6, 7 e 8 (explicado em cada uma).

Contagem de referência de `npm test` (arquivos / testes) ao fim de cada tarefa: antes 6/49; T1 6/56; T2 7/78; T3 8/86; T4 9/90; T5 9/90; T6 9/92; T7 9/121; T8 10/125; T9 13/153; T10 13/153.

---

### Tarefa 1: tipos novos do tema e sombra do botão

**Arquivos:**
- Modificar: `src/stores/useDesignStore.ts` (interface `ThemeConfig`, linhas 3-30)
- Modificar: `src/utils/linkButtonStyle.ts` (`getLinkButtonStyle`, linhas 70-100)
- Teste: `src/utils/linkButtonStyle.test.ts` (acrescentar no fim)

- [ ] **Passo 1: ampliar o tipo**

Em `src/stores/useDesignStore.ts`, troque:

```ts
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
    /** 'auto' (padrão quando ausente) ou uma cor hex */
    textColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    size?: 'sm' | 'md' | 'lg';
  };
```

por:

```ts
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
```

E, no fim da mesma interface, troque:

```ts
    text?: string;
    avatarBorder?: string;
  };
}
```

por:

```ts
    text?: string;
    avatarBorder?: string;
  };
  /** Ausente: círculo */
  avatar?: {
    shape?: 'circle' | 'rounded' | 'hexagon';
  };
}
```

Todos os campos novos são opcionais: ausente significa o comportamento atual. O único lugar que grava `pattern` hoje (`DesignTab.tsx`, `updateCustomConfig('background', { pattern: pattern.id })`) recebe `any`, então o tipo mais estreito não quebra nada.

- [ ] **Passo 2: escrever os testes que falham**

Acrescente ao fim de `src/utils/linkButtonStyle.test.ts` (os imports do topo já trazem `getLinkButtonStyle`):

```ts
describe('getLinkButtonStyle, sombra', () => {
  it('sem shadow ou com none não gera boxShadow', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ffffff' } }).boxShadow).toBeUndefined();
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ffffff', shadow: 'none' } }).boxShadow).toBeUndefined();
  });
  it('soft: sombra difusa fixa e borda do estilo mantida', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#1E293B', shadow: 'soft' } });
    expect(style.boxShadow).toBe('0 4px 14px rgba(0,0,0,0.18)');
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#1e293b');
  });
  it('hard: borda de 2px e sombra deslocada, preta por padrão, sobrepondo a borda do estilo', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#FFFFFF', shadow: 'hard' } });
    expect(style.borderWidth).toBe('2px');
    expect(style.borderStyle).toBe('solid');
    expect(style.borderColor).toBe('#000000');
    expect(style.boxShadow).toBe('4px 4px 0 #000000');
    const glass = getLinkButtonStyle({ buttonStyle: { type: 'glass', shadow: 'hard', shadowColor: '#FF0000' } });
    expect(glass.borderColor).toBe('#ff0000');
    expect(glass.boxShadow).toBe('4px 4px 0 #ff0000');
  });
  it('hard com shadowColor inválido usa preto', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', shadow: 'hard', shadowColor: 'vermelho' } }).boxShadow).toBe('4px 4px 0 #000000');
  });
  it('glow: usa a cor do botão como reserva e shadowColor quando houver', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#00F0FF', shadow: 'glow' } }).boxShadow).toBe(
      '0 0 18px #00f0ff99, 0 0 4px #00f0ff',
    );
    expect(getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#00F0FF', shadow: 'glow', shadowColor: '#F0F' } }).boxShadow).toBe(
      '0 0 18px #ff00ff99, 0 0 4px #ff00ff',
    );
  });
  it('glow não mexe na borda do estilo', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#39FF14', shadow: 'glow' } });
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#39ff14');
  });
  it('radiusScale escala os deslocamentos de hard e glow', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', shadow: 'hard' } }, { radiusScale: 0.5 }).boxShadow).toBe('2px 2px 0 #000000');
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ff2e97', shadow: 'glow' } }, { radiusScale: 0.4 }).boxShadow).toBe(
      '0 0 7.2px #ff2e9799, 0 0 1.6px #ff2e97',
    );
  });
});
```

- [ ] **Passo 3: confirmar que falha**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts`.
Esperado: FAIL em 5 testes (`soft`, `hard`, `hard com shadowColor inválido`, `glow`, `radiusScale`), com mensagens como `expected undefined to be '0 4px 14px rgba(0,0,0,0.18)'`. Os testes `sem shadow ou com none` e `glow não mexe na borda` já passam.

- [ ] **Passo 4: implementar**

Em `src/utils/linkButtonStyle.ts`, troque a função inteira:

```ts
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
```

por:

```ts
function getBaseButtonStyle(type: string | undefined, bg: string, text: string, borderRadius: string): CSSProperties {
  switch (type) {
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

/** Arredonda para 2 casas, para evitar valores como 7.200000000000001px */
function scaledPx(value: number, scale: number): string {
  return `${Math.round(value * scale * 100) / 100}px`;
}

/**
 * Estilo inline completo do botão de link. Única fonte de verdade para fundo, borda, cor e sombra.
 *
 * `options.radiusScale` reduz o raio da borda (exceto `full`) e também os deslocamentos e o
 * desfoque das sombras `hard` e `glow`, para a miniatura dos modelos ficar proporcional.
 */
export function getLinkButtonStyle(config: LinkButtonConfig, options: { radiusScale?: number } = {}): CSSProperties {
  const { bg, text } = resolveButtonColors(config);
  const scale = options.radiusScale ?? 1;
  const borderRadius = getButtonRadius(config.buttonStyle?.borderRadius, scale);
  const style = getBaseButtonStyle(config.buttonStyle?.type, bg, text, borderRadius);

  switch (config.buttonStyle?.shadow) {
    case 'soft':
      return { ...style, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' };
    case 'hard': {
      // A borda dura sobrepõe a borda do estilo, para a sombra "colar" no botão
      const color = normalizeHex(config.buttonStyle?.shadowColor) ?? '#000000';
      return {
        ...style,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: color,
        boxShadow: `${scaledPx(4, scale)} ${scaledPx(4, scale)} 0 ${color}`,
      };
    }
    case 'glow': {
      const color = normalizeHex(config.buttonStyle?.shadowColor) ?? bg;
      return { ...style, boxShadow: `0 0 ${scaledPx(18, scale)} ${color}99, 0 0 ${scaledPx(4, scale)} ${color}` };
    }
    default:
      return style;
  }
}
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts`. Esperado: PASS, 28 testes.

- [ ] **Passo 6: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 6 arquivos e 56 testes passando; build terminando com `✓ built in` (o aviso de chunk grande já existia).

- [ ] **Passo 7: commit**

```powershell
git add src/stores/useDesignStore.ts src/utils/linkButtonStyle.ts src/utils/linkButtonStyle.test.ts
git commit -m "Adiciona sombra aos botões e campos novos do tema" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 2: funções de aparência do perfil e gradiente animado

**Arquivos:**
- Criar: `src/utils/profileAppearance.ts`
- Teste: `src/utils/profileAppearance.test.ts`
- Modificar: `src/index.css` (acrescentar no fim)

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/utils/profileAppearance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FONT_FAMILY_CSS,
  getAvatarShapeStyle,
  getBackgroundLayer,
  getBaseBackgroundColor,
  getFontWeight,
  getPatternLayerStyle,
  getTextSizeClasses,
} from './profileAppearance';

describe('getPatternLayerStyle', () => {
  const colors = { text: '#0F172A' };

  it('none ou ausente devolve null', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'none' }, colors })).toBeNull();
    expect(getPatternLayerStyle({ background: { type: 'solid' }, colors })).toBeNull();
    expect(getPatternLayerStyle(null)).toBeNull();
  });
  it('valor desconhecido devolve null', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'xadrez' as any }, colors })).toBeNull();
  });
  it('dots: radial de 1.5px numa grade de 18px', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'dots' }, colors })).toEqual({
      backgroundImage: 'radial-gradient(circle, #0f172a1f 1.5px, transparent 1.5px)',
      backgroundSize: '18px 18px',
    });
  });
  it('grid: linhas de 1px a cada 24px', () => {
    expect(getPatternLayerStyle({ background: { type: 'gradient', pattern: 'grid' }, colors })).toEqual({
      backgroundImage: 'linear-gradient(#0f172a1f 1px, transparent 1px), linear-gradient(90deg, #0f172a1f 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    });
  });
  it('waves: listras diagonais repetidas', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'waves' }, colors })).toEqual({
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f172a1f 10px, #0f172a1f 20px)',
      backgroundSize: 'auto',
    });
  });
  it('stripes: listras verticais de 1px a cada 12px', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' }, colors })).toEqual({
      backgroundImage: 'linear-gradient(90deg, #0f172a1f 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    });
  });
  it('vale também para o tipo legado pattern', () => {
    expect(getPatternLayerStyle({ background: { type: 'pattern', pattern: 'dots' }, colors })?.backgroundSize).toBe('18px 18px');
  });
  it('sem colors.text válido, a cor do padrão é branca com alfa', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' } })?.backgroundImage).toBe(
      'linear-gradient(90deg, #ffffff1f 1px, transparent 1px)',
    );
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' }, colors: { text: 'branco' } })?.backgroundImage).toBe(
      'linear-gradient(90deg, #ffffff1f 1px, transparent 1px)',
    );
  });
});

describe('getBackgroundLayer', () => {
  it('nunca usa o atalho background', () => {
    const configs = [
      null,
      { background: { type: 'solid' as const, color: '#123456' } },
      { background: { type: 'pattern' as const, color: '#123456' } },
      { background: { type: 'gradient' as const, colors: ['#111111', '#222222'] } },
      { background: { type: 'gradient' as const, colors: ['#111111', '#222222'], animated: true } },
    ];
    for (const config of configs) {
      expect(getBackgroundLayer(config).style).not.toHaveProperty('background');
    }
  });
  it('config nula usa #111827', () => {
    expect(getBackgroundLayer(null)).toEqual({ style: { backgroundColor: '#111827' } });
  });
  it('sólido e legado: backgroundColor com as reservas do getBackgroundStyle', () => {
    expect(getBackgroundLayer({ background: { type: 'solid', color: '#abcdef' } })).toEqual({ style: { backgroundColor: '#abcdef' } });
    expect(getBackgroundLayer({ background: { type: 'solid', colors: ['#FFFFFF'] } })).toEqual({ style: { backgroundColor: '#FFFFFF' } });
    expect(getBackgroundLayer({ background: { type: 'pattern' } })).toEqual({ style: { backgroundColor: '#111827' } });
  });
  it('gradiente: backgroundImage 135° com reservas', () => {
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'] } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111111, #222222)' },
    });
    expect(getBackgroundLayer({ background: { type: 'gradient' } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111827, #1f2937)' },
    });
  });
  it('animação só vale para gradiente com animated === true', () => {
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'], animated: true } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111111, #222222)', backgroundSize: '200% 200%' },
      className: 'linkhub-gradient-animated',
    });
    expect(getBackgroundLayer({ background: { type: 'solid', color: '#111111', animated: true } }).className).toBeUndefined();
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'], animated: false } }).className).toBeUndefined();
  });
});

describe('getBaseBackgroundColor', () => {
  it('sólido usa color, depois colors[0], depois #111827', () => {
    expect(getBaseBackgroundColor({ background: { type: 'solid', color: '#F8FAFC' } })).toBe('#F8FAFC');
    expect(getBaseBackgroundColor({ background: { type: 'pattern', colors: ['#FFF7ED'] } })).toBe('#FFF7ED');
    expect(getBaseBackgroundColor({ background: { type: 'solid' } })).toBe('#111827');
  });
  it('gradiente usa colors[0]', () => {
    expect(getBaseBackgroundColor({ background: { type: 'gradient', color: '#000000', colors: ['#E9D5FF', '#FBCFE8'] } })).toBe('#E9D5FF');
    expect(getBaseBackgroundColor({ background: { type: 'gradient' } })).toBe('#111827');
  });
  it('sem config usa #111827', () => {
    expect(getBaseBackgroundColor(null)).toBe('#111827');
  });
});

describe('getAvatarShapeStyle', () => {
  it('círculo é o padrão', () => {
    expect(getAvatarShapeStyle(undefined)).toEqual({ borderRadius: '9999px' });
    expect(getAvatarShapeStyle('circle')).toEqual({ borderRadius: '9999px' });
  });
  it('arredondado usa 28%', () => {
    expect(getAvatarShapeStyle('rounded')).toEqual({ borderRadius: '28%' });
  });
  it('hexágono recorta e tira a borda', () => {
    expect(getAvatarShapeStyle('hexagon')).toEqual({
      clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
      borderRadius: 0,
      borderWidth: 0,
    });
  });
});

describe('fontes', () => {
  it('FONT_FAMILY_CSS tem as 8 famílias do editor', () => {
    expect(FONT_FAMILY_CSS).toEqual({
      inter: 'Inter, system-ui, sans-serif',
      playfair: 'Playfair Display, serif',
      poppins: 'Poppins, sans-serif',
      'roboto-mono': 'Roboto Mono, monospace',
      'dancing-script': 'Dancing Script, cursive',
      montserrat: 'Montserrat, sans-serif',
      lora: 'Lora, serif',
      'source-code-pro': 'Source Code Pro, monospace',
    });
  });
  it('getFontWeight mapeia os pesos e devolve undefined sem peso', () => {
    expect(getFontWeight('light')).toBe(300);
    expect(getFontWeight('normal')).toBe(400);
    expect(getFontWeight('medium')).toBe(500);
    expect(getFontWeight('bold')).toBe(700);
    expect(getFontWeight(undefined)).toBeUndefined();
  });
  it('getTextSizeClasses: md é o padrão e reproduz a página pública atual', () => {
    expect(getTextSizeClasses('sm')).toEqual({ bio: 'text-sm', button: 'text-base' });
    expect(getTextSizeClasses('md')).toEqual({ bio: 'text-base', button: 'text-lg' });
    expect(getTextSizeClasses('lg')).toEqual({ bio: 'text-lg', button: 'text-xl' });
    expect(getTextSizeClasses(undefined)).toEqual({ bio: 'text-base', button: 'text-lg' });
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/utils/profileAppearance.test.ts`.
Esperado: FAIL com `Failed to load url ./profileAppearance ... Does the file exist?`.

- [ ] **Passo 3: implementar**

Crie `src/utils/profileAppearance.ts`:

```ts
import type { CSSProperties } from 'react';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { normalizeHex } from './linkButtonStyle';

/** Parte da config que define o fundo. Tudo opcional: dados antigos podem vir incompletos. */
export type BackgroundSource = Pick<Partial<ThemeConfig>, 'background' | 'colors'> | null | undefined;

export type FontFamily = ThemeConfig['font']['family'];

const DEFAULT_BACKGROUND = '#111827';
const DEFAULT_GRADIENT_END = '#1f2937';

/**
 * Camada de padrão, desenhada por cima do fundo (sólido, gradiente ou o legado 'pattern').
 * A cor é colors.text com alfa 1f (~12%), com reserva branca.
 */
export function getPatternLayerStyle(config: BackgroundSource): CSSProperties | null {
  const pattern = config?.background?.pattern;
  if (!pattern || pattern === 'none') return null;
  const color = `${normalizeHex(config?.colors?.text) ?? '#ffffff'}1f`;

  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${color} 1.5px, transparent 1.5px)`, backgroundSize: '18px 18px' };
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      };
    case 'waves':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${color} 10px, ${color} 20px)`,
        backgroundSize: 'auto',
      };
    case 'stripes':
      return { backgroundImage: `linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: '12px 12px' };
    default:
      return null;
  }
}

export interface BackgroundLayer {
  style: CSSProperties;
  className?: string;
}

/**
 * Camada de fundo do perfil.
 *
 * Não usa o atalho `background`: com ele, uma atualização do React zera o `background-size`
 * e a animação do gradiente para de ter efeito.
 */
export function getBackgroundLayer(config: BackgroundSource): BackgroundLayer {
  const background = config?.background;
  if (!background) return { style: { backgroundColor: DEFAULT_BACKGROUND } };

  if (background.type === 'gradient') {
    const backgroundImage = `linear-gradient(135deg, ${background.colors?.[0] || DEFAULT_BACKGROUND}, ${background.colors?.[1] || DEFAULT_GRADIENT_END})`;
    if (background.animated === true) {
      return { style: { backgroundImage, backgroundSize: '200% 200%' }, className: 'linkhub-gradient-animated' };
    }
    return { style: { backgroundImage } };
  }

  // Sólido e o legado 'pattern': mesma reserva do getBackgroundStyle
  return { style: { backgroundColor: background.color || background.colors?.[0] || DEFAULT_BACKGROUND } };
}

/** Cor sólida de referência do fundo: a do sólido ou a primeira do gradiente. */
export function getBaseBackgroundColor(config: BackgroundSource): string {
  const background = config?.background;
  if (!background) return DEFAULT_BACKGROUND;
  if (background.type === 'gradient') return background.colors?.[0] || DEFAULT_BACKGROUND;
  return background.color || background.colors?.[0] || DEFAULT_BACKGROUND;
}

/** Formato do avatar. Vale para a raiz do Avatar e para o AvatarFallback. */
export function getAvatarShapeStyle(shape: string | undefined): CSSProperties {
  switch (shape) {
    case 'rounded':
      return { borderRadius: '28%' };
    case 'hexagon':
      // O recorte esconderia a borda, então ela sai
      return {
        clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
        borderRadius: 0,
        borderWidth: 0,
      };
    default:
      return { borderRadius: '9999px' };
  }
}

/** Única lista de família CSS por fonte: usada pelo perfil, pela miniatura dos modelos e pelo editor. */
export const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  inter: 'Inter, system-ui, sans-serif',
  playfair: 'Playfair Display, serif',
  poppins: 'Poppins, sans-serif',
  'roboto-mono': 'Roboto Mono, monospace',
  'dancing-script': 'Dancing Script, cursive',
  montserrat: 'Montserrat, sans-serif',
  lora: 'Lora, serif',
  'source-code-pro': 'Source Code Pro, monospace',
};

const FONT_WEIGHTS: Record<ThemeConfig['font']['weight'], number> = { light: 300, normal: 400, medium: 500, bold: 700 };

/** Peso numérico. undefined quando não há peso: quem usa mantém o peso atual do elemento. */
export function getFontWeight(weight: string | undefined): number | undefined {
  return weight ? FONT_WEIGHTS[weight as ThemeConfig['font']['weight']] : undefined;
}

const TEXT_SIZES: Record<ThemeConfig['font']['size'], { bio: string; button: string }> = {
  sm: { bio: 'text-sm', button: 'text-base' },
  md: { bio: 'text-base', button: 'text-lg' },
  lg: { bio: 'text-lg', button: 'text-xl' },
};

/** Tamanho da bio e do texto dos botões. md (padrão) reproduz a página pública atual. */
export function getTextSizeClasses(size: string | undefined): { bio: string; button: string } {
  return TEXT_SIZES[size as ThemeConfig['font']['size']] ?? TEXT_SIZES.md;
}
```

Decisões que este código fixa:
- `getBackgroundLayer` nunca devolve a chave `background` (o teste garante), só `backgroundColor`, `backgroundImage` e `backgroundSize`.
- A animação só entra com `type === 'gradient'` e `animated === true`.
- `getFontWeight` devolve `undefined` sem peso. O `ProfileView` (Tarefa 3) usa `?? 400` na bio e `?? 500` no texto dos botões, então `theme=null` e temas sem fonte ficam como hoje.
- `stripes` usa `backgroundSize: '12px 12px'` (a altura do ladrilho não importa para listras verticais) e `waves` usa `'auto'`.

- [ ] **Passo 4: keyframes e redução de movimento**

Acrescente ao fim de `src/index.css`, fora de qualquer `@layer` (a classe é aplicada por código e não pode ser descartada pelo Tailwind):

```css
/*
 * Gradiente animado do perfil (getBackgroundLayer em src/utils/profileAppearance.ts).
 * Fora de @layer de propósito: a classe é aplicada por código e não pode ser descartada.
 */
@keyframes linkhub-gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.linkhub-gradient-animated {
  animation: linkhub-gradient-shift 18s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .linkhub-gradient-animated {
    animation: none;
  }
}
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/utils/profileAppearance.test.ts`. Esperado: PASS, 22 testes.

- [ ] **Passo 6: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 7 arquivos e 78 testes; build verde. Confira que a classe saiu no CSS: `Select-String -Path dist/assets/*.css -Pattern 'linkhub-gradient-animated'` deve achar a regra da animação e a de `animation:none`.

- [ ] **Passo 7: commit**

```powershell
git add src/utils/profileAppearance.ts src/utils/profileAppearance.test.ts src/index.css
git commit -m "Cria funções de aparência do perfil: fundo, padrão, avatar e fonte" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 3: componente único do perfil (`ProfileView`) e ícones

**Arquivos:**
- Criar: `src/components/profile/linkIcons.tsx`
- Criar: `src/components/profile/ProfileView.tsx`
- Teste: `src/components/profile/ProfileView.test.tsx`

Nesta tarefa ninguém usa o componente ainda; a migração é a Tarefa 4.

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/components/profile/ProfileView.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { ProfileView } from './ProfileView';

afterEach(() => cleanup());

const profile = { full_name: 'Daniel Ávila', username: 'dna', bio: 'Engenheiro', show_username: true };
const links = [
  { id: 1, title: 'Meu site', url: 'https://example.com' },
  { id: 2, title: 'GitHub', url: 'https://github.com/dna' },
];

const theme: ThemeConfig = {
  background: { type: 'solid', color: '#F8FAFC', pattern: 'grid' },
  buttonStyle: { type: 'outline', color: '#1E293B', borderRadius: 'sm' },
  font: { family: 'lora', size: 'lg', weight: 'bold' },
  colors: { primary: '#1E293B', text: '#0F172A' },
  avatar: { shape: 'rounded' },
};

describe('ProfileView', () => {
  it('renderiza nome, @, bio e os links', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByText('Daniel Ávila')).toBeTruthy();
    expect(screen.getByText('@dna')).toBeTruthy();
    expect(screen.getByText('Engenheiro')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Meu site/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /GitHub/ })).toBeTruthy();
  });

  it('show_username=false esconde o @', () => {
    render(<ProfileView variant="page" profile={{ ...profile, show_username: false }} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.queryByText('@dna')).toBeNull();
  });

  it('clicar num link chama onLinkClick com id e url', () => {
    const onLinkClick = vi.fn();
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={onLinkClick} />);
    fireEvent.click(screen.getByRole('button', { name: /GitHub/ }));
    expect(onLinkClick).toHaveBeenCalledWith({ id: 2, url: 'https://github.com/dna' });
  });

  it('theme=null usa o padrão: fundo #111827, texto branco e pesos atuais', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByTestId('profile-background').style.backgroundColor).toBe('rgb(17, 24, 39)');
    expect(screen.getByText('Daniel Ávila').style.color).toBe('rgb(255, 255, 255)');
    expect(screen.getByText('Engenheiro').style.fontWeight).toBe('400');
    expect(screen.getByText('Meu site').style.fontWeight).toBe('500');
    expect(screen.getByText('Engenheiro').className).toContain('text-base');
    expect(screen.getByRole('button', { name: /Meu site/ }).className).toContain('text-lg');
  });

  it('aplica família, peso e tamanho do tema', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />);
    expect(screen.getByTestId('profile-view').style.fontFamily).toContain('Lora');
    expect(screen.getByText('Engenheiro').style.fontWeight).toBe('700');
    expect(screen.getByText('Meu site').style.fontWeight).toBe('700');
    expect(screen.getByText('Engenheiro').className).toContain('text-lg');
    expect(screen.getByRole('button', { name: /Meu site/ }).className).toContain('text-xl');
  });

  it('o formato do avatar vale também para o fallback', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />);
    expect(screen.getByText('D').style.borderRadius).toBe('28%');
  });

  it('page: rodapé é botão e o fundo fica fixo', () => {
    const { container } = render(<ProfileView variant="page" profile={profile} links={[]} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /criar seu LinkHub/ })).toBeTruthy();
    expect(screen.getByText('Nenhum link disponível')).toBeTruthy();
    expect(container.innerHTML).toContain('min-h-screen');
  });

  it('device: não usa min-h-screen, aplica topInset e o rodapé é só texto', () => {
    const { container } = render(
      <ProfileView
        variant="device"
        topInset={54}
        profile={profile}
        links={[]}
        theme={theme}
        onLinkClick={vi.fn()}
        emptyMessage="Seus links aparecerão aqui"
      />,
    );
    expect(container.innerHTML).not.toContain('min-h-screen');
    const root = screen.getByTestId('profile-view');
    expect(root.className).toContain('min-h-full');
    expect(root.style.paddingTop).toBe('54px');
    expect(root.style.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(screen.queryByRole('button', { name: /criar seu LinkHub/ })).toBeNull();
    expect(screen.getByText(/criar seu LinkHub/)).toBeTruthy();
    expect(screen.getByText('Seus links aparecerão aqui')).toBeTruthy();
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/profile/ProfileView.test.tsx`.
Esperado: FAIL com `Failed to resolve import "./ProfileView"`.

- [ ] **Passo 3: mover os ícones**

Crie `src/components/profile/linkIcons.tsx`. O mapa e a busca são os da página pública (`src/pages/PublicProfile.tsx`, linhas 13-30 e 199-222), iguais aos da prévia; só ganham tipo e nome exportado:

```tsx
import React from 'react';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';

export type LinkIcon = React.ComponentType<{ className?: string }>;

const GoogleDriveIcon: LinkIcon = ({ className }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />;
const NotebookLmIcon: LinkIcon = ({ className }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} />;

/** Ícone por palavra no título. A ordem importa: vale a primeira chave contida no título. */
export const ICON_MAP: Record<string, LinkIcon> = {
  instagram: Instagram,
  x: ExternalLink,
  tiktok: ExternalLink,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  googledrive: GoogleDriveIcon,
  'google drive': GoogleDriveIcon,
  drive: GoogleDriveIcon,
  notebooklm: NotebookLmIcon,
  notebook: NotebookLmIcon,
  website: Globe,
  web: Globe,
  email: Mail,
  default: ExternalLink,
};

/** Ícone do link: primeiro pelo título, depois pelo endereço; sites comuns ficam com o globo. */
export function getLinkIcon(title: string, url?: string): LinkIcon {
  const lowerTitle = title.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (key !== 'default' && lowerTitle.includes(key)) {
      return Icon;
    }
  }
  if (url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return ICON_MAP.instagram;
    if (lowerUrl.includes('youtube.com')) return ICON_MAP.youtube;
    if (lowerUrl.includes('github.com')) return ICON_MAP.github;
    if (lowerUrl.includes('facebook.com')) return ICON_MAP.facebook;
    if (lowerUrl.includes('linkedin.com')) return ICON_MAP.linkedin;
    if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return ICON_MAP.x;
    if (lowerUrl.includes('tiktok.com')) return ICON_MAP.tiktok;
    if (lowerUrl.includes('drive.google.com')) return ICON_MAP.drive;
    if (lowerUrl.includes('notebooklm.google.com')) return ICON_MAP.notebooklm;
    if (lowerUrl.startsWith('mailto:')) return ICON_MAP.email;
  }
  return Globe;
}
```

- [ ] **Passo 4: criar o componente**

Crie `src/components/profile/ProfileView.tsx`:

```tsx
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getLinkButtonClassName, getLinkButtonStyle } from '@/utils/linkButtonStyle';
import {
  FONT_FAMILY_CSS,
  getAvatarShapeStyle,
  getBackgroundLayer,
  getFontWeight,
  getPatternLayerStyle,
  getTextSizeClasses,
} from '@/utils/profileAppearance';
import { getLinkIcon } from './linkIcons';

export interface ProfileViewProfile {
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  show_username?: boolean;
}

export interface ProfileViewLink {
  id: number;
  title: string;
  url: string;
}

export interface ProfileViewProps {
  profile: ProfileViewProfile | null;
  links: ProfileViewLink[];
  /** null = padrão atual (#111827, glass, texto branco) */
  theme: ThemeConfig | null;
  onLinkClick: (link: { id: number; url: string }) => void;
  /** page: min-h-screen com fundo fixo. device: min-h-full; quem rola é a tela do DeviceFrame */
  variant: 'page' | 'device';
  /** Só device: padding-top em px (altura da barra de status do aparelho) */
  topInset?: number;
  /** Texto quando não há links */
  emptyMessage?: string;
}

/** Perfil desenhado a partir do tema. Usado pela página pública e pela prévia do painel. */
export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  links,
  theme,
  onLinkClick,
  variant,
  topInset = 0,
  emptyMessage = 'Nenhum link disponível',
}) => {
  const textColor = theme?.colors?.text || '#ffffff';
  const buttonType = theme?.buttonStyle?.type || 'glass';
  const buttonSize = theme?.buttonStyle?.size || 'md';
  const linkButtonStyle = getLinkButtonStyle(theme ?? { colors: { text: '#ffffff' } });
  const background = getBackgroundLayer(theme);
  const pattern = getPatternLayerStyle(theme);
  const avatarShape = getAvatarShapeStyle(theme?.avatar?.shape);
  const fontFamily = theme?.font?.family ? FONT_FAMILY_CSS[theme.font.family] : undefined;
  // undefined mantém os pesos de hoje: bio 400 e texto do botão 500
  const fontWeight = getFontWeight(theme?.font?.weight);
  const textSizes = getTextSizeClasses(theme?.font?.size);

  const content = (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <Avatar
          className="w-24 h-24 mx-auto mb-6 border-4"
          style={{ borderColor: theme?.colors?.avatarBorder || 'rgba(255,255,255,0.2)', ...avatarShape }}
        >
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-white/10 text-2xl" style={{ color: textColor, ...avatarShape }}>
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
          {profile?.full_name || 'Usuário'}
        </h1>

        {profile?.username && profile.show_username !== false && (
          <p className="text-sm mb-4 opacity-80" style={{ color: textColor }}>
            @{profile.username}
          </p>
        )}

        {profile?.bio && (
          <p
            className={cn(textSizes.bio, 'leading-relaxed max-w-sm mx-auto opacity-90')}
            style={{ color: textColor, fontWeight: fontWeight ?? 400 }}
          >
            {profile.bio}
          </p>
        )}
      </div>

      <div className="space-y-4 mb-8">
        {links.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 opacity-60" style={{ color: textColor }} />
            </div>
            <p className="text-lg opacity-60" style={{ color: textColor }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          links.map((link) => {
            const Icon = getLinkIcon(link.title, link.url);
            return (
              <Button
                key={link.id}
                onClick={() => onLinkClick({ id: link.id, url: link.url })}
                className={cn(
                  'w-full',
                  buttonSize === 'sm' ? 'h-10' : buttonSize === 'lg' ? 'h-14' : 'h-12',
                  getLinkButtonClassName(buttonType),
                  'hover-bounce flex items-center justify-center space-x-3 transition-all duration-200',
                  textSizes.button,
                )}
                style={linkButtonStyle}
              >
                <Icon className="h-6 w-6" />
                <span style={{ fontWeight: fontWeight ?? 500 }}>{link.title}</span>
              </Button>
            );
          })
        )}
      </div>

      <div className="text-center">
        {variant === 'page' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/')}
            className="rounded-full px-6 border-2 opacity-70 hover:opacity-100 bg-transparent transition-all duration-200 mb-3"
            style={{ color: textColor, borderColor: `${textColor}50` }}
          >
            👉 Clique aqui para criar seu LinkHub
          </Button>
        ) : (
          // Na prévia o rodapé é só texto: navegar tiraria o usuário do painel
          <p
            className="inline-block rounded-full px-6 py-1.5 border-2 text-sm opacity-70 mb-3"
            style={{ color: textColor, borderColor: `${textColor}50` }}
          >
            👉 Clique aqui para criar seu LinkHub
          </p>
        )}
        <p className="text-sm opacity-40" style={{ color: textColor }}>
          Powered by LinkHub
        </p>
      </div>
    </div>
  );

  if (variant === 'device') {
    // Fundo e padrão acompanham toda a altura do conteúdo; a rolagem é da tela do aparelho
    return (
      <div
        data-testid="profile-view"
        className={cn('relative min-h-full flex flex-col', background.className)}
        style={{ ...background.style, fontFamily, paddingTop: topInset }}
      >
        {pattern && <div aria-hidden className="pointer-events-none absolute inset-0" style={pattern} />}
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">{content}</div>
      </div>
    );
  }

  return (
    <div data-testid="profile-view" className="min-h-screen relative" style={{ fontFamily }}>
      <div data-testid="profile-background" className={cn('fixed inset-0', background.className)} style={background.style} />
      {pattern && <div aria-hidden className="pointer-events-none fixed inset-0" style={pattern} />}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">{content}</div>
    </div>
  );
};
```

Pontos da especificação que este código cumpre:
- Medidas da página pública nos dois `variant` (avatar `w-24`, nome `text-2xl font-bold`).
- Família na raiz; peso na bio e no texto dos botões (o `font-medium` fixo do `<span>` saiu); tamanho na bio e no botão.
- `page`: fundo e padrão `fixed inset-0`; conteúdo em `relative z-10 min-h-screen`.
- `device`: raiz `relative min-h-full` com o fundo nela, padrão `absolute inset-0`, `padding-top = topInset`; a raiz não rola.
- O formato do avatar vale para a raiz do `Avatar` e para o `AvatarFallback` (o estilo inline vence o `rounded-full` das classes).
- Rodapé: botão no `page`, texto no `device`.

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/components/profile/ProfileView.test.tsx`. Esperado: PASS, 8 testes.

- [ ] **Passo 6: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 8 arquivos e 86 testes; build verde.

- [ ] **Passo 7: commit**

```powershell
git add src/components/profile
git commit -m "Cria componente único do perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: página pública e prévia com o `ProfileView`

**Arquivos:**
- Modificar: `src/pages/PublicProfile.tsx` (imports e `ICON_MAP` nas linhas 3-30; `getThemeStyles` e `getIconComponent` nas linhas 185-222; renderização nas linhas 302-413)
- Reescrever: `src/components/dashboard/ProfilePreview.tsx`
- Teste: `src/components/dashboard/ProfilePreview.test.tsx`

A prévia continua na moldura genérica de 320×640 nesta tarefa (o aparelho real é a Tarefa 10), mas já usa o `ProfileView`, deixa de somar clique e deixa de recarregar os links a cada mudança de tema.

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/components/dashboard/ProfilePreview.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore } from '@/stores/useDesignStore';
import { safeOpenUrl } from '@/utils/sanitize';
import { supabase } from '@/lib/supabase';
import { ProfilePreview } from './ProfilePreview';

vi.mock('@/contexts/AuthContext', () => {
  // Mesmo objeto a cada render, como no AuthContext real
  const user = { id: 'u1', email: 'dna@example.com' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/utils/sanitize', () => ({
  safeOpenUrl: vi.fn(),
}));
vi.mock('@/lib/supabase', () => {
  // Só a leitura de links existe: qualquer gravação (update, insert) quebraria o teste
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () =>
    Promise.resolve({ data: [{ id: 7, title: 'Meu site', url: 'https://example.com', position: 0 }], error: null });
  return { supabase: { from: vi.fn(() => chain) } };
});

beforeEach(() => {
  vi.mocked(supabase.from).mockClear();
  vi.mocked(safeOpenUrl).mockClear();
});
afterEach(() => cleanup());

describe('ProfilePreview', () => {
  it('busca os links uma vez ao montar e não busca de novo quando o tema muda', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(supabase.from).toHaveBeenCalledTimes(1);

    act(() => {
      const theme = useDesignStore.getState().customTheme;
      useDesignStore.getState().setCustomTheme({ ...theme, colors: { ...theme.colors, text: '#123456' } });
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('busca de novo no evento linksUpdated', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    act(() => {
      window.dispatchEvent(new Event('linksUpdated'));
    });
    await waitFor(() => expect(supabase.from).toHaveBeenCalledTimes(2));
  });

  it('clicar num link só abre o endereço, sem registrar clique', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Meu site/ }));
    expect(safeOpenUrl).toHaveBeenCalledWith('https://example.com');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('links');
  });

  it('sem nome no perfil, usa o início do e-mail', async () => {
    render(<ProfilePreview profile={{ username: 'dna' }} />);
    expect(await screen.findByText('dna')).toBeTruthy();
  });
});
```

O mock do Supabase só tem a leitura de links: se a prévia tentar gravar (o `update` de `clicks` de hoje), o teste quebra.

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/ProfilePreview.test.tsx`.
Esperado: FAIL em 3 testes: `expected "spy" to be called 1 times, but got 2 times` (hoje dois efeitos buscam os links ao montar), `... 2 times, but got 3 times` e o de clique (`expected "spy" to be called with arguments: [ 'https://example.com' ]`), com um erro não tratado `supabase.from(...).select(...).eq(...).single is not a function`, que é a gravação de clique de hoje.

- [ ] **Passo 3: PublicProfile, imports**

Em `src/pages/PublicProfile.tsx`, troque tudo de `import { Button } from '@/components/ui/button';` (linha 3) até a linha anterior a `const updateMetaTag = ` (linha 32), ou seja, os imports de `Button` a `linkButtonStyle` e o `ICON_MAP` inteiro, por:

```tsx
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl, isValidUrl } from '@/utils/sanitize';
import { resolveThemeConfig } from '@/utils/themes';
import { ProfileView } from '@/components/profile/ProfileView';

```

`Button` continua sendo usado na tela 404. `isValidUrl` já era importado e não usado; fica como está.

- [ ] **Passo 4: PublicProfile, remover estilos e ícones locais**

Apague tudo de `  const getThemeStyles = () => {` (linha 185) até a linha anterior a `  const handleLinkClick = (linkId: number, url: string) => {` (linha 224): as funções `getThemeStyles` e `getIconComponent`. O `handleLinkClick` (abre o link primeiro e registra o clique depois) não muda.

- [ ] **Passo 5: PublicProfile, renderização**

Troque tudo de `  const themeStyles = getThemeStyles();` (linha 302) até o `};` que fecha o componente, logo antes de `export default PublicProfile;`, por:

```tsx
  return (
    <ProfileView
      variant="page"
      profile={profile}
      links={links}
      theme={resolveThemeConfig(profile?.theme_options as Record<string, any> | null)}
      onLinkClick={(link) => handleLinkClick(link.id, link.url)}
    />
  );
};

```

A busca de dados, a visita, o clique, as meta tags, o carregamento e o 404 continuam na página.

- [ ] **Passo 6: reescrever a prévia**

Troque todo o conteúdo de `src/components/dashboard/ProfilePreview.tsx` por:

```tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl } from '@/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { ProfileView } from '@/components/profile/ProfileView';

interface ProfilePreviewProps {
  profile: any;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ profile }) => {
  const { user } = useAuth();
  const userId = user?.id;
  // Sempre o customTheme do store, para a prévia acompanhar o editor em tempo real
  const customTheme = useDesignStore((state) => state.customTheme);
  const [links, setLinks] = useState<any[]>([]);

  // Links: ao montar, quando o usuário muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    const loadLinks = async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('position');

      if (active && !error && data) {
        setLinks(data);
      }
    };

    loadLinks();
    window.addEventListener('linksUpdated', loadLinks);
    return () => {
      active = false;
      window.removeEventListener('linksUpdated', loadLinks);
    };
  }, [userId]);

  const previewProfile = { ...profile, full_name: profile?.full_name || user?.email?.split('@')[0] };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="relative">
        <div className="absolute inset-0 rounded-[3rem] bg-black/20 blur-lg transform translate-y-2"></div>
        <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
          <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto">
              <ProfileView
                variant="device"
                topInset={24}
                profile={previewProfile}
                links={links}
                theme={customTheme}
                // Prévia: só abre o link, sem registrar clique
                onLinkClick={(link) => safeOpenUrl(link.url)}
                emptyMessage="Seus links aparecerão aqui"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

Saem: as cópias de `ICON_MAP`, `getIconComponent`, `getFontClasses` e `getFontStyle`, o efeito que recarregava links quando `currentTheme`/`customTheme` mudavam e o `handleLinkClick` que somava `clicks`. A dependência do efeito é `user?.id` (texto), e não o objeto `user`, para não buscar de novo quando só a referência muda.

- [ ] **Passo 7: confirmar que passa**

Rode `npx vitest run src/components/dashboard/ProfilePreview.test.tsx`. Esperado: PASS, 4 testes.

- [ ] **Passo 8: conferir que não sobrou nada**

Procure com Grep por `getThemeStyles|getIconComponent|getFontClasses|getFontStyle|ICON_MAP|clicks: currentLink` em `src/pages` e `src/components/dashboard`.
Esperado: nenhum resultado.

- [ ] **Passo 9: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 9 arquivos e 90 testes; build verde.

- [ ] **Passo 10: commit**

```powershell
git add src/pages/PublicProfile.tsx src/components/dashboard/ProfilePreview.tsx src/components/dashboard/ProfilePreview.test.tsx
git commit -m "Página pública e prévia usam o ProfileView" -m "A fonte do tema passa a aparecer no perfil público. A prévia não soma mais clique e não recarrega os links a cada mudança de tema." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: controles novos na aba Design

**Arquivos:**
- Modificar: `src/components/dashboard/DesignTab.tsx` (import na linha 19; `FONT_FAMILIES` nas linhas 28-109; `BACKGROUND_PATTERNS` nas linhas 119-124; seletor de tipo nas linhas 262-269; bloco de padrão nas linhas 287-298; prévia da fonte na linha 320; avatar nas linhas 378-381; botões antes da linha 437)

Sem teste automatizado: é ligação de interface com o `updateCustomConfig` existente (merge raso por seção), sem lógica nova. A verificação é a do navegador, na Tarefa 11.

- [ ] **Passo 1: import do mapa único de fontes**

Troque:

```tsx
import { normalizeHex, resolveButtonColors } from '@/utils/linkButtonStyle';
```

por:

```tsx
import { normalizeHex, resolveButtonColors } from '@/utils/linkButtonStyle';
import { FONT_FAMILY_CSS } from '@/utils/profileAppearance';
```

- [ ] **Passo 2: lista de fontes sem a família duplicada**

Troque tudo de `const FONT_FAMILIES = [` (linha 28) até a linha anterior a `const BUTTON_STYLES = [` (linha 111) por:

```tsx
// A família CSS de cada fonte vem de FONT_FAMILY_CSS, a mesma lista do perfil público e da prévia
const FONT_FAMILIES: { id: ThemeConfig['font']['family']; name: string; category: string; preview: string; description: string }[] = [
  { id: 'inter', name: 'Inter', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Moderna e legível' },
  { id: 'playfair', name: 'Playfair Display', category: 'Serif', preview: 'Aa Bb Cc', description: 'Elegante e sofisticada' },
  { id: 'poppins', name: 'Poppins', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Amigável e arredondada' },
  { id: 'roboto-mono', name: 'Roboto Mono', category: 'Monospace', preview: 'Aa Bb Cc', description: 'Técnica e precisa' },
  { id: 'dancing-script', name: 'Dancing Script', category: 'Handwriting', preview: 'Aa Bb Cc', description: 'Casual e divertida' },
  { id: 'montserrat', name: 'Montserrat', category: 'Sans-serif', preview: 'Aa Bb Cc', description: 'Forte e impactante' },
  { id: 'lora', name: 'Lora', category: 'Serif', preview: 'Aa Bb Cc', description: 'Clássica e confortável' },
  { id: 'source-code-pro', name: 'Source Code Pro', category: 'Monospace', preview: 'Aa Bb Cc', description: 'Profissional e limpa' },
];

```

Os campos `style`, `weight` e `cssFamily` não eram usados fora daqui. O itálico do Dancing Script (`'font-serif italic'`) sai junto, como pede a especificação.

Depois, troque a prévia da fonte (linha 320):

```tsx
                                <div className="text-2xl font-medium" style={{ fontFamily: font.cssFamily }}>{font.preview}</div>
```

por:

```tsx
                                <div className="text-2xl font-medium" style={{ fontFamily: FONT_FAMILY_CSS[font.id] }}>{font.preview}</div>
```

- [ ] **Passo 3: padrões, com listras**

Troque:

```tsx
const BACKGROUND_PATTERNS = [
  { id: 'none', name: 'Nenhum', preview: '' },
  { id: 'dots', name: 'Pontos', preview: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'grid', name: 'Grade', preview: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'waves', name: 'Ondas', preview: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' },
];
```

por:

```tsx
const BACKGROUND_PATTERNS: { id: NonNullable<ThemeConfig['background']['pattern']>; name: string; preview: string }[] = [
  { id: 'none', name: 'Nenhum', preview: '' },
  { id: 'dots', name: 'Pontos', preview: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'grid', name: 'Grade', preview: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
  { id: 'waves', name: 'Ondas', preview: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' },
  { id: 'stripes', name: 'Listras', preview: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)' },
];
```

- [ ] **Passo 4: tipo de fundo sem "Padrão"; legado aparece como "Sólido"**

Troque:

```tsx
                      <Select value={customConfig.background.type} onValueChange={(value: 'solid' | 'gradient' | 'pattern') => updateCustomConfig('background', { type: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Cor Sólida</SelectItem>
                          <SelectItem value="gradient">Gradiente</SelectItem>
                          <SelectItem value="pattern">Padrão</SelectItem>
                        </SelectContent>
                      </Select>
```

por:

```tsx
                      {/* 'pattern' é valor legado: o fundo é desenhado como sólido, então o seletor mostra "Sólido" */}
                      <Select value={customConfig.background.type === 'gradient' ? 'gradient' : 'solid'} onValueChange={(value: 'solid' | 'gradient') => updateCustomConfig('background', { type: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Sólido</SelectItem>
                          <SelectItem value="gradient">Gradiente</SelectItem>
                        </SelectContent>
                      </Select>
```

O valor gravado `pattern` continua sendo lido como sólido pelo `getBackgroundLayer`; o seletor só passa a mostrá-lo como "Sólido". O rótulo da opção sólida vira "Sólido", como na especificação.

- [ ] **Passo 5: "Animado" e o seletor de padrão para qualquer tipo**

Troque o bloco que só aparecia com tipo `pattern`:

```tsx
                    {customConfig.background.type === 'pattern' && (
                      <div>
                        <Label className="text-sm">Padrão</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {BACKGROUND_PATTERNS.map((pattern) => (
                            <Button key={pattern.id} variant={customConfig.background.pattern === pattern.id ? "default" : "outline"} className="h-12 text-xs" onClick={() => updateCustomConfig('background', { pattern: pattern.id })}>
                              {pattern.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
```

por:

```tsx
                    {customConfig.background.type === 'gradient' && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="background-animated" className="text-sm">Animado</Label>
                        <Switch
                          id="background-animated"
                          checked={customConfig.background.animated === true}
                          onCheckedChange={(checked) => updateCustomConfig('background', { animated: checked })}
                        />
                      </div>
                    )}
                    {/* O padrão é uma camada sobre qualquer tipo de fundo */}
                    <div>
                      <Label className="text-sm">Padrão</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {BACKGROUND_PATTERNS.map((pattern) => (
                          <Button key={pattern.id} variant={(customConfig.background.pattern || 'none') === pattern.id ? "default" : "outline"} className="h-12 text-xs" onClick={() => updateCustomConfig('background', { pattern: pattern.id })}>
                            {pattern.name}
                          </Button>
                        ))}
                      </div>
                    </div>
```

`Switch` já é importado no arquivo. O padrão ausente aparece marcado como "Nenhum". O trecho da "Segunda Cor (Gradiente)" não é tocado (o defeito do `colors[0]` está fora do escopo).

- [ ] **Passo 6: "Sombra" nos botões**

Logo antes do bloco "Cor do texto do botão", troque:

```tsx
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="button-text-auto" className="text-sm">Cor do texto do botão</Label>
```

por:

```tsx
                    <div>
                      <Label className="text-sm">Sombra</Label>
                      {/* shadowColor não tem controle: o merge de updateCustomConfig preserva o valor vindo do modelo */}
                      <Select value={customConfig.buttonStyle.shadow || 'none'} onValueChange={(value: 'none' | 'soft' | 'hard' | 'glow') => updateCustomConfig('buttonStyle', { shadow: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="soft">Suave</SelectItem>
                          <SelectItem value="hard">Dura</SelectItem>
                          <SelectItem value="glow">Brilho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="button-text-auto" className="text-sm">Cor do texto do botão</Label>
```

- [ ] **Passo 7: "Formato" do avatar**

Troque:

```tsx
                      <p className="text-xs text-muted-foreground mt-1">Cor do círculo ao redor da foto de perfil</p>
                    </div>
                  </div>
                )}
```

por:

```tsx
                      <p className="text-xs text-muted-foreground mt-1">Cor do círculo ao redor da foto de perfil</p>
                    </div>
                    <div>
                      <Label className="text-sm">Formato</Label>
                      {/* avatar pode não existir: o merge de updateCustomConfig cria o bloco */}
                      <Select value={customConfig.avatar?.shape || 'circle'} onValueChange={(value: 'circle' | 'rounded' | 'hexagon') => updateCustomConfig('avatar', { shape: value })}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circle">Círculo</SelectItem>
                          <SelectItem value="rounded">Arredondado</SelectItem>
                          <SelectItem value="hexagon">Hexágono</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">No hexágono, a borda não aparece.</p>
                    </div>
                  </div>
                )}
```

`updateCustomConfig('avatar', ...)` faz `{ ...customConfig.avatar, shape }`; com `avatar` ausente, o spread de `undefined` cria o bloco. O tipo aceita porque `avatar` agora é chave de `ThemeConfig`. O salvamento (`handleSaveTheme`) espalha `customConfig` inteiro, então `background.animated`, `buttonStyle.shadow`, `buttonStyle.shadowColor` e `avatar` são gravados sem mudança nele.

- [ ] **Passo 8: conferir**

Procure com Grep por `cssFamily|italic|value="pattern"` em `src/components/dashboard/DesignTab.tsx`. Esperado: nenhum resultado.

- [ ] **Passo 9: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 9 arquivos e 90 testes; build verde.

- [ ] **Passo 10: commit**

```powershell
git add src/components/dashboard/DesignTab.tsx
git commit -m "Aba Design ganha padrão em qualquer fundo, animação, sombra e formato do avatar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: categoria nos modelos e miniatura com os recursos novos

**Arquivos:**
- Reescrever: `src/components/dashboard/onboardingTemplates.ts`
- Reescrever: `src/components/dashboard/TemplateMockup.tsx`
- Teste: `src/components/dashboard/onboardingTemplates.test.ts` (último `it`)

Mudança de propósito no teste existente: a checagem `não carrega campos antigos de desenho` passa a incluir `font`, que sai do modelo. Os 10 modelos atuais só ganham `category: 'classico'` e perdem `font`; `config` não muda.

- [ ] **Passo 1: atualizar o teste**

Em `src/components/dashboard/onboardingTemplates.test.ts`, troque:

```ts
  it('não carrega campos antigos de desenho', () => {
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });
});
```

por:

```ts
  it('não carrega campos antigos de desenho', () => {
    // font saiu do modelo: a miniatura usa FONT_FAMILY_CSS[config.font.family]
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius', 'font']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });

  it('todo modelo tem uma categoria válida', () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(['classico', 'profissional', 'brutalista', 'neon', 'suave']).toContain(t.category);
    }
  });

  it('os 10 modelos originais ficam em classico', () => {
    const originais = [
      'warm-peach', 'clean-white', 'ocean-deep', 'sunset-warm', 'midnight-dark',
      'forest-green', 'cyber-neon', 'rose-elegant', 'sand-cream', 'purple-haze',
    ];
    for (const id of originais) {
      expect(ONBOARDING_TEMPLATES.find((t) => t.id === id)?.category).toBe('classico');
    }
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/onboardingTemplates.test.ts`.
Esperado: FAIL em 3 testes: `expected 'Poppins, sans-serif' to be undefined`, `to include undefined` e `expected undefined to be 'classico'`.

- [ ] **Passo 3: modelos com categoria e sem `font`**

Troque todo o conteúdo de `src/components/dashboard/onboardingTemplates.ts` por:

```ts
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
];
```

- [ ] **Passo 4: miniatura com as mesmas funções do perfil**

Troque todo o conteúdo de `src/components/dashboard/TemplateMockup.tsx` por:

```tsx
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLinkButtonStyle } from '@/utils/linkButtonStyle';
import { FONT_FAMILY_CSS, getAvatarShapeStyle, getBackgroundLayer, getPatternLayerStyle } from '@/utils/profileAppearance';
import type { OnboardingTemplate } from './onboardingTemplates';

interface TemplateMockupProps {
  template: OnboardingTemplate;
  isSelected: boolean;
  onClick: () => void;
  /** Classes de tamanho, que mudam conforme o lugar onde o desenho aparece */
  className?: string;
}

/**
 * Miniatura de celular gerada da própria config do modelo, com as mesmas funções do perfil:
 * fundo (inclusive animado), padrão, sombra do botão, fonte e formato do avatar.
 */
export const TemplateMockup: React.FC<TemplateMockupProps> = ({ template, isSelected, onClick, className }) => {
  const { config } = template;
  const textColor = config.colors.text || '#ffffff';
  const fontFamily = FONT_FAMILY_CSS[config.font.family];
  const buttonStyle = getLinkButtonStyle(config, { radiusScale: 0.4 });
  const background = getBackgroundLayer(config);
  const pattern = getPatternLayerStyle(config);
  const avatarShape = getAvatarShapeStyle(config.avatar?.shape);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Modelo ${template.name}`}
      aria-pressed={isSelected}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        isSelected ? 'ring-4 ring-primary shadow-xl scale-105' : 'ring-1 ring-border/30 hover:ring-primary/50',
        className
      )}
    >
      <div
        className={cn('relative w-full h-full flex flex-col items-center pt-6 px-3 pb-3', background.className)}
        style={{ ...background.style, fontFamily }}
      >
        {pattern && <div aria-hidden className="pointer-events-none absolute inset-0" style={pattern} />}
        <div className="relative w-10 h-10 bg-white/30 border-2 border-white/50 mb-2" style={avatarShape} />
        <div className="relative text-[10px] font-bold mb-0.5 truncate w-full text-center" style={{ color: textColor }}>
          Seu Nome
        </div>
        <div className="relative text-[7px] opacity-70 mb-3 truncate w-full text-center" style={{ color: textColor }}>
          Sua bio aqui
        </div>
        <div className="relative w-full space-y-1.5">
          {['Meu site', 'YouTube', 'Instagram'].map((label) => (
            <div
              key={label}
              className="w-full h-5 flex items-center justify-center text-[7px] font-medium"
              style={buttonStyle}
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

A miniatura mostra sombra (`getLinkButtonStyle` com `radiusScale: 0.4`, que agora também reduz a sombra), padrão, gradiente animado, fonte (`FONT_FAMILY_CSS[config.font.family]`, na raiz) e formato do avatar.

- [ ] **Passo 5: conferir que não sobrou referência ao campo antigo**

Procure com Grep por `template\.font|font: '` em `src/components/dashboard`. Esperado: nenhum resultado.

- [ ] **Passo 6: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 9 arquivos e 92 testes; build verde.

- [ ] **Passo 7: commit**

```powershell
git add src/components/dashboard/onboardingTemplates.ts src/components/dashboard/onboardingTemplates.test.ts src/components/dashboard/TemplateMockup.tsx
git commit -m "Modelos ganham categoria e miniatura com os recursos novos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 7: os 12 modelos novos

**Arquivos:**
- Modificar: `src/components/dashboard/onboardingTemplates.ts` (fim da lista)
- Teste: `src/components/dashboard/onboardingTemplates.test.ts` (reescrito)

Mudança de propósito no teste: `tem os 10 modelos da especificação` vira `tem os 22 modelos das especificações`; a tabela de cores ganha as 12 linhas novas; entra uma segunda tabela com as demais colunas da especificação (nome, categoria, fundo, padrão, animação, estilo, raio, sombra, fonte e avatar); entram ids únicos e 3 modelos por categoria nova. As checagens antigas continuam.

- [ ] **Passo 1: reescrever o teste**

Troque todo o conteúdo de `src/components/dashboard/onboardingTemplates.test.ts` por:

```ts
import { describe, expect, it } from 'vitest';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { resolveButtonColors } from '@/utils/linkButtonStyle';

// Cores dos 10 modelos clássicos (especificação de 2026-10-23, seção 3) e dos 12 novos
// (especificação de 2026-10-24, seção 5), já normalizadas
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
  'pro-navy': { bg: '#ffffff', text: '#000000', pageText: '#F1F5F9' },
  'pro-slate': { bg: '#1e293b', text: '#1e293b', pageText: '#0F172A' },
  'pro-olive': { bg: '#e9f5ec', text: '#1f3b2d', pageText: '#F0FDF4' },
  'brut-yellow': { bg: '#ffffff', text: '#000000', pageText: '#111111' },
  'brut-pink': { bg: '#a3e635', text: '#000000', pageText: '#111111' },
  'brut-cobalt': { bg: '#ffffff', text: '#000000', pageText: '#FFFFFF' },
  'neon-cyber': { bg: '#00f0ff', text: '#00f0ff', pageText: '#E0F7FF' },
  'neon-synth': { bg: '#ff2e97', text: '#ffffff', pageText: '#FFE3F1' },
  'neon-terminal': { bg: '#39ff14', text: '#39ff14', pageText: '#39FF14' },
  'soft-lavender': { bg: '#ffffff', text: '#6b21a8', pageText: '#4C1D95' },
  'soft-mint': { bg: '#10b981', text: '#065f46', pageText: '#065F46' },
  'soft-blush': { bg: '#fdba74', text: '#7c2d12', pageText: '#7C2D12' },
};

// Demais colunas da tabela dos 12 modelos novos (especificação de 2026-10-24, seção 5)
const NOVOS: Record<
  string,
  {
    name: string;
    category: string;
    background: Record<string, unknown>;
    button: { type: string; borderRadius: string; shadow: string; shadowColor?: string };
    font: { family: string; size: string; weight: string };
    avatar: string;
  }
> = {
  'pro-navy': {
    name: 'Marinho', category: 'profissional',
    background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
    button: { type: 'solid', borderRadius: 'md', shadow: 'soft' },
    font: { family: 'inter', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'pro-slate': {
    name: 'Grafite', category: 'profissional',
    background: { type: 'solid', color: '#F8FAFC', pattern: 'grid' },
    button: { type: 'outline', borderRadius: 'sm', shadow: 'none' },
    font: { family: 'inter', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'pro-olive': {
    name: 'Oliva', category: 'profissional',
    background: { type: 'gradient', colors: ['#1F3B2D', '#2F5D46'] },
    button: { type: 'solid', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'lora', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'brut-yellow': {
    name: 'Amarelo', category: 'brutalista',
    background: { type: 'solid', color: '#FDE047' },
    button: { type: 'solid', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'poppins', size: 'md', weight: 'bold' }, avatar: 'rounded',
  },
  'brut-pink': {
    name: 'Chiclete', category: 'brutalista',
    background: { type: 'solid', color: '#F9A8D4', pattern: 'dots' },
    button: { type: 'solid', borderRadius: 'sm', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'montserrat', size: 'md', weight: 'bold' }, avatar: 'hexagon',
  },
  'brut-cobalt': {
    name: 'Cobalto', category: 'brutalista',
    background: { type: 'solid', color: '#2563EB' },
    button: { type: 'solid', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'poppins', size: 'md', weight: 'bold' }, avatar: 'rounded',
  },
  'neon-cyber': {
    name: 'Cyber', category: 'neon',
    background: { type: 'gradient', colors: ['#0F0C29', '#302B63'], pattern: 'grid', animated: true },
    button: { type: 'outline', borderRadius: 'sm', shadow: 'glow' },
    font: { family: 'source-code-pro', size: 'md', weight: 'medium' }, avatar: 'hexagon',
  },
  'neon-synth': {
    name: 'Synthwave', category: 'neon',
    background: { type: 'gradient', colors: ['#2B1055', '#D53369'], animated: true },
    button: { type: 'solid', borderRadius: 'full', shadow: 'glow' },
    font: { family: 'montserrat', size: 'md', weight: 'bold' }, avatar: 'circle',
  },
  'neon-terminal': {
    name: 'Terminal', category: 'neon',
    background: { type: 'solid', color: '#050505', pattern: 'stripes' },
    button: { type: 'outline', borderRadius: 'none', shadow: 'glow' },
    font: { family: 'roboto-mono', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'soft-lavender': {
    name: 'Lavanda', category: 'suave',
    background: { type: 'gradient', colors: ['#E9D5FF', '#FBCFE8'], pattern: 'dots' },
    button: { type: 'solid', borderRadius: 'full', shadow: 'soft' },
    font: { family: 'poppins', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'soft-mint': {
    name: 'Menta', category: 'suave',
    background: { type: 'gradient', colors: ['#D1FAE5', '#CFFAFE'], pattern: 'waves', animated: true },
    button: { type: 'modern', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'lora', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'soft-blush': {
    name: 'Blush', category: 'suave',
    background: { type: 'solid', color: '#FFF7ED', pattern: 'grid' },
    button: { type: 'solid', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'dancing-script', size: 'lg', weight: 'medium' }, avatar: 'rounded',
  },
};

const CLASSICOS = [
  'warm-peach', 'clean-white', 'ocean-deep', 'sunset-warm', 'midnight-dark',
  'forest-green', 'cyber-neon', 'rose-elegant', 'sand-cream', 'purple-haze',
];

describe('ONBOARDING_TEMPLATES', () => {
  it('tem os 22 modelos das especificações', () => {
    expect(ONBOARDING_TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it('os ids são únicos', () => {
    const ids = ONBOARDING_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ONBOARDING_TEMPLATES.map((t) => [t.id, t] as const))('%s produz as cores da tabela', (id, template) => {
    const esperado = ESPERADO[id];
    expect(resolveButtonColors(template.config)).toEqual({ bg: esperado.bg, text: esperado.text });
    expect(template.config.colors.text).toBe(esperado.pageText);
  });

  it.each(Object.entries(NOVOS))('%s segue a tabela dos modelos novos', (id, esperado) => {
    const template = ONBOARDING_TEMPLATES.find((t) => t.id === id);
    expect(template?.name).toBe(esperado.name);
    expect(template?.category).toBe(esperado.category);
    expect(template?.config.background).toEqual(esperado.background);
    const { type, borderRadius, shadow, shadowColor, size } = template!.config.buttonStyle;
    expect({ type, borderRadius, shadow, shadowColor }).toEqual(esperado.button);
    expect(size).toBeUndefined();
    expect(template?.config.font).toEqual(esperado.font);
    expect(template?.config.avatar).toEqual({ shape: esperado.avatar });
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
    // font saiu do modelo: a miniatura usa FONT_FAMILY_CSS[config.font.family]
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius', 'font']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });

  it('todo modelo tem uma categoria válida', () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(['classico', 'profissional', 'brutalista', 'neon', 'suave']).toContain(t.category);
    }
  });

  it('os 10 modelos originais ficam em classico', () => {
    for (const id of CLASSICOS) {
      expect(ONBOARDING_TEMPLATES.find((t) => t.id === id)?.category).toBe('classico');
    }
    expect(ONBOARDING_TEMPLATES.filter((t) => t.category === 'classico')).toHaveLength(10);
  });

  it.each(['profissional', 'brutalista', 'neon', 'suave'])('existem 3 modelos na categoria %s', (categoria) => {
    expect(ONBOARDING_TEMPLATES.filter((t) => t.category === categoria)).toHaveLength(3);
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/onboardingTemplates.test.ts`.
Esperado: FAIL em 17 testes: a lista de ids (`expected [ 'clean-white', ... ] to deeply equal [ 'brut-cobalt', ... ]`), os 12 `segue a tabela dos modelos novos` (`expected undefined to be 'Marinho'` etc.) e os 4 `existem 3 modelos na categoria`.

- [ ] **Passo 3: acrescentar os modelos**

Em `src/components/dashboard/onboardingTemplates.ts`, troque o fim da lista:

```ts
      colors: { primary: '#D946EF', secondary: '#3D2B5E', accent: '#D946EF', text: '#2D1B4E' },
    },
  },
];
```

por:

```ts
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
```

Regras da especificação aplicadas: `colors.primary` igual à cor do botão; `buttonStyle.size` ausente; "auto" gravado como `textColor: 'auto'`, como nos modelos atuais; `hard` com `shadowColor: '#000000'`; `glow` sem `shadowColor` (usa a cor do botão). Os campos `colors.secondary`/`accent`/`avatarBorder` não estão na tabela e ficam ausentes.

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/components/dashboard/onboardingTemplates.test.ts`. Esperado: PASS, 45 testes.

- [ ] **Passo 5: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 9 arquivos e 121 testes; build verde.

- [ ] **Passo 6: commit**

```powershell
git add src/components/dashboard/onboardingTemplates.ts src/components/dashboard/onboardingTemplates.test.ts
git commit -m "Adiciona 12 modelos: profissional, neo-brutalista, neon e suave" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 8: filtros por categoria no onboarding e na aba Modelos

**Arquivos:**
- Modificar: `src/components/dashboard/onboardingTemplates.ts` (acrescentar no fim)
- Criar: `src/components/dashboard/TemplateCategoryChips.tsx`
- Modificar: `src/components/dashboard/OnboardingDialog.tsx` (imports nas linhas 9-10; estado na linha 71; passo 3 nas linhas 391-394)
- Modificar: `src/components/dashboard/DesignTab.tsx` (imports nas linhas 16-17; estado na linha 133; grade da aba Modelos)
- Teste: `src/components/dashboard/onboardingTemplates.test.ts` (import e testes no fim), `src/components/dashboard/TemplateCategoryChips.test.tsx`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/components/dashboard/onboardingTemplates.test.ts`, troque o import:

```ts
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
```

por:

```ts
import { ONBOARDING_TEMPLATES, TEMPLATE_FILTERS, filterTemplates } from './onboardingTemplates';
```

e acrescente ao fim do arquivo:

```ts
describe('filtros de modelo', () => {
  it('chips na ordem da especificação, com "Todos" primeiro', () => {
    expect(TEMPLATE_FILTERS.map((f) => f.label)).toEqual(['Todos', 'Clássico', 'Profissional', 'Neo-brutalista', 'Neon', 'Suave']);
    expect(TEMPLATE_FILTERS[0].id).toBe('todos');
  });

  it('"todos" devolve a lista inteira, na mesma ordem', () => {
    expect(filterTemplates(ONBOARDING_TEMPLATES, 'todos')).toEqual(ONBOARDING_TEMPLATES);
  });

  it('uma categoria devolve só os modelos dela', () => {
    const neon = filterTemplates(ONBOARDING_TEMPLATES, 'neon');
    expect(neon.map((t) => t.id)).toEqual(['neon-cyber', 'neon-synth', 'neon-terminal']);
    expect(filterTemplates(ONBOARDING_TEMPLATES, 'classico')).toHaveLength(10);
  });
});
```

Crie `src/components/dashboard/TemplateCategoryChips.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TemplateCategoryChips } from './TemplateCategoryChips';

afterEach(() => cleanup());

describe('TemplateCategoryChips', () => {
  it('marca o filtro atual e avisa a troca', () => {
    const onChange = vi.fn();
    render(<TemplateCategoryChips value="todos" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Neon' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Neo-brutalista' }));
    expect(onChange).toHaveBeenCalledWith('brutalista');
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard`.
Esperado: FAIL em `TemplateCategoryChips.test.tsx` (`Failed to resolve import "./TemplateCategoryChips"`) e em 3 testes de `filtros de modelo` (`Cannot read properties of undefined (reading 'map')` e `filterTemplates is not a function`).

- [ ] **Passo 3: filtros nos dados**

Acrescente ao fim de `src/components/dashboard/onboardingTemplates.ts`:

```ts
export type TemplateFilter = 'todos' | TemplateCategory;

/** Chips de filtro, na ordem em que aparecem no onboarding e na aba Modelos */
export const TEMPLATE_FILTERS: { id: TemplateFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'classico', label: 'Clássico' },
  { id: 'profissional', label: 'Profissional' },
  { id: 'brutalista', label: 'Neo-brutalista' },
  { id: 'neon', label: 'Neon' },
  { id: 'suave', label: 'Suave' },
];

export function filterTemplates(templates: OnboardingTemplate[], filter: TemplateFilter): OnboardingTemplate[] {
  return filter === 'todos' ? templates : templates.filter((t) => t.category === filter);
}
```

- [ ] **Passo 4: componente dos chips**

Crie `src/components/dashboard/TemplateCategoryChips.tsx`:

```tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { TEMPLATE_FILTERS } from './onboardingTemplates';
import type { TemplateFilter } from './onboardingTemplates';

interface TemplateCategoryChipsProps {
  value: TemplateFilter;
  onChange: (value: TemplateFilter) => void;
  className?: string;
}

/** Linha de chips para filtrar os modelos por estilo. Usada no onboarding e na aba Modelos. */
export const TemplateCategoryChips: React.FC<TemplateCategoryChipsProps> = ({ value, onChange, className }) => (
  <div role="group" aria-label="Filtrar modelos por estilo" className={cn('flex flex-wrap gap-2', className)}>
    {TEMPLATE_FILTERS.map((filter) => {
      const active = value === filter.id;
      return (
        <button
          key={filter.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(filter.id)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          {filter.label}
        </button>
      );
    })}
  </div>
);
```

- [ ] **Passo 5: chips no onboarding (passo 3)**

Em `src/components/dashboard/OnboardingDialog.tsx`, troque:

```tsx
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { TemplateMockup } from './TemplateMockup';
```

por:

```tsx
import { ONBOARDING_TEMPLATES, filterTemplates } from './onboardingTemplates';
import type { TemplateFilter } from './onboardingTemplates';
import { TemplateMockup } from './TemplateMockup';
import { TemplateCategoryChips } from './TemplateCategoryChips';
```

Troque:

```tsx
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
```

por:

```tsx
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('todos');
```

E troque o começo do passo 3 (o segundo `{step === 3 && (` do arquivo, por volta da linha 391; o primeiro é o título do passo):

```tsx
        {step === 3 && (
          <div className="mt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
              {ONBOARDING_TEMPLATES.map((template) => (
```

por:

```tsx
        {step === 3 && (
          <div className="mt-4 space-y-4">
            <TemplateCategoryChips value={templateFilter} onChange={setTemplateFilter} />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
              {filterTemplates(ONBOARDING_TEMPLATES, templateFilter).map((template) => (
```

O resto do bloco (o `TemplateMockup` e o fechamento) não muda. Um modelo escolhido continua escolhido se o filtro o esconder.

- [ ] **Passo 6: chips na aba Modelos**

Em `src/components/dashboard/DesignTab.tsx`, troque:

```tsx
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { TemplateMockup } from '@/components/dashboard/TemplateMockup';
```

por:

```tsx
import { ONBOARDING_TEMPLATES, filterTemplates } from '@/components/dashboard/onboardingTemplates';
import type { TemplateFilter } from '@/components/dashboard/onboardingTemplates';
import { TemplateMockup } from '@/components/dashboard/TemplateMockup';
import { TemplateCategoryChips } from '@/components/dashboard/TemplateCategoryChips';
```

Troque:

```tsx
  const [activeCustomTab, setActiveCustomTab] = useState<'background' | 'typography' | 'buttons' | 'avatar'>('background');
```

por:

```tsx
  const [activeCustomTab, setActiveCustomTab] = useState<'background' | 'typography' | 'buttons' | 'avatar'>('background');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('todos');
```

E, dentro de `<TabsContent value="templates">`, troque:

```tsx
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ONBOARDING_TEMPLATES.map((template) => (
```

por:

```tsx
          <TemplateCategoryChips value={templateFilter} onChange={setTemplateFilter} />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filterTemplates(ONBOARDING_TEMPLATES, templateFilter).map((template) => (
```

- [ ] **Passo 7: confirmar que passa**

Rode `npx vitest run src/components/dashboard`. Esperado: PASS.

- [ ] **Passo 8: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 10 arquivos e 125 testes; build verde.

- [ ] **Passo 9: commit**

```powershell
git add src/components/dashboard/onboardingTemplates.ts src/components/dashboard/onboardingTemplates.test.ts src/components/dashboard/TemplateCategoryChips.tsx src/components/dashboard/TemplateCategoryChips.test.tsx src/components/dashboard/OnboardingDialog.tsx src/components/dashboard/DesignTab.tsx
git commit -m "Filtra modelos por categoria no onboarding e na aba Modelos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 9: catálogo de aparelhos, moldura, seletor e aparelho lembrado

**Arquivos:**
- Criar: `src/components/preview/devices.ts`, `src/components/preview/DeviceFrame.tsx`, `src/components/preview/DeviceSelect.tsx`, `src/hooks/useSelectedDevice.ts`
- Teste: `src/components/preview/devices.test.ts`, `src/components/preview/DeviceFrame.test.tsx`, `src/hooks/useSelectedDevice.test.ts`

Nesta tarefa nada usa os componentes ainda; a prévia passa a usá-los na Tarefa 10.

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/components/preview/devices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_DEVICE_ID, DEVICES, getDevice, getDeviceOuterSize, getDeviceScale } from './devices';

// Tabela da seção 6 da especificação: [nome, marca, largura, altura, raio, recorte, barra, altura da barra]
const TABELA: Record<string, [string, string, number, number, number, string, string, number]> = {
  'iphone-16-pro': ['iPhone 16 Pro', 'Apple', 402, 874, 55, 'dynamic-island', 'ios', 54],
  'iphone-16-pro-max': ['iPhone 16 Pro Max', 'Apple', 440, 956, 55, 'dynamic-island', 'ios', 54],
  'iphone-se': ['iPhone SE', 'Apple', 375, 667, 0, 'home-button', 'ios-classic', 20],
  'galaxy-s25': ['Galaxy S25', 'Samsung', 360, 780, 32, 'punch-hole', 'android', 28],
  'galaxy-s25-ultra': ['Galaxy S25 Ultra', 'Samsung', 412, 891, 14, 'punch-hole', 'android', 28],
  'galaxy-a55': ['Galaxy A55', 'Samsung', 384, 832, 34, 'punch-hole', 'android', 28],
  'galaxy-z-flip': ['Galaxy Z Flip', 'Samsung', 412, 1004, 26, 'punch-hole', 'android', 28],
};

describe('DEVICES', () => {
  it('tem os 7 aparelhos com ids únicos', () => {
    const ids = DEVICES.map((d) => d.id);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    expect([...ids].sort()).toEqual(Object.keys(TABELA).sort());
  });

  it.each(Object.entries(TABELA))('%s segue a tabela', (id, [name, brand, width, height, radius, cutout, kind, barHeight]) => {
    const device = getDevice(id);
    expect(device.name).toBe(name);
    expect(device.brand).toBe(brand);
    expect(device.screen).toEqual({ width, height });
    expect(device.screenRadius).toBe(radius);
    expect(device.cutout).toBe(cutout);
    expect(device.statusBar).toEqual({ kind, height: barHeight });
  });

  it('bordas da tabela: SE com 16 nas laterais e 64 no topo e na base', () => {
    expect(getDevice('iphone-se').bezel).toEqual({ top: 64, right: 16, bottom: 64, left: 16 });
    expect(getDevice('iphone-16-pro').bezel).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(getDevice('galaxy-s25').bezel.left).toBe(9);
    expect(getDevice('galaxy-s25-ultra').bezel.left).toBe(9);
    expect(getDevice('galaxy-a55').bezel.left).toBe(12);
    expect(getDevice('galaxy-z-flip').bezel.left).toBe(10);
  });

  it('só o Z Flip tem vinco', () => {
    expect(DEVICES.filter((d) => d.fold).map((d) => d.id)).toEqual(['galaxy-z-flip']);
  });

  it('dimensões positivas', () => {
    for (const d of DEVICES) {
      expect(d.screen.width).toBeGreaterThan(0);
      expect(d.screen.height).toBeGreaterThan(0);
      expect(d.statusBar.height).toBeGreaterThan(0);
      expect(Math.min(d.bezel.top, d.bezel.right, d.bezel.bottom, d.bezel.left)).toBeGreaterThan(0);
      expect(d.screenRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it('marcas Apple e Samsung', () => {
    expect(DEVICES.filter((d) => d.brand === 'Apple')).toHaveLength(3);
    expect(DEVICES.filter((d) => d.brand === 'Samsung')).toHaveLength(4);
  });

  it('padrão válido: iPhone 16 Pro', () => {
    expect(DEFAULT_DEVICE_ID).toBe('iphone-16-pro');
    expect(DEVICES.some((d) => d.id === DEFAULT_DEVICE_ID)).toBe(true);
  });

  it('id inválido ou ausente cai no padrão', () => {
    expect(getDevice('nokia-3310').id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice(null).id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice(undefined).id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice('galaxy-a55').id).toBe('galaxy-a55');
  });
});

describe('getDeviceOuterSize', () => {
  it('soma as bordas à tela', () => {
    expect(getDeviceOuterSize(getDevice('iphone-16-pro'))).toEqual({ width: 426, height: 898 });
    expect(getDeviceOuterSize(getDevice('iphone-se'))).toEqual({ width: 407, height: 795 });
  });
});

describe('getDeviceScale', () => {
  const outer = { width: 426, height: 898 };

  it('sem medida, f = 1', () => {
    expect(getDeviceScale(null, outer)).toBe(1);
    expect(getDeviceScale({ width: 0, height: 0 }, outer)).toBe(1);
  });
  it('nunca aumenta', () => {
    expect(getDeviceScale({ width: 2000, height: 2000 }, outer)).toBe(1);
  });
  it('usa o menor dos dois lados', () => {
    expect(getDeviceScale({ width: 213, height: 2000 }, outer)).toBe(0.5);
    expect(getDeviceScale({ width: 2000, height: 449 }, outer)).toBe(0.5);
  });
});
```

Crie `src/hooks/useSelectedDevice.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PREVIEW_DEVICE_STORAGE_KEY, useSelectedDevice } from './useSelectedDevice';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useSelectedDevice', () => {
  it('sem valor guardado usa o padrão', () => {
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
  });

  it('lê o aparelho guardado', () => {
    window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, 'galaxy-a55');
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('galaxy-a55');
  });

  it('id guardado inválido cai no padrão', () => {
    window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, 'nokia-3310');
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
  });

  it('trocar o aparelho guarda o id', () => {
    const { result } = renderHook(() => useSelectedDevice());
    act(() => result.current.setDeviceId('galaxy-z-flip'));
    expect(result.current.device.id).toBe('galaxy-z-flip');
    expect(window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY)).toBe('galaxy-z-flip');
  });

  it('funciona com o armazenamento bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
    act(() => result.current.setDeviceId('iphone-se'));
    expect(result.current.device.id).toBe('iphone-se');
  });
});
```

Crie `src/components/preview/DeviceFrame.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DeviceFrame } from './DeviceFrame';
import { getDevice } from './devices';

afterEach(() => cleanup());

describe('DeviceFrame', () => {
  it('sem ResizeObserver (jsdom), f = 1: tela e espaço reservado no tamanho real', () => {
    expect(typeof ResizeObserver).toBe('undefined');
    render(
      <DeviceFrame device={getDevice('iphone-16-pro')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('conteúdo')).toBeTruthy();
    expect(screen.getByTestId('device-slot').style.width).toBe('426px');
    expect(screen.getByTestId('device-slot').style.height).toBe('898px');
    const frame = screen.getByTestId('device-frame');
    expect(frame.style.transform).toBe('scale(1)');
    expect(frame.style.transformOrigin).toBe('top left');
    expect(frame.style.borderRadius).toBe('67px');
  });

  it('iPhone: horário 9:41, Dynamic Island e ícones na cor pedida', () => {
    render(
      <DeviceFrame device={getDevice('iphone-16-pro-max')} statusBarColor="#000000">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('9:41')).toBeTruthy();
    expect(screen.getByTestId('device-status-bar').style.color).toBe('rgb(0, 0, 0)');
    expect(screen.getByTestId('device-status-bar').style.height).toBe('54px');
    expect(screen.getByTestId('device-cutout').style.width).toBe('126px');
  });

  it('Galaxy: horário 12:00 e furo de câmera', () => {
    render(
      <DeviceFrame device={getDevice('galaxy-s25')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('12:00')).toBeTruthy();
    expect(screen.getByTestId('device-cutout').style.width).toBe('10px');
    expect(screen.queryByTestId('device-fold')).toBeNull();
  });

  it('iPhone SE: botão Home na moldura e barra clássica de 20 px', () => {
    render(
      <DeviceFrame device={getDevice('iphone-se')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-home-button')).toBeTruthy();
    expect(screen.queryByTestId('device-cutout')).toBeNull();
    expect(screen.getByTestId('device-status-bar').style.height).toBe('20px');
  });

  it('Z Flip: vinco no meio da altura', () => {
    render(
      <DeviceFrame device={getDevice('galaxy-z-flip')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-fold').style.top).toBe('50%');
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/preview src/hooks/useSelectedDevice.test.ts`.
Esperado: FAIL nos 3 arquivos, com `Failed to load url ./devices`, `Failed to resolve import "./useSelectedDevice"` e `Failed to resolve import "./DeviceFrame"`.

- [ ] **Passo 3: catálogo**

Crie `src/components/preview/devices.ts`:

```ts
export type DeviceBrand = 'Apple' | 'Samsung';
export type DeviceCutout = 'dynamic-island' | 'home-button' | 'punch-hole';
export type StatusBarKind = 'ios' | 'ios-classic' | 'android';

export interface DeviceSpec {
  id: string;
  name: string;
  brand: DeviceBrand;
  /** Viewport CSS aproximado, em px (tabelas públicas de viewport; poucos px de diferença são aceitáveis) */
  screen: { width: number; height: number };
  /** Raio dos cantos da tela, em px */
  screenRadius: number;
  /** Espessura da moldura em cada lado, em px */
  bezel: { top: number; right: number; bottom: number; left: number };
  cutout: DeviceCutout;
  /** Z Flip: linha da dobra no meio da altura */
  fold?: boolean;
  statusBar: { kind: StatusBarKind; height: number };
}

const even = (px: number) => ({ top: px, right: px, bottom: px, left: px });

/** Catálogo só de dados. A ordem é a do seletor, dentro de cada marca. */
export const DEVICES: DeviceSpec[] = [
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    brand: 'Apple',
    screen: { width: 402, height: 874 },
    screenRadius: 55,
    bezel: even(12),
    cutout: 'dynamic-island',
    statusBar: { kind: 'ios', height: 54 },
  },
  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    brand: 'Apple',
    screen: { width: 440, height: 956 },
    screenRadius: 55,
    bezel: even(12),
    cutout: 'dynamic-island',
    statusBar: { kind: 'ios', height: 54 },
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    brand: 'Apple',
    screen: { width: 375, height: 667 },
    screenRadius: 0,
    bezel: { top: 64, right: 16, bottom: 64, left: 16 },
    cutout: 'home-button',
    statusBar: { kind: 'ios-classic', height: 20 },
  },
  {
    id: 'galaxy-s25',
    name: 'Galaxy S25',
    brand: 'Samsung',
    screen: { width: 360, height: 780 },
    screenRadius: 32,
    bezel: even(9),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-s25-ultra',
    name: 'Galaxy S25 Ultra',
    brand: 'Samsung',
    screen: { width: 412, height: 891 },
    screenRadius: 14,
    bezel: even(9),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-a55',
    name: 'Galaxy A55',
    brand: 'Samsung',
    screen: { width: 384, height: 832 },
    screenRadius: 34,
    bezel: even(12),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-z-flip',
    name: 'Galaxy Z Flip',
    brand: 'Samsung',
    screen: { width: 412, height: 1004 },
    screenRadius: 26,
    bezel: even(10),
    cutout: 'punch-hole',
    fold: true,
    statusBar: { kind: 'android', height: 28 },
  },
];

export const DEFAULT_DEVICE_ID = 'iphone-16-pro';

/** Aparelho pelo id. Id inválido ou ausente cai no padrão. */
export function getDevice(id: string | null | undefined): DeviceSpec {
  return DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === DEFAULT_DEVICE_ID)!;
}

/** Tamanho total do aparelho: tela mais as bordas. */
export function getDeviceOuterSize(device: DeviceSpec): { width: number; height: number } {
  return {
    width: device.screen.width + device.bezel.left + device.bezel.right,
    height: device.screen.height + device.bezel.top + device.bezel.bottom,
  };
}

/**
 * Escala para o aparelho caber inteiro na área disponível, sem nunca aumentar:
 * f = min(largura disponível / largura total, altura disponível / altura total, 1).
 * Sem medida (jsdom, sem ResizeObserver, ou área ainda sem tamanho), f = 1.
 */
export function getDeviceScale(
  available: { width: number; height: number } | null,
  outer: { width: number; height: number },
): number {
  if (!available || available.width <= 0 || available.height <= 0) return 1;
  return Math.min(available.width / outer.width, available.height / outer.height, 1);
}
```

- [ ] **Passo 4: aparelho lembrado**

Crie `src/hooks/useSelectedDevice.ts`:

```ts
import { useCallback, useState } from 'react';
import { DEFAULT_DEVICE_ID, getDevice } from '@/components/preview/devices';
import type { DeviceSpec } from '@/components/preview/devices';

export const PREVIEW_DEVICE_STORAGE_KEY = 'linkhub:preview-device';

function readStoredDeviceId(): string {
  try {
    return getDevice(window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY)).id;
  } catch {
    // Armazenamento bloqueado (janela privada, dados do site bloqueados): usa o padrão
    return DEFAULT_DEVICE_ID;
  }
}

/** Aparelho da prévia, lembrado neste navegador. Id inválido ou ausente cai no padrão. */
export function useSelectedDevice(): { device: DeviceSpec; setDeviceId: (id: string) => void } {
  const [deviceId, setDeviceIdState] = useState<string>(readStoredDeviceId);

  const setDeviceId = useCallback((id: string) => {
    const next = getDevice(id).id;
    setDeviceIdState(next);
    try {
      window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, next);
    } catch {
      // Sem armazenamento, a escolha vale só enquanto a página estiver aberta
    }
  }, []);

  return { device: getDevice(deviceId), setDeviceId };
}
```

- [ ] **Passo 5: moldura**

Crie `src/components/preview/DeviceFrame.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeviceOuterSize, getDeviceScale } from './devices';
import type { DeviceSpec } from './devices';

interface DeviceFrameProps {
  device: DeviceSpec;
  /** Cor do horário e dos ícones da barra de status, calculada por quem usa */
  statusBarColor: string;
  /** Classes da área medida. A altura dela precisa vir do pai (ex.: flex-1 min-h-0), nunca do conteúdo. */
  className?: string;
  children: React.ReactNode;
}

type Size = { width: number; height: number };

/** Tamanho do conteúdo do elemento. null enquanto não medir ou quando não há ResizeObserver (jsdom). */
function useElementSize(ref: React.RefObject<HTMLElement>): Size | null {
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

const StatusBar: React.FC<{ device: DeviceSpec; color: string }> = ({ device, color }) => {
  const { kind, height } = device.statusBar;
  const ios = kind === 'ios';
  const iconClass = ios ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <div
      data-testid="device-status-bar"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between font-semibold"
      style={{
        height,
        color,
        paddingLeft: ios ? 34 : kind === 'android' ? 18 : 8,
        paddingRight: ios ? 30 : kind === 'android' ? 16 : 8,
        fontSize: ios ? 16 : 12,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <span>{kind === 'android' ? '12:00' : '9:41'}</span>
      <span className="flex items-center gap-1">
        <Signal className={iconClass} />
        <Wifi className={iconClass} />
        <BatteryFull className={iconClass} />
      </span>
    </div>
  );
};

const CameraCutout: React.FC<{ device: DeviceSpec }> = ({ device }) => {
  if (device.cutout === 'dynamic-island') {
    return (
      <div
        data-testid="device-cutout"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black"
        style={{ top: 11, width: 126, height: 37 }}
      />
    );
  }
  if (device.cutout === 'punch-hole') {
    return (
      <div
        data-testid="device-cutout"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black"
        style={{ top: 12, width: 10, height: 10 }}
      />
    );
  }
  // home-button: o botão fica na moldura, fora da tela
  return null;
};

/**
 * Aparelho desenhado em CSS, com a tela no tamanho real (viewport CSS) e reduzido por
 * transform: scale(f) para caber na área medida, sem nunca aumentar.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, statusBarColor, className, children }) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const available = useElementSize(areaRef);
  const outer = getDeviceOuterSize(device);
  const f = getDeviceScale(available, outer);
  const { screen, bezel } = device;

  return (
    <div ref={areaRef} data-testid="device-area" className={cn('w-full overflow-hidden p-3', className)}>
      {/* Reserva exatamente o espaço visual do aparelho já reduzido */}
      <div data-testid="device-slot" className="relative mx-auto" style={{ width: outer.width * f, height: outer.height * f }}>
        <div
          data-testid="device-frame"
          data-device={device.id}
          className="absolute left-0 top-0 bg-neutral-900 shadow-2xl ring-1 ring-white/10"
          style={{
            width: outer.width,
            height: outer.height,
            borderRadius: device.screenRadius + bezel.left,
            transform: `scale(${f})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className="absolute overflow-hidden bg-black"
            style={{ top: bezel.top, left: bezel.left, width: screen.width, height: screen.height, borderRadius: device.screenRadius }}
          >
            <div
              data-testid="device-screen"
              className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {children}
            </div>
            <StatusBar device={device} color={statusBarColor} />
            <CameraCutout device={device} />
            {device.fold && (
              <div
                data-testid="device-fold"
                className="pointer-events-none absolute inset-x-0 z-10 h-px bg-black/20"
                style={{ top: '50%' }}
              />
            )}
          </div>
          {device.cutout === 'home-button' && (
            <div
              data-testid="device-home-button"
              className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-neutral-600"
              style={{ width: 44, height: 44, bottom: (bezel.bottom - 44) / 2 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
```

Como a escala funciona:
- A área medida é a raiz do `DeviceFrame` (`w-full overflow-hidden p-3` mais a classe de quem usa, como `flex-1 min-h-0`). A altura dela vem do pai, nunca do conteúdo escalado: o `overflow-hidden` impede que o aparelho, antes da primeira medida (f = 1), estique a área.
- O `ResizeObserver` só é criado se existir (`typeof ResizeObserver === 'undefined'` no jsdom); sem ele, `f = 1`.
- `f = min(largura disponível / largura total, altura disponível / altura total, 1)`, com o total já incluindo as bordas (`getDeviceScale`).
- O wrapper `device-slot` tem `width = total × f` e `height = total × f` e fica centralizado com `mx-auto`; a moldura dentro dele tem o tamanho real, `transform: scale(f)` e `transform-origin: top left`.
- Raio externo = raio da tela + borda lateral. No iPhone SE, o topo e a base (64 px) ficam na moldura, com o botão Home; a barra clássica de 20 px fica dentro da tela.
- Barra de status e recorte ficam por cima (`absolute`, `z-10`, sem fundo), e o fundo do perfil aparece atrás deles. A rolagem é da `device-screen` (`absolute inset-0 overflow-y-auto`), com a barra de rolagem escondida, como num aparelho.

- [ ] **Passo 6: seletor**

Crie `src/components/preview/DeviceSelect.tsx`:

```tsx
import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DEVICES } from './devices';
import type { DeviceBrand } from './devices';

const BRANDS: DeviceBrand[] = ['Apple', 'Samsung'];

interface DeviceSelectProps {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Seletor do aparelho da prévia, agrupado por marca. */
export const DeviceSelect: React.FC<DeviceSelectProps> = ({ value, onChange, className }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label="Aparelho da prévia" className={cn('h-9 w-[200px]', className)}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {BRANDS.map((brand) => (
        <SelectGroup key={brand}>
          <SelectLabel>{brand}</SelectLabel>
          {DEVICES.filter((device) => device.brand === brand).map((device) => (
            <SelectItem key={device.id} value={device.id}>
              {device.name}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);
```

- [ ] **Passo 7: confirmar que passa**

Rode `npx vitest run src/components/preview src/hooks/useSelectedDevice.test.ts`. Esperado: PASS, 28 testes.

- [ ] **Passo 8: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 13 arquivos e 153 testes; build verde.

- [ ] **Passo 9: commit**

```powershell
git add src/components/preview src/hooks/useSelectedDevice.ts src/hooks/useSelectedDevice.test.ts
git commit -m "Cria catálogo de aparelhos, moldura e seletor da prévia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 10: prévia no aparelho e botão "Prévia" em tela estreita

**Arquivos:**
- Reescrever: `src/components/dashboard/ProfilePreview.tsx`
- Modificar: `src/pages/Dashboard.tsx` (import na linha 16; estado na linha 24; coluna da prévia nas linhas 145-147; antes de `<OnboardingDialog`, linha 156)

O teste `ProfilePreview.test.tsx` da Tarefa 4 continua valendo sem mudança: ele cobre a busca de links e o clique, que esta reescrita mantém.

- [ ] **Passo 1: reescrever a prévia**

Troque todo o conteúdo de `src/components/dashboard/ProfilePreview.tsx` por:

```tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { safeOpenUrl } from '@/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { ProfileView } from '@/components/profile/ProfileView';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelect } from '@/components/preview/DeviceSelect';
import { useSelectedDevice } from '@/hooks/useSelectedDevice';
import { getContrastText } from '@/utils/linkButtonStyle';
import { getBaseBackgroundColor } from '@/utils/profileAppearance';

interface ProfilePreviewProps {
  profile: any;
  /** Conteúdo à direita do seletor de aparelho (no Dialog de tela estreita, o botão Fechar) */
  headerEnd?: React.ReactNode;
  className?: string;
}

/**
 * Prévia do perfil dentro do aparelho escolhido. Coluna de altura definida pelo pai:
 * seletor no topo e, embaixo, a área medida onde o aparelho é reduzido para caber.
 */
export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ profile, headerEnd, className }) => {
  const { user } = useAuth();
  const userId = user?.id;
  // Sempre o customTheme do store, para a prévia acompanhar o editor em tempo real
  const customTheme = useDesignStore((state) => state.customTheme);
  const { device, setDeviceId } = useSelectedDevice();
  const [links, setLinks] = useState<any[]>([]);

  // Links: ao montar, quando o usuário muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    const loadLinks = async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('position');

      if (active && !error && data) {
        setLinks(data);
      }
    };

    loadLinks();
    window.addEventListener('linksUpdated', loadLinks);
    return () => {
      active = false;
      window.removeEventListener('linksUpdated', loadLinks);
    };
  }, [userId]);

  const previewProfile = { ...profile, full_name: profile?.full_name || user?.email?.split('@')[0] };
  // Horário e ícones legíveis também em fundo claro (Grafite, Blush)
  const statusBarColor = getContrastText(getBaseBackgroundColor(customTheme));

  return (
    <div className={cn('flex h-full flex-col gap-3', className)}>
      {/* Linha própria (um div): no Dialog, o seletor [&>button]:hidden não alcança os botões daqui */}
      <div className="flex items-center justify-between gap-2">
        <DeviceSelect value={device.id} onChange={setDeviceId} />
        {headerEnd}
      </div>
      <DeviceFrame device={device} statusBarColor={statusBarColor} className="flex-1 min-h-0">
        <ProfileView
          variant="device"
          topInset={device.statusBar.height}
          profile={previewProfile}
          links={links}
          theme={customTheme}
          // Prévia: só abre o link, sem registrar clique
          onLinkClick={(link) => safeOpenUrl(link.url)}
          emptyMessage="Seus links aparecerão aqui"
        />
      </DeviceFrame>
    </div>
  );
};
```

A cor da barra de status é `getContrastText(getBaseBackgroundColor(customTheme))`, e o `topInset` é a altura da barra do aparelho.

- [ ] **Passo 2: Dashboard, imports e estado**

Em `src/pages/Dashboard.tsx`, troque:

```tsx
import { resolveThemeConfig } from '@/utils/themes';
```

por:

```tsx
import { resolveThemeConfig } from '@/utils/themes';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
```

E troque:

```tsx
  const [showOnboarding, setShowOnboarding] = useState(false);
```

por:

```tsx
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
```

- [ ] **Passo 3: coluna da prévia com altura definida**

Troque:

```tsx
                  <div className="hidden lg:block">
                    <div className="sticky top-6">
                      <ProfilePreview profile={profile} />
```

por:

```tsx
                  <div className="hidden lg:block">
                    {/* Altura definida (48 px do cabeçalho + paddings da página + top-6): é ela que limita a escala do aparelho */}
                    <div className="sticky top-6 h-[calc(100dvh-6rem)]">
                      <ProfilePreview profile={profile} />
```

`6rem` = 48 px do cabeçalho + 24 px de padding da página (`md:p-6`) + 24 px do `top-6`. Em 1280×800, a coluna fica com 704 px e o iPhone 16 Pro (426×898) sai com f ≈ 0,7, inteiro.

- [ ] **Passo 4: botão "Prévia" e Dialog de tela cheia**

Troque a linha:

```tsx
        <OnboardingDialog
```

por:

```tsx
        {/* Tela estreita: a prévia lateral some e o botão abre a mesma prévia em tela cheia */}
        {activeTab !== 'analytics' && (
          <Button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="fixed bottom-4 right-4 z-40 h-11 rounded-full px-4 shadow-lg lg:hidden"
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévia
          </Button>
        )}

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            aria-describedby={undefined}
            className={cn(
              // Tela cheia: sobrescreve posição, tamanho, raio e espaçamento padrão do DialogContent
              'max-w-none w-screen h-[100dvh] p-0 gap-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none border-0 flex flex-col',
              // Sem deslizar nem zoom: só o fade padrão
              '![--tw-enter-scale:1] ![--tw-exit-scale:1] ![--tw-enter-translate-x:0] ![--tw-enter-translate-y:0] ![--tw-exit-translate-x:0] ![--tw-exit-translate-y:0]',
              // Esconde o X padrão (filho direto); o cabeçalho próprio está dentro de um div
              '[&>button]:hidden'
            )}
          >
            <DialogTitle className="sr-only">Prévia do perfil</DialogTitle>
            <ProfilePreview
              profile={profile}
              className="p-3"
              headerEnd={
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="sm">
                    Fechar
                  </Button>
                </DialogClose>
              }
            />
          </DialogContent>
        </Dialog>

        <OnboardingDialog
```

Decisões do `Dialog`:
- O `DialogContent` passa por `cn`/`tailwind-merge`, que troca as classes de posição, tamanho, raio, `gap`, `padding`, `grid` e `max-w` padrão pelas novas.
- O `tailwind-merge` não conhece as classes do `tailwindcss-animate` (`zoom-in-95`, `slide-in-from-left-1/2`, `slide-in-from-top-[48%]` e as de saída), então elas são anuladas pelas variáveis que usam, com `!important`: `--tw-enter-scale`/`--tw-exit-scale` em 1 e os `translate` em 0. Sobra só o fade.
- O X padrão é filho direto do `DialogContent` e some com `[&>button]:hidden`; o cabeçalho próprio (seletor e "Fechar") está num `div` dentro da `ProfilePreview`, então não é atingido.
- `DialogTitle` "Prévia do perfil" com `sr-only` e `aria-describedby={undefined}` atendem à acessibilidade do Radix sem aviso no console.
- O botão é `fixed bottom-4 right-4 z-40 lg:hidden`, com ícone de olho, e não aparece na aba Analytics.

Ainda em `src/pages/Dashboard.tsx`, reserve espaço embaixo em tela estreita. Sem isso, o botão flutuante cobre a ponta direita de "Salvar Configurações" e "Salvar Modelo" quando a página é rolada até o fim. Troque:

```tsx
            <div className="p-3 sm:p-4 md:p-6">
```

por:

```tsx
            <div className="p-3 pb-20 sm:p-4 sm:pb-20 md:p-6 md:pb-20 lg:pb-6">
```

O `pb-20` precisa ser repetido em `sm:` e `md:`, porque `sm:p-4` e `md:p-6` redefinem o padding de baixo. Em `lg`, onde o botão some, volta a ser `pb-6`.

- [ ] **Passo 5: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 13 arquivos e 153 testes; build verde. Os avisos `DialogContent requires a DialogTitle` que aparecem no stderr vêm do `AppSidebar.test.tsx` (o `Sheet` do shadcn) e já existiam.

Confira que as classes de animação foram geradas:

```powershell
Select-String -Path dist/assets/*.css -Pattern 'tw-enter-scale: 1 !important|100dvh - 6rem|scrollbar-width:none'
```

Esperado: as três aparecem.

- [ ] **Passo 6: commit**

```powershell
git add src/components/dashboard/ProfilePreview.tsx src/pages/Dashboard.tsx
git commit -m "Prévia dentro do aparelho escolhido, inclusive em tela estreita" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 11: verificação final e deploy

- [ ] **Passo 1: suíte completa**

```powershell
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Esperado: tudo verde (13 arquivos, 153 testes).

- [ ] **Passo 2: conferir os dados antes do deploy**

Mostre ao usuário o que muda para cada perfil publicado: padrão gravado (agora desenhado), fonte (agora aplicada no perfil público) e peso (agora aplicado na bio e nos botões).

```powershell
@'
SELECT username,
       theme_options->'custom'->'background'->>'type'    AS tipo_fundo,
       theme_options->'custom'->'background'->>'pattern' AS padrao,
       theme_options->'custom'->'font'->>'family'        AS fonte,
       theme_options->'custom'->'font'->>'weight'        AS peso
FROM linkhub.profiles;
'@ | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres'
```

Se algum perfil tiver `padrao` diferente de vazio e de `none`, pare e avise o usuário: o padrão passa a aparecer nele. Fonte e peso mudam de propósito; só registre quais perfis têm, para conferir no passo 5.

- [ ] **Passo 3: guardar o tema atual antes de qualquer teste em produção**

```powershell
$backup = Join-Path $env:TEMP 'linkhub-theme-dna-2026-10-24.json'
"SELECT theme_options::text FROM linkhub.profiles WHERE username = 'dna';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At' |
  Set-Content -NoNewline -Encoding utf8 $backup
Get-Content $backup
```

Esperado: um JSON com `themeId` e `custom`. Não siga sem esse arquivo.

- [ ] **Passo 4: deploy** (procedimento "Atualizações futuras" do `deploy/vpsavila/DEPLOY.md`)

```powershell
npm run build
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -mindepth 1 -delete'
scp -r dist/* avila@192.168.1.24:~/docker/linkhub-frontend/html/
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend/html -type f -exec chmod 644 {} + && docker inspect --format "{{.State.Health.Status}}" linkhub-nginx'
```

Esperado: `healthy`. Confira que `https://linkhub.avila.ia.br` serve o `index-*.js` novo, comparando o nome do arquivo em `dist/index.html` com o HTML servido.

- [ ] **Passo 5: verificação no navegador embutido, com o login do usuário**

Use o navegador embutido (`mcp__Claude_Browser__*`). Abra `https://linkhub.avila.ia.br/dashboard` e, se pedir login, peça ao usuário para entrar ele mesmo no painel do navegador. Nunca digite senha.

1. **Aparelhos, tela larga:** com `resize_window` em 1280×800 e depois em 1440×900, troque entre os 7 aparelhos no seletor. Para cada um, confira com `javascript_tool` que a moldura cabe inteira na área:

```js
const a = document.querySelector('[data-testid=device-area]').getBoundingClientRect();
const f = document.querySelector('[data-testid=device-frame]').getBoundingClientRect();
({ cabe: f.bottom <= a.bottom && f.right <= a.right && f.left >= a.left, aparelho: document.querySelector('[data-testid=device-frame]').dataset.device })
```

Esperado: `cabe: true` em todos, inclusive o Pro Max. Recarregue a página e confirme que o último aparelho escolhido continua selecionado.
2. **Tela estreita:** `resize_window` com `preset: "mobile"` e recarregue. O botão "Prévia" aparece no canto inferior direito nas abas Links, Design e Perfil, e não aparece em Analytics. Ele abre a prévia em tela cheia, sem deslizar nem zoom, com o seletor e "Fechar" no topo, sem o X padrão. Volte com `preset: "desktop"` no fim.
3. **Clique na prévia sem estatística:** conte os cliques antes e depois de clicar num link dentro da prévia (o link abre em outra aba; feche-a).

```powershell
"SELECT count(*) FROM linkhub.link_clicks lc JOIN linkhub.profiles p ON p.id = lc.profile_id WHERE p.username = 'dna';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At'
```

Esperado: o mesmo número antes e depois. Confira também que a coluna `clicks` do link não mudou (`SELECT title, clicks FROM linkhub.links l JOIN linkhub.profiles p ON p.id = l.user_id WHERE p.username = 'dna';`).
4. **Um modelo de cada categoria nova:** na aba Design → Modelos, filtre por categoria e aplique, salvando cada um e abrindo `https://linkhub.avila.ia.br/dna`: Marinho (profissional), Amarelo (neo-brutalista: sombra dura preta e avatar arredondado), Cyber (neon: grade, gradiente animado, brilho, avatar hexagonal) e Lavanda (suave: pontos e sombra suave). Compare cada um com a miniatura e com a prévia.
5. **Animação:** com o Cyber aplicado, troque uma cor na aba Design → Personalizado → Fundo e confirme, na prévia, que a animação continua:

```js
const el = document.querySelector('[data-testid=device-screen] [data-testid=profile-view]');
({ animacao: getComputedStyle(el).animationName, tamanho: getComputedStyle(el).backgroundSize })
```

Esperado: `linkhub-gradient-shift` e `200% 200%`. Para `prefers-reduced-motion`, confira a regra no CSS carregado:

```js
[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
  .filter(r => r.conditionText?.includes('prefers-reduced-motion')).map(r => r.cssText)
```

Esperado: uma regra com `.linkhub-gradient-animated { animation: none; }`. Se o usuário quiser ver parar de verdade, ele mesmo desliga "Efeitos de animação" nas configurações de acessibilidade do Windows; não mexa em configuração do sistema.
6. **Fonte e peso no perfil público:** com um modelo de fonte marcante (Blush, Dancing Script), confirme que o perfil público usa a fonte (`getComputedStyle(document.querySelector('[data-testid=profile-view]')).fontFamily`). Com peso `normal` (Grafite ou Terminal), o texto dos botões fica um pouco mais leve que antes: é intencional (especificação, seção "Testes e verificação").
7. **Editor:** em Personalizado → Fundo, o seletor de padrão aparece com Sólido e com Gradiente, com as 5 opções; "Animado" só aparece com Gradiente. Em Botões, "Sombra" tem 4 opções. Em Avatar, "Formato" tem 3 opções. Salve, recarregue e confirme que tudo persistiu.

- [ ] **Passo 6: restaurar o tema do usuário**

Pergunte ao usuário se quer manter algum dos modelos testados. Se não, restaure o JSON guardado no passo 3:

```powershell
$backup = Join-Path $env:TEMP 'linkhub-theme-dna-2026-10-24.json'
$json = (Get-Content $backup -Raw).Replace("'", "''")
"UPDATE linkhub.profiles SET theme_options = '$json'::jsonb WHERE username = 'dna';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres'
"SELECT theme_options::text FROM linkhub.profiles WHERE username = 'dna';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At'
```

Esperado: `UPDATE 1` e o mesmo JSON do backup. Recarregue o perfil público e o painel e confirme que voltaram ao visual de antes.

- [ ] **Passo 7: commit final, se algo mudou**

Se os passos acima geraram ajustes, faça commit deles com uma mensagem descritiva, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não faça push sem o usuário pedir.
