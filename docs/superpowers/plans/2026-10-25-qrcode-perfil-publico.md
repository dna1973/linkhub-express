# QR code no perfil público — plano de implementação

> **Para agentes executores:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** cada página pública do LinkHub mostra no rodapé um QR code que abre a própria página. O dono do perfil pode desligá-lo na aba Perfil.

**Arquitetura:**
- Uma função única, `getPublicProfileUrl`, monta o endereço público. Ela é usada pelo QR code, pela aba Perfil e pela sidebar.
- Uma função pura, `getQrModuleColor`, escolhe a cor dos módulos com contraste sobre o branco.
- O componente `ProfileQrCode` desenha o cartão com o `QRCodeSVG` do `qrcode.react`, com import estático, e tem um limite de erro próprio.
- O `ProfileView` recebe a URL pronta pela prop `qrCodeUrl`, passada pela `PublicProfile` e pela `ProfilePreview`.
- A coluna `show_qr_code` (padrão `true`) entra no banco por uma migração e na aba Perfil como interruptor.

**Stack:** React 18, Vite 5, TypeScript (`strict: false`), shadcn/ui (Radix), Zustand, Supabase self-hosted (schema `linkhub`), Vitest 2 com Testing Library e jsdom, `qrcode.react` 4.2.0.

**Especificação:** `docs/superpowers/specs/2026-10-25-qrcode-perfil-publico-design.md`

**Convenções do ambiente (Windows):**
- Os comandos rodam no PowerShell, na raiz do repositório.
- `ssh` perde aspas duplas internas: use aspas simples por fora.
- Cada commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Responda e escreva commits em português.
- Vários arquivos estão com CRLF na cópia de trabalho (`core.autocrlf=true`). As trocas de trecho deste plano valem pelo texto, e a ferramenta Edit cuida do final de linha.
- O Vitest roda em ambiente **node** por padrão. Testes de DOM declaram `// @vitest-environment jsdom` na primeira linha.
- Se o `npm test` falhar com `Error: UNKNOWN: unknown error, open '...\ssr\...'` (ou `...\web\...`) e mostrar menos arquivos de teste que o esperado, é falha intermitente do cache temporário do Vitest no Windows, não do código: rode de novo. Só conte a contagem de referência de uma execução sem esse erro, conferindo o número de **arquivos**.
- Push não faz parte de nenhuma tarefa.

---

## Mapa de arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `src/lib/siteUrl.ts` | Criar | 1 |
| `src/lib/supabase.ts` | Modificar | 1 |
| `src/lib/publicProfileUrl.ts` | Criar | 1 |
| `src/lib/publicProfileUrl.test.ts` | Criar | 1 |
| `src/utils/linkButtonStyle.ts` | Modificar | 2 |
| `src/utils/linkButtonStyle.test.ts` | Modificar | 2 |
| `src/utils/qrCodeColor.ts` | Criar | 2 |
| `src/utils/qrCodeColor.test.ts` | Criar | 2 |
| `package.json`, `package-lock.json` | Modificar | 3 |
| `src/components/profile/ProfileQrCode.tsx` | Criar | 3 |
| `src/components/profile/ProfileQrCode.test.tsx` | Criar | 3 |
| `src/components/profile/ProfileQrCode.error.test.tsx` | Criar | 3 |
| `src/components/profile/ProfileView.tsx` | Modificar | 4 |
| `src/components/profile/ProfileView.test.tsx` | Modificar | 4 |
| `src/pages/PublicProfile.tsx` | Modificar | 4 |
| `src/components/dashboard/ProfilePreview.tsx` | Modificar | 4 |
| `src/integrations/supabase/types.ts` | Modificar | 5 |
| `deploy/vpsavila/linkhub_schema.sql` | Modificar | 5 |
| `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql` | Criar | 5 |
| `deploy/vpsavila/DEPLOY.md` | Modificar | 5 |
| `src/components/dashboard/SettingsTab.tsx` | Modificar | 5 |
| `src/components/dashboard/SettingsTab.test.tsx` | Modificar | 5 |
| `src/components/dashboard/AppSidebar.tsx` | Modificar | 5 |

Contagem de referência de `npm test` (arquivos / testes) ao fim de cada tarefa:

| Momento | Arquivos / testes |
|---|---|
| Antes | 20/228 |
| T1 | 21/236 |
| T2 | 22/244 |
| T3 | 24/248 |
| T4 | 24/253 |
| T5 | 24/256 |

---

### Tarefa 1: URL do site e endereço público do perfil

**Arquivos:**
- Criar: `src/lib/siteUrl.ts`
- Modificar: `src/lib/supabase.ts`
- Criar: `src/lib/publicProfileUrl.ts`
- Teste: `src/lib/publicProfileUrl.test.ts`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/publicProfileUrl.test.ts` (ambiente node; os testes sempre passam o `siteUrl` explícito, para não depender do `.env`):

```ts
import { describe, expect, it } from 'vitest';
import { getPublicProfileUrl } from './publicProfileUrl';

