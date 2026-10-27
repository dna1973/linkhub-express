import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkIcon } from '@/components/links/LinkIcon';
import { cn } from '@/lib/utils';
import { resolveLinkIcon, type LinkIconSource } from '@/lib/linkIcons/resolve';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { normalizeHex } from '@/utils/linkButtonStyle';

export type AccentColorPickerProps = {
  url: string;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  accentColor: string | null | undefined;
  /** Hex oficial do ícone (getOfficialHex, calculado por quem usa o picker); null quando não há. */
  officialHex: string | null;
  /**
   * Durante a gravação: os controles ficam com aria-disabled e ignoram clique e tecla, sem o
   * disabled nativo, para o foco não cair no body.
   */
  disabled?: boolean;
  onChange: (color: string | null) => void;
};

type Mode = 'none' | 'official' | 'custom';

const LIGHT = { background: '#ffffff', defaultColor: '#1f2937' };
const DARK = { background: '#111827', defaultColor: '#f9fafb' };
const FALLBACK_CUSTOM = '#1f2937';
const NOTE = 'A cor vale para ícones de marca e da biblioteca';
const HEX_ERROR = 'Use uma cor no formato #rrggbb';
const ARIA_DISABLED_CLASS = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** Aceita `#abc`, `abc`, `#aabbcc` e `aabbcc`, com espaços nas pontas. */
function parseHexInput(text: string): string | null {
  const value = text.trim();
  return normalizeHex(value.startsWith('#') ? value : `#${value}`);
}

const ariaDisabled = (disabled: boolean) => (disabled ? { 'aria-disabled': true as const } : {});

function PreviewSquare({
  testId,
  background,
  defaultColor,
  link,
}: {
  testId: string;
  background: string;
  defaultColor: string;
  link: LinkIconSource;
}) {
  return (
    <span
      data-testid={testId}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border"
      style={{ backgroundColor: background }}
    >
      <LinkIcon link={link} defaultColor={defaultColor} backgrounds={[background]} size={26} />
    </span>
  );
}

/**
 * Cor de destaque do ícone (controlado): "Sem cor", "Cor oficial da marca" (só com hex oficial)
 * e "Escolher cor". Só vale para máscara (marca e Lucide): emoji, favicon e upload desabilitam.
 */
