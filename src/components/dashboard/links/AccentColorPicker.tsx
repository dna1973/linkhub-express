import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkIcon } from '@/components/links/LinkIcon';
import { resolveLinkIcon } from '@/lib/linkIcons/resolve';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { normalizeHex } from '@/utils/linkButtonStyle';

export type AccentColorPickerProps = {
  url: string;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  accentColor: string | null | undefined;
  /** Hex oficial do ícone (getOfficialHex, calculado por quem usa o picker); null quando não há. */
  officialHex: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
};

type Mode = 'none' | 'official' | 'custom';

const LIGHT = { background: '#ffffff', defaultColor: '#1f2937' };
const DARK = { background: '#111827', defaultColor: '#f9fafb' };
const FALLBACK_CUSTOM = '#1f2937';
const NOTE = 'A cor vale para ícones de marca e da biblioteca';
const HEX_ERROR = 'Use uma cor no formato #rrggbb';

/** Aceita `#abc`, `abc`, `#aabbcc` e `aabbcc`, com espaços nas pontas. */
function parseHexInput(text: string): string | null {
  const value = text.trim();
  return normalizeHex(value.startsWith('#') ? value : `#${value}`);
}

function PreviewSquare({
  testId,
  background,
  defaultColor,
  link,
}: {
  testId: string;
  background: string;
  defaultColor: string;
  link: Parameters<typeof LinkIcon>[0]['link'];
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
  disabled,
  onChange,
}: AccentColorPickerProps) {
  const link = { url, icon_type: iconType, icon_value: iconValue, accent_color: accentColor };
  // O ícone efetivo: um auto sem marca vira favicon e também não aceita cor
  const appliesToIcon = resolveLinkIcon(link, { defaultColor: LIGHT.defaultColor, uploadPrefix: LINK_ICONS_PUBLIC_PREFIX }).kind === 'mask';
  const locked = disabled || !appliesToIcon;

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

  // O <input type="color"> dispara `input` a cada movimento: a cor só é gravada no `change` nativo
  const colorInputRef = useRef<HTMLInputElement>(null);
  const commitRef = useRef(commitDraft);
  commitRef.current = commitDraft;
  useEffect(() => {
    const input = colorInputRef.current;
    if (!input) return;
    const handleChange = () => commitRef.current(input.value);
    input.addEventListener('change', handleChange);
    return () => input.removeEventListener('change', handleChange);
  }, [mode]);

  const handleHexKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft(event.currentTarget.value);
    }
  };

  const draftHex = parseHexInput(draft) ?? FALLBACK_CUSTOM;

  return (
    <div role="group" aria-label="Cor de destaque do ícone" className="space-y-3">
      <div className="flex items-center gap-2">
        <PreviewSquare testId="accent-preview-light" background={LIGHT.background} defaultColor={LIGHT.defaultColor} link={link} />
        <PreviewSquare testId="accent-preview-dark" background={DARK.background} defaultColor={DARK.defaultColor} link={link} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'none' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'none'}
          disabled={locked}
          onClick={() => {
            setCustomOpen(false);
            apply(null);
          }}
        >
          Sem cor
        </Button>
        {official && (
          <Button
            type="button"
            size="sm"
            variant={mode === 'official' ? 'secondary' : 'outline'}
            aria-pressed={mode === 'official'}
            disabled={locked}
            onClick={() => {
              setCustomOpen(false);
              apply(official);
            }}
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full border" style={{ backgroundColor: official }} />
            Cor oficial da marca
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={mode === 'custom' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'custom'}
          disabled={locked}
          onClick={() => setCustomOpen(true)}
        >
          Escolher cor
        </Button>
      </div>

      {mode === 'custom' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="accent-color-input" className="sr-only">
              Cor do ícone
            </Label>
            <input
              id="accent-color-input"
              ref={colorInputRef}
              type="color"
              value={draftHex}
              disabled={locked}
              onChange={(event) => setDraft(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={locked}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'accent-hex-error' : undefined}
              onChange={(event) => {
                hexEditedRef.current = true;
                setDraft(event.target.value);
                setError(null);
              }}
              onBlur={(event) => {
                if (hexEditedRef.current) commitDraft(event.currentTarget.value);
              }}
              onKeyDown={handleHexKeyDown}
              className="w-28 font-mono"
            />
          </div>
          <p id="accent-hex-error" role="alert" className="min-h-4 text-xs text-destructive">
            {error}
          </p>
        </div>
      )}

      {!disabled && !appliesToIcon && <p className="text-xs text-muted-foreground">{NOTE}</p>}
    </div>
  );
}