const SITE = 'https://linkhub.avila.ia.br';

describe('getPublicProfileUrl', () => {
  it('usa o domínio do site quando não há domínio personalizado', () => {
    expect(getPublicProfileUrl({ username: 'dna' }, SITE)).toBe('https://linkhub.avila.ia.br/dna');
  });

  it('preferred_domain padrão ignora o domínio personalizado', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'default', custom_domain: 'meusite.com' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
  });

  it('domínio personalizado sem esquema ganha https://', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'meusite.com' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
  });

  it('domínio personalizado com esquema fica como está, sem diferenciar maiúsculas', () => {
    expect(
      getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'https://meusite.com' }, SITE),
    ).toBe('https://meusite.com/dna');
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'HTTPS://meusite.com' }, SITE)).toBe(
      'HTTPS://meusite.com/dna',
    );
  });

  it('remove as barras do fim do domínio', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'meusite.com//' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
    expect(getPublicProfileUrl({ username: 'dna' }, 'https://linkhub.avila.ia.br/')).toBe('https://linkhub.avila.ia.br/dna');
  });

  it('apara espaços do username e do domínio', () => {
    expect(getPublicProfileUrl({ username: ' dna ', preferred_domain: 'custom', custom_domain: ' meusite.com ' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
  });

  it('personalizado escolhido mas vazio cai no domínio do site', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: '   ' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
  });

  it('sem username devolve null', () => {
    expect(getPublicProfileUrl({ username: '' }, SITE)).toBeNull();
    expect(getPublicProfileUrl({ username: '   ' }, SITE)).toBeNull();
    expect(getPublicProfileUrl({}, SITE)).toBeNull();
    expect(getPublicProfileUrl(null, SITE)).toBeNull();
    expect(getPublicProfileUrl(undefined, SITE)).toBeNull();
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/lib/publicProfileUrl.test.ts`.
Esperado: FAIL, com erro de import (`Failed to resolve import "./publicProfileUrl"` ou equivalente).

- [ ] **Passo 3: criar `src/lib/siteUrl.ts`**

```ts
// URL pública do app (ex.: https://linkhub.avila.ia.br). Cai para o origin atual se não definida.
// Fica fora de supabase.ts para quem só precisa da URL não carregar o cliente do Supabase.
const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || fallbackOrigin).replace(/\/$/, '');
```

- [ ] **Passo 4: reexportar em `src/lib/supabase.ts`**

Troque:

```ts
// URL pública do app (ex.: https://linkhub.avila.ia.br). Cai pro origin atual se não definida.
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin
).replace(/\/$/, '');
```

por:

```ts
// URL pública do app: mora em siteUrl.ts (sem o cliente); reexportada para os imports existentes
export { PUBLIC_SITE_URL } from './siteUrl';
```

- [ ] **Passo 5: criar `src/lib/publicProfileUrl.ts`**

```ts
import { PUBLIC_SITE_URL } from './siteUrl';

export interface PublicProfileUrlSource {
  username?: string | null;
  preferred_domain?: string | null;
  custom_domain?: string | null;
}

/**
 * Endereço público do perfil. Regra única para o QR code, a aba Perfil e a sidebar:
 * domínio personalizado (se for o preferido e estiver preenchido) ou o do site, seguido do username.
 * Sem username, null.
 */
export function getPublicProfileUrl(
  profile: PublicProfileUrlSource | null | undefined,
  siteUrl: string = PUBLIC_SITE_URL,
): string | null {
  const username = profile?.username?.trim();
  if (!username) return null;

  const custom = profile?.custom_domain?.trim();
  let domain = siteUrl;
  if (profile?.preferred_domain === 'custom' && custom) {
    domain = /^https?:\/\//i.test(custom) ? custom : `https://${custom}`;
  }
  return `${domain.replace(/\/+$/, '')}/${username}`;
}
```

- [ ] **Passo 6: confirmar que passa**

Rode `npx vitest run src/lib/publicProfileUrl.test.ts`. Esperado: PASS, 8 testes.

- [ ] **Passo 7: tipos e suíte**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
```

Esperado: tsc sem saída; 21 arquivos e 236 testes. Os testes que mocam `@/lib/supabase` continuam passando, porque o mock substitui o módulo inteiro.

- [ ] **Passo 8: commit**

```powershell
git add src/lib/siteUrl.ts src/lib/supabase.ts src/lib/publicProfileUrl.ts src/lib/publicProfileUrl.test.ts
git commit -m "Função única para o endereço público do perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 2: contraste e cor dos módulos do QR code

**Arquivos:**
- Modificar: `src/utils/linkButtonStyle.ts`
- Teste: `src/utils/linkButtonStyle.test.ts`
- Criar: `src/utils/qrCodeColor.ts`
- Teste: `src/utils/qrCodeColor.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/utils/linkButtonStyle.test.ts`, troque o import:

```ts
import {
  normalizeHex,
  getContrastText,
```

por:

```ts
import {
  normalizeHex,
  getContrastText,
  getContrastRatio,
```

e acrescente, logo depois do bloco `describe('getContrastText', ...)` inteiro:

```ts
describe('getContrastRatio', () => {
  it('preto e branco dão 21; a mesma cor dá 1', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(getContrastRatio('#0b1f3a', '#0B1F3A')).toBeCloseTo(1);
  });

  it('a ordem dos argumentos não importa e aceita #rgb', () => {
    expect(getContrastRatio('#1f2937', '#fff')).toBeCloseTo(14.68, 1);
    expect(getContrastRatio('#fff', '#1f2937')).toBeCloseTo(14.68, 1);
  });

  it('hex inválido devolve null', () => {
    expect(getContrastRatio('azul', '#ffffff')).toBeNull();
    expect(getContrastRatio('#ffffff', '')).toBeNull();
    expect(getContrastRatio(null, '#ffffff')).toBeNull();
  });
});
```

Crie `src/utils/qrCodeColor.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getQrModuleColor } from './qrCodeColor';

describe('getQrModuleColor', () => {
  it.each<[string, ThemeConfig | null, string]>([
    [
      'texto escuro passa',
      { background: { type: 'solid', color: '#ffffff' }, colors: { text: '#1f2937' } } as ThemeConfig,
      '#1f2937',
    ],
    [
      'perfil dna: texto claro falha, fundo azul-marinho passa',
      {
        background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
        buttonStyle: { type: 'glass' },
        colors: { text: '#F1F5F9' },
      } as ThemeConfig,
      '#0b1f3a',
    ],
    [
      'texto, fundo e botão claros: preto',
      {
        background: { type: 'solid', color: '#f8fafc' },
        buttonStyle: { type: 'solid', color: '#ffffff' },
        colors: { text: '#f1f5f9' },
      } as ThemeConfig,
      '#000000',
    ],
    ['tema null: texto branco falha, fundo padrão #111827 passa', null, '#111827'],
    [
      'texto inválido é pulado',
      { background: { type: 'solid', color: '#0f172a' }, colors: { text: 'azul' } } as ThemeConfig,
      '#0f172a',
    ],
  ])('%s', (_, theme, expected) => {
    expect(getQrModuleColor(theme)).toBe(expected);
  });
});
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts src/utils/qrCodeColor.test.ts`.
Esperado: FAIL. No `linkButtonStyle.test.ts`, os 3 testes de `getContrastRatio` (`getContrastRatio is not a function`); o `qrCodeColor.test.ts` falha no import.

- [ ] **Passo 3: exportar `getContrastRatio`**

Em `src/utils/linkButtonStyle.ts`, troque:

```ts
/** Preto ou branco, o que tiver maior contraste (WCAG 2.x) com a cor dada. */
```

por:

```ts
/** Contraste WCAG 2.x entre duas cores hex (de 1 a 21). null se alguma não for hex válido. */
export function getContrastRatio(a: string | null | undefined, b: string | null | undefined): number | null {
  const hexA = normalizeHex(a);
  const hexB = normalizeHex(b);
  if (!hexA || !hexB) return null;
  return contrastRatio(relativeLuminance(hexA), relativeLuminance(hexB));
}

/** Preto ou branco, o que tiver maior contraste (WCAG 2.x) com a cor dada. */
```

- [ ] **Passo 4: criar `src/utils/qrCodeColor.ts`**

```ts
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getContrastRatio, normalizeHex, resolveButtonColors } from './linkButtonStyle';
import { getBaseBackgroundColor } from './profileAppearance';

// Contraste mínimo dos módulos contra o branco do cartão (o mesmo do WCAG AA para texto)
const MIN_CONTRAST = 4.5;

/**
 * Cor dos módulos do QR code: a primeira cor do tema legível sobre o cartão branco.
 * Ordem: texto, fundo de referência, botão. Nenhuma servindo, preto.
 */
export function getQrModuleColor(theme: ThemeConfig | null | undefined): string {
  const candidates = [
    theme?.colors?.text || '#ffffff',
    getBaseBackgroundColor(theme),
    resolveButtonColors(theme ?? {}).bg,
  ];
  for (const color of candidates) {
    const hex = normalizeHex(color);
    const ratio = getContrastRatio(hex, '#ffffff');
    if (hex && ratio !== null && ratio >= MIN_CONTRAST) return hex;
  }
  return '#000000';
}
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/utils/linkButtonStyle.test.ts src/utils/qrCodeColor.test.ts`. Esperado: PASS (os 3 novos de `getContrastRatio` e os 5 de `getQrModuleColor`).

- [ ] **Passo 6: tipos e suíte**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
```

Esperado: tsc sem saída; 22 arquivos e 244 testes.

- [ ] **Passo 7: commit**

```powershell
git add src/utils/linkButtonStyle.ts src/utils/linkButtonStyle.test.ts src/utils/qrCodeColor.ts src/utils/qrCodeColor.test.ts
git commit -m "Cor dos módulos do QR code com contraste sobre o branco" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 3: componente `ProfileQrCode`

**Arquivos:**
- Modificar: `package.json`, `package-lock.json`
- Criar: `src/components/profile/ProfileQrCode.tsx`
- Teste: `src/components/profile/ProfileQrCode.test.tsx` (pacote real)
- Teste: `src/components/profile/ProfileQrCode.error.test.tsx` (pacote simulado lançando erro)

O teste de falha fica num arquivo próprio. O `QRCodeSVG` é um `React.forwardRef`, um objeto e não uma função, então não dá para embrulhá-lo com `vi.fn` mantendo o pacote real no mesmo arquivo. Um `vi.mock` vale para o arquivo inteiro.

- [ ] **Passo 1: instalar a dependência**

```powershell
npm install qrcode.react@4.2.0 --save-exact
```

Esperado: `"qrcode.react": "4.2.0"` em `dependencies` do `package.json`, sem `^`.

- [ ] **Passo 2: escrever os testes que falham**

Crie `src/components/profile/ProfileQrCode.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileQrCode } from './ProfileQrCode';