export function AccentColorPicker({
  url,
  iconType,
  iconValue,
  accentColor,
  officialHex,
  disabled = false,
  onChange,
}: AccentColorPickerProps) {
  const noteId = useId();
  const link: LinkIconSource = { url, icon_type: iconType, icon_value: iconValue, accent_color: accentColor };
  // O ícone efetivo: um auto sem marca vira favicon e também não aceita cor
  const appliesToIcon =
    resolveLinkIcon(link, { defaultColor: LIGHT.defaultColor, uploadPrefix: LINK_ICONS_PUBLIC_PREFIX }).kind === 'mask';
  const locked = disabled || !appliesToIcon;
  const describedBy = appliesToIcon ? undefined : noteId;

  const current = normalizeHex(accentColor);
  const official = normalizeHex(officialHex);
  const derivedMode: Mode = !current ? 'none' : current === official ? 'official' : 'custom';

  const [customOpen, setCustomOpen] = useState(derivedMode === 'custom');
  const mode: Mode = customOpen ? 'custom' : derivedMode;

  const [draft, setDraft] = useState(current ?? official ?? FALLBACK_CUSTOM);
  const [error, setError] = useState<string | null>(null);
  // Sair do campo sem ter digitado não grava a cor sugerida
  const hexEditedRef = useRef(false);
  useEffect(() => {
    if (current) {
      setDraft(current);
      setError(null);
    }
  }, [current]);

  const apply = (color: string | null) => {
    if (locked) return;
    if (color !== current) onChange(color);
  };

  const commitDraft = (text: string) => {
    if (locked) return;
    hexEditedRef.current = false;
    const color = parseHexInput(text);
    if (!color) {
      setError(HEX_ERROR);
      return;
    }
    setError(null);
    setDraft(color);
    apply(color);
  };

  // O <input type="color"> dispara `input` a cada movimento: a cor só é gravada no `change` nativo.
  // Ref de callback: o listener acompanha o elemento quando o modo "Escolher cor" abre e fecha.
  const commitRef = useRef(commitDraft);
  commitRef.current = commitDraft;
  const listenerRef = useRef<{ element: HTMLInputElement; handler: () => void } | null>(null);
  const colorInputRef = useCallback((element: HTMLInputElement | null) => {
    if (listenerRef.current) {
      listenerRef.current.element.removeEventListener('change', listenerRef.current.handler);
      listenerRef.current = null;
    }
    if (element) {
      const handler = () => commitRef.current(element.value);
      element.addEventListener('change', handler);
      listenerRef.current = { element, handler };
    }
  }, []);

  const handleHexKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft(event.currentTarget.value);
    }
  };

  // Travado, o seletor nativo não abre (nem por clique nem por tecla)
  const blockColorClick = (event: MouseEvent<HTMLInputElement>) => {
    if (locked) event.preventDefault();
  };
  const blockColorKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (locked && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  };

  const draftHex = parseHexInput(draft);
  const showCustom = mode === 'custom' && appliesToIcon;
  // No modo "Escolher cor", a prévia mostra o rascunho antes de gravar
  const previewLink: LinkIconSource = showCustom && draftHex ? { ...link, accent_color: draftHex } : link;

  const choose = (next: Mode) => {
    if (locked) return;
    if (next === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    apply(next === 'official' ? official : null);
  };

  const optionProps = (option: Mode) => ({
    type: 'button' as const,
    size: 'sm' as const,
    variant: mode === option ? ('secondary' as const) : ('outline' as const),
    'aria-pressed': mode === option,
    ...ariaDisabled(locked),
    'aria-describedby': describedBy,
    onClick: () => choose(option),
    className: ARIA_DISABLED_CLASS,
  });

  return (
    <div role="group" aria-label="Cor de destaque do ícone" className="space-y-3">
      <div className="flex items-center gap-2">
        <PreviewSquare
          testId="accent-preview-light"
          background={LIGHT.background}
          defaultColor={LIGHT.defaultColor}
          link={previewLink}
        />
        <PreviewSquare testId="accent-preview-dark" background={DARK.background} defaultColor={DARK.defaultColor} link={previewLink} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button {...optionProps('none')}>Sem cor</Button>
        {official && (
          <Button {...optionProps('official')}>
            <span aria-hidden="true" className="h-3 w-3 rounded-full border" style={{ backgroundColor: official }} />
            Cor oficial da marca
          </Button>
        )}
        <Button {...optionProps('custom')}>Escolher cor</Button>
      </div>

      {showCustom && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="accent-color-input" className="sr-only">
              Cor do ícone
            </Label>
            <input
              id="accent-color-input"
              ref={colorInputRef}
              type="color"
              value={draftHex ?? FALLBACK_CUSTOM}
              {...ariaDisabled(locked)}
              onClick={blockColorClick}
              onKeyDown={blockColorKey}
              onChange={(event) => {
                if (!locked) setDraft(event.target.value);
              }}
              className={cn('h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1', ARIA_DISABLED_CLASS)}
            />
            <Label htmlFor="accent-hex-input" className="sr-only">
              Código hex
            </Label>
            <Input
              id="accent-hex-input"
              value={draft}
              maxLength={9}
              spellCheck={false}
              autoComplete="off"
              readOnly={locked}
              {...ariaDisabled(locked)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'accent-hex-error' : undefined}
              onChange={(event) => {
                if (locked) return;
                hexEditedRef.current = true;
                setDraft(event.target.value);
                setError(null);
              }}
              onBlur={(event) => {
                if (hexEditedRef.current) commitDraft(event.currentTarget.value);
              }}
              onKeyDown={handleHexKeyDown}
              className={cn('w-28 font-mono', ARIA_DISABLED_CLASS)}
            />
          </div>
          <p id="accent-hex-error" role="alert" className="min-h-4 text-xs text-destructive">
            {error}
          </p>
        </div>
      )}

      {/* Sempre visível quando a cor não se aplica, mesmo durante a gravação */}
      {!appliesToIcon && (
        <p id={noteId} className="text-xs text-muted-foreground">
          {NOTE}
        </p>
      )}
    </div>
  );
}