afterEach(() => cleanup());

const URL_DNA = 'https://linkhub.avila.ia.br/dna';

describe('ProfileQrCode', () => {
  it('cartão com nome acessível, SVG de 120 px e módulos na cor pedida', () => {
    render(<ProfileQrCode url={URL_DNA} color="#0b1f3a" captionColor="#f1f5f9" />);
    const card = screen.getByRole('img', { name: `QR code para abrir ${URL_DNA}` });
    const svg = card.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('120');
    // O pacote desenha dois paths: o fundo (bgColor) e os módulos (fgColor)
    const fills = [...svg!.querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills).toEqual(['#ffffff', '#0b1f3a']);
  });

  it('legenda na cor do texto do tema', () => {
    render(<ProfileQrCode url={URL_DNA} color="#0b1f3a" captionColor="#f1f5f9" />);
    const caption = screen.getByText('Aponte a câmera para abrir este perfil');
    expect(caption.style.color).toBe('rgb(241, 245, 249)');
  });

  it('URLs diferentes geram desenhos diferentes', () => {
    const modules = (url: string) => {
      const { container, unmount } = render(<ProfileQrCode url={url} color="#000000" captionColor="#000000" />);
      const d = container.querySelectorAll('svg path')[1].getAttribute('d');
      unmount();
      return d;
    };
    expect(modules(URL_DNA)).not.toBe(modules('https://linkhub.avila.ia.br/outro'));
  });
});
```

Crie `src/components/profile/ProfileQrCode.error.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileQrCode } from './ProfileQrCode';

// Arquivo próprio: aqui o pacote inteiro é simulado para lançar erro ao desenhar
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => {
    throw new Error('falha simulada');
  },
}));

afterEach(() => cleanup());

describe('ProfileQrCode com falha ao desenhar', () => {
  it('não desenha nada (nem cartão, nem legenda) e o resto da página continua', () => {
    // O React registra no console o erro que o limite capturou
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <div>
          <ProfileQrCode url="https://linkhub.avila.ia.br/dna" color="#000000" captionColor="#000000" />
          <p>resto do perfil</p>
        </div>,
      );
      expect(screen.getByText('resto do perfil')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
```

- [ ] **Passo 3: confirmar que falha**

Rode `npx vitest run src/components/profile/ProfileQrCode.test.tsx src/components/profile/ProfileQrCode.error.test.tsx`.
Esperado: FAIL nos dois arquivos, com erro de import (`./ProfileQrCode` não existe).

- [ ] **Passo 4: criar `src/components/profile/ProfileQrCode.tsx`**

```tsx
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ProfileQrCodeProps {
  /** Endereço público que o QR code abre. */
  url: string;
  /** Cor dos módulos, já com contraste sobre o branco (getQrModuleColor). */
  color: string;
  /** Cor da legenda: a do texto do tema. */
  captionColor: string;
}

/** Se o QR code falhar, o rodapé segue sem ele: o perfil nunca cai por causa do QR code. */
class QrCodeErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('QR code do perfil:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Cartão branco com o QR code do perfil e a legenda, no rodapé do ProfileView. */
export const ProfileQrCode: React.FC<ProfileQrCodeProps> = ({ url, color, captionColor }) => (
  // key: URL nova (username trocado) tenta desenhar de novo depois de uma falha
  <QrCodeErrorBoundary key={url}>
    <div className="mb-4 flex flex-col items-center">
      <div role="img" aria-label={`QR code para abrir ${url}`} className="inline-block rounded-xl bg-white p-2 shadow-md">
        {/* marginSize 2 + o p-2 do cartão formam a zona de silêncio que os leitores precisam */}
        <QRCodeSVG value={url} size={120} level="M" fgColor={color} bgColor="#ffffff" marginSize={2} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs opacity-60" style={{ color: captionColor }}>
        Aponte a câmera para abrir este perfil
      </p>
    </div>
  </QrCodeErrorBoundary>
);
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/components/profile/ProfileQrCode.test.tsx src/components/profile/ProfileQrCode.error.test.tsx`. Esperado: PASS, 4 testes em 2 arquivos.

- [ ] **Passo 6: tipos e suíte**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
```

Esperado: tsc sem saída; 24 arquivos e 248 testes.

- [ ] **Passo 7: commit**

```powershell
git add package.json package-lock.json src/components/profile/ProfileQrCode.tsx src/components/profile/ProfileQrCode.test.tsx src/components/profile/ProfileQrCode.error.test.tsx
git commit -m "Componente do QR code do perfil, com limite de erro próprio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: QR code no rodapé do `ProfileView`

**Arquivos:**
- Modificar: `src/components/profile/ProfileView.tsx`
- Teste: `src/components/profile/ProfileView.test.tsx`
- Modificar: `src/pages/PublicProfile.tsx`
- Modificar: `src/components/dashboard/ProfilePreview.tsx`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/components/profile/ProfileView.test.tsx`, acrescente, antes do `});` final do `describe('ProfileView', ...)` (logo depois do teste `'device: não usa min-h-screen, ...'`):

```tsx
  describe('QR code do rodapé', () => {
    const QR_URL = 'https://linkhub.avila.ia.br/dna';
    const QR_NAME = `QR code para abrir ${QR_URL}`;

    it('com qrCodeUrl e show_qr_code ausente ou true, aparece nas duas variantes', () => {
      for (const perfil of [profile, { ...profile, show_qr_code: true }]) {
        for (const variant of ['page', 'device'] as const) {
          const { unmount } = render(
            <ProfileView variant={variant} profile={perfil} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />,
          );
          expect(screen.getByRole('img', { name: QR_NAME })).toBeTruthy();
          expect(screen.getByText('Aponte a câmera para abrir este perfil')).toBeTruthy();
          unmount();
        }
      }
    });

    it('show_qr_code=false esconde o QR code nas duas variantes', () => {
      for (const variant of ['page', 'device'] as const) {
        const { unmount } = render(
          <ProfileView
            variant={variant}
            profile={{ ...profile, show_qr_code: false }}
            links={links}
            theme={theme}
            onLinkClick={vi.fn()}
            qrCodeUrl={QR_URL}
          />,
        );
        expect(screen.queryByRole('img', { name: QR_NAME })).toBeNull();
        expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
        unmount();
      }
    });

    it('sem qrCodeUrl (perfil sem username) não desenha nada nas duas variantes', () => {
      for (const variant of ['page', 'device'] as const) {
        const { unmount } = render(
          <ProfileView variant={variant} profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={null} />,
        );
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
        unmount();
      }
    });

    it('módulos na cor do tema e legenda na cor do texto', () => {
      // theme deste arquivo: texto #0F172A, que tem contraste sobre o branco
      render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />);
      const fills = [...screen.getByRole('img', { name: QR_NAME }).querySelectorAll('path')].map((p) => p.getAttribute('fill'));
      expect(fills).toContain('#0f172a');
      expect(screen.getByText('Aponte a câmera para abrir este perfil').style.color).toBe('rgb(15, 23, 42)');
    });

    it('fica acima do botão "criar seu LinkHub"', () => {
      render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />);
      const qr = screen.getByRole('img', { name: QR_NAME });
      const criar = screen.getByRole('button', { name: /criar seu LinkHub/ });
      expect(qr.compareDocumentPosition(criar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
```

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/profile/ProfileView.test.tsx`.
Esperado: FAIL em 3 testes: `com qrCodeUrl...`, `módulos na cor...` e `fica acima...`, com `Unable to find an accessible element with the role "img"`. Os dois de ausência passam já agora. O tsc também acusaria a prop `qrCodeUrl` desconhecida, mas o Vitest não checa tipos.

- [ ] **Passo 3: implementar no `ProfileView`**

Em `src/components/profile/ProfileView.tsx`, troque:

```tsx
import { getLinkIcon } from './linkIcons';
```

por:

```tsx
import { getQrModuleColor } from '@/utils/qrCodeColor';
import { getLinkIcon } from './linkIcons';
import { ProfileQrCode } from './ProfileQrCode';
```

Troque:

```tsx
  show_username?: boolean;
}
```

por:

```tsx
  show_username?: boolean;
  /** Ausente conta como ligado, como show_username */
  show_qr_code?: boolean;
}
```

Troque:

```tsx
  /** Texto quando não há links */
  emptyMessage?: string;
}
```

por:

```tsx
  /** Texto quando não há links */
  emptyMessage?: string;
  /** Endereço público do perfil (getPublicProfileUrl). Sem ele, o QR code do rodapé não aparece. */
  qrCodeUrl?: string | null;
}
```

Troque:

```tsx
  emptyMessage = 'Nenhum link disponível',
}) => {
```

por:

```tsx
  emptyMessage = 'Nenhum link disponível',
  qrCodeUrl,
}) => {
```

Troque:

```tsx
      <div className="text-center">
        {variant === 'page' ? (
```

por:

```tsx
      <div className="text-center">
        {qrCodeUrl && profile?.show_qr_code !== false && (
          <ProfileQrCode url={qrCodeUrl} color={getQrModuleColor(theme)} captionColor={textColor} />
        )}
        {variant === 'page' ? (
```

- [ ] **Passo 4: passar a URL na página pública e na prévia**

Em `src/pages/PublicProfile.tsx`, troque:

```tsx
import { ProfileView } from '@/components/profile/ProfileView';
```

por:

```tsx
import { ProfileView } from '@/components/profile/ProfileView';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
```

e troque:

```tsx
      onLinkClick={(link) => handleLinkClick(link.id, link.url)}
    />
```

por:

```tsx
      onLinkClick={(link) => handleLinkClick(link.id, link.url)}
      qrCodeUrl={getPublicProfileUrl(profile)}
    />
```

Em `src/components/dashboard/ProfilePreview.tsx`, troque:

```tsx
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
```

por:

```tsx
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
```

e troque:

```tsx
          emptyMessage="Seus links aparecerão aqui"
        />
```

por:

```tsx
          emptyMessage="Seus links aparecerão aqui"
          // Perfil gravado: o QR code da prévia é o mesmo que o visitante vê
          qrCodeUrl={getPublicProfileUrl(profile)}
        />
```

- [ ] **Passo 5: confirmar que passa**

Rode `npx vitest run src/components/profile/ProfileView.test.tsx src/components/dashboard/ProfilePreview.test.tsx`. Esperado: PASS. O `ProfilePreview.test.tsx` continua passando sem mudar o mock de `@/lib/supabase`, porque o `publicProfileUrl` importa de `@/lib/siteUrl`.

- [ ] **Passo 6: tipos e suíte**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
```

Esperado: tsc sem saída; 24 arquivos e 253 testes.

- [ ] **Passo 7: commit**

```powershell
git add src/components/profile/ProfileView.tsx src/components/profile/ProfileView.test.tsx src/pages/PublicProfile.tsx src/components/dashboard/ProfilePreview.tsx
git commit -m "QR code no rodapé do perfil público e da prévia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: coluna no banco, interruptor na aba Perfil e sidebar

**Arquivos:**
- Modificar: `src/integrations/supabase/types.ts`
- Modificar: `deploy/vpsavila/linkhub_schema.sql`
- Criar: `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql`
- Modificar: `deploy/vpsavila/DEPLOY.md`
- Modificar: `src/components/dashboard/SettingsTab.tsx`
- Teste: `src/components/dashboard/SettingsTab.test.tsx`
- Modificar: `src/components/dashboard/AppSidebar.tsx`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/components/dashboard/SettingsTab.test.tsx`, troque:

```ts
    storageFrom: vi.fn(() => storage),
    profileUpdate: vi.fn(),
  };
});
```

por:

```ts
    storageFrom: vi.fn(() => storage),
    profileUpdate: vi.fn(),
    // Último formData e callback que a aba passou ao useAutosave (o teste chama o salvamento na mão)
    autosave: null as null | { data: unknown; save: (data: unknown) => Promise<void> },
  };
});
```

e troque:

```ts
vi.mock('@/hooks/useAutosave', () => ({ useAutosave: () => 'idle' }));
```

por:

```ts
vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: (data: unknown, save: (data: unknown) => Promise<void>) => {
    mocks.autosave = { data, save };
    return 'idle';
  },
}));
```

Depois, acrescente no fim do arquivo:

```tsx
describe('SettingsTab, QR code e link público', () => {
  it('interruptor do QR code começa ligado e grava show_qr_code false', async () => {
    renderTab();
    const toggle = screen.getByRole('switch', { name: 'Exibir QR code no perfil público' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    await act(async () => {
      await mocks.autosave!.save(mocks.autosave!.data);
    });
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ show_qr_code: false, show_username: true }));
  });

  it('perfil gravado com show_qr_code false começa desligado', () => {
    render(
      <SettingsTab
        profile={{ username: 'dna', full_name: 'Daniel', avatar_url: '', show_qr_code: false }}
        onProfileUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole('switch', { name: 'Exibir QR code no perfil público' }).getAttribute('aria-checked')).toBe('false');
  });

  it('o link para compartilhar usa a regra única (domínio personalizado com https://)', () => {
    render(
      <SettingsTab
        profile={{ username: 'dna', full_name: 'Daniel', avatar_url: '', preferred_domain: 'custom', custom_domain: 'https://meusite.com' }}
        onProfileUpdate={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('https://meusite.com/dna')).toBeTruthy();
  });
});
```

O nome acessível do interruptor vem do `Label` com `htmlFor` (Passo 4).

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/SettingsTab.test.tsx`.
Esperado: FAIL nos 2 primeiros testes novos (`Unable to find an accessible element with the role "switch" and name "Exibir QR code no perfil público"`). O terceiro já passa hoje, porque a aba Perfil já tratava o `https://`, e continua como teste de não regressão. Os testes antigos continuam passando com o mock novo do `useAutosave`.

- [ ] **Passo 3: banco e tipos**

Crie `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql`:

```sql
-- QR code no rodapé do perfil público, ligado em todos os perfis (inclusive os existentes)
ALTER TABLE linkhub.profiles ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN NOT NULL DEFAULT true;
-- PostgREST passa a enxergar a coluna sem reiniciar
NOTIFY pgrst, 'reload schema';
```

Em `deploy/vpsavila/linkhub_schema.sql`, troque:

```sql
  show_username BOOLEAN NOT NULL DEFAULT true,
```

por:

```sql
  show_username BOOLEAN NOT NULL DEFAULT true,
  show_qr_code BOOLEAN NOT NULL DEFAULT true,
```

Em `src/integrations/supabase/types.ts`, dentro de `profiles`:
- em `Row`, troque `          show_username: boolean` por duas linhas: `          show_qr_code: boolean` seguida de `          show_username: boolean`;
- em `Insert` e em `Update`, troque `          show_username?: boolean` por `          show_qr_code?: boolean` seguida de `          show_username?: boolean`.

Use a ferramenta Edit com contexto suficiente para cada ocorrência, porque `show_username?: boolean` aparece duas vezes.

Em `deploy/vpsavila/DEPLOY.md`, troque:

```markdown
### Publicar
```

por:

````markdown
### Migrações do banco

Quando o deploy trouxer um arquivo novo em `deploy/vpsavila/migrations/`, aplique-o **antes** de publicar o frontend. O frontend novo pode gravar colunas que só existem depois da migração, e o antigo ignora colunas novas, então essa ordem é sempre segura:

```powershell
Get-Content deploy/vpsavila/migrations/<arquivo>.sql -Raw | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'
```

As migrações usam `IF NOT EXISTS`: rodar de novo não quebra nada.

### Publicar
````

- [ ] **Passo 4: interruptor e link na aba Perfil**

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
import { supabase, AVATARS_BUCKET, PUBLIC_SITE_URL } from '@/lib/supabase';
```

por:

```tsx
import { supabase, AVATARS_BUCKET } from '@/lib/supabase';
import { PUBLIC_SITE_URL } from '@/lib/siteUrl';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
```

Troque (no `useState` inicial):

```tsx
    show_username: profile?.show_username ?? true,
    user_type: profile?.user_type || '',
```

por:

```tsx
    show_username: profile?.show_username ?? true,
    show_qr_code: profile?.show_qr_code ?? true,
    user_type: profile?.user_type || '',
```

Troque (no `useEffect` que sincroniza com o `profile`):

```tsx
        show_username: profile.show_username ?? true,
        user_type: profile.user_type || '',
```

por:

```tsx
        show_username: profile.show_username ?? true,
        show_qr_code: profile.show_qr_code ?? true,
        user_type: profile.user_type || '',
```

Troque (no `handleAutosave`):

```tsx
        show_username: data.show_username,
```

por:

```tsx
        show_username: data.show_username,
        show_qr_code: data.show_qr_code,
```

Troque o cálculo do link público:

```tsx
  // Determinar o domínio baseado na preferência do usuário
  const getSelectedDomain = () => {
    if (formData.preferred_domain === 'custom' && formData.custom_domain) {
      const domain = formData.custom_domain.startsWith('http') 
        ? formData.custom_domain 
        : `https://${formData.custom_domain}`;
      return domain;
    }
    return PUBLIC_SITE_URL;
  };
  
  const publicUrl = profile?.username 
    ? `${getSelectedDomain()}/${profile.username}`
    : 'Configure seu @username primeiro';
```

por:

```tsx
  // Username gravado (o digitado pode estar inválido ou em uso) com o domínio do formulário, ainda não salvo
  const publicUrl =
    getPublicProfileUrl({
      username: profile?.username,
      preferred_domain: formData.preferred_domain,
      custom_domain: formData.custom_domain,
    }) ?? 'Configure seu @username primeiro';
```

Antes de trocar, confirme com uma busca que `getSelectedDomain` não é usado em outro ponto do arquivo. Se for, relate.

Troque o bloco do interruptor de @username:

```tsx
          {/* Show Username Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exibir @username no perfil público</Label>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o @username não aparecerá na sua página pública.
              </p>
            </div>
            <Switch
              checked={formData.show_username}
              onCheckedChange={(checked) => handleInputChange('show_username', checked as any)}
            />
          </div>
```

por:

```tsx
          {/* Show Username Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_username">Exibir @username no perfil público</Label>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o @username não aparecerá na sua página pública.
              </p>
            </div>
            <Switch
              id="show_username"
              checked={formData.show_username}
              onCheckedChange={(checked) => handleInputChange('show_username', checked as any)}
            />
          </div>

          {/* QR code no rodapé do perfil público */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_qr_code">Exibir QR code no perfil público</Label>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o QR code não aparecerá no rodapé da sua página pública.
              </p>
            </div>
            <Switch
              id="show_qr_code"
              checked={formData.show_qr_code}
              onCheckedChange={(checked) => handleInputChange('show_qr_code', checked as any)}
            />
          </div>
```

- [ ] **Passo 5: sidebar pela regra única**

Em `src/components/dashboard/AppSidebar.tsx`, troque:

```tsx
import { PUBLIC_SITE_URL } from '@/lib/supabase';
```

por:

```tsx
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
```

e troque:

```tsx
  const getPublicUrl = () => {
    if (!profile?.username) return '';
    if (profile?.preferred_domain === 'custom' && profile?.custom_domain) {
      return `https://${profile.custom_domain}/${profile.username}`;
    }
    return `${PUBLIC_SITE_URL}/${profile.username}`;
  };
```

por:

```tsx
  // Mesma regra do QR code e da aba Perfil (aceita domínio personalizado gravado com https://)
  const getPublicUrl = () => getPublicProfileUrl(profile);
```

Os dois usos (`handleViewProfile` e `handleCopyLink`) já testam `if (url)`, e `null` funciona como o `''` de antes. Confira se não há outro uso de `PUBLIC_SITE_URL` no arquivo antes de remover o import.

- [ ] **Passo 6: confirmar que passa**

Rode `npx vitest run src/components/dashboard/SettingsTab.test.tsx src/components/dashboard/AppSidebar.test.tsx src/components/dashboard/AppSidebar.desktop.test.tsx`. Esperado: PASS.

- [ ] **Passo 7: tipos, suíte e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 24 arquivos e 256 testes; build verde.

- [ ] **Passo 8: commit**

```powershell
git add src/integrations/supabase/types.ts deploy/vpsavila/linkhub_schema.sql deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql deploy/vpsavila/DEPLOY.md src/components/dashboard/SettingsTab.tsx src/components/dashboard/SettingsTab.test.tsx src/components/dashboard/AppSidebar.tsx
git commit -m "Interruptor do QR code na aba Perfil, coluna no banco e link público pela regra única" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: verificação, migração e deploy

Feita pelo agente principal, com o login do Daniel no navegador embutido. Nunca digitar senha.

- [ ] **Passo 1: suíte e build**

```powershell
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Esperado: 24 arquivos e 256 testes; tsc sem saída; build verde.

- [ ] **Passo 2: onde o `qrcode.react` foi parar**

```powershell
$entrada = (Select-String -Path dist/index.html -Pattern 'assets/index-[^"]+\.js').Matches[0].Value
Get-ChildItem dist/assets/*.js | Where-Object { Select-String -Path $_.FullName -Pattern 'ECI assignment value out of range' -SimpleMatch -Quiet } | ForEach-Object { $_.Name }
"entrada: $entrada"
```

Esperado: um único arquivo listado, o chunk `ProfileView-*.js`, compartilhado entre a `PublicProfile` e a prévia do Dashboard. Ele também contém `Aponte a câmera para abrir este perfil` e é **diferente** do chunk de entrada. O `PublicProfile-*.js` continua pequeno e sem o pacote. O gzip do `ProfileView-*.js` vai de cerca de 5,6 KB para 12,3 KB.

- [ ] **Passo 3: migração no banco (antes do frontend)**

```powershell
Get-Content deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql -Raw | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'
"SELECT count(*) FILTER (WHERE show_qr_code), count(*) FROM linkhub.profiles;" | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At'
```

Esperado: `ALTER TABLE` e `NOTIFY`; depois, os dois números iguais (todos os perfis com `true`).

- [ ] **Passo 4: publicar o frontend**

Procedimento "Atualizações futuras → Publicar" do `deploy/vpsavila/DEPLOY.md` (pasta `html.new`, troca com `html.old`, `--force-recreate`, `healthy`). Confira que a produção serve o `index-*.js` do `dist/index.html`.

- [ ] **Passo 5: conferir no navegador**

1. `https://linkhub.avila.ia.br/dna`, logado ou não: o QR code aparece no rodapé, acima do "Clique aqui para criar seu LinkHub", com os módulos em `#0b1f3a`, a cor do fundo do tema `dna`. Tire uma captura.
2. Painel, aba Perfil: o interruptor "Exibir QR code no perfil público" aparece ligado. Desligue: depois de cerca de 2 s, a prévia do aparelho perde o QR code, e `https://linkhub.avila.ia.br/dna` recarregado também. **Religue** e confira que voltou nos dois lugares. O estado final é ligado.
3. Confirme pelo banco que `show_qr_code` do `dna` terminou `true`.
4. Mostre a captura ao Daniel e peça que ele **escaneie o QR code com o celular** para confirmar que abre o perfil.

- [ ] **Passo 6: commit final, se algo mudou**

Se os passos acima geraram ajustes, faça commit deles com uma mensagem descritiva. Não faça push sem o Daniel pedir.
