import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkIcon } from '@/components/links/LinkIcon';
import { cn } from '@/lib/utils';
import {
  COMMON_LUCIDE_ICONS,
  getBrandHex,
  loadBrandCatalog,
  loadLucideCatalog,
  type BrandEntry,
  type LucideEntry,
} from '@/lib/linkIcons/catalog';
import { DETECTION_TABLE, getFaviconUrl, getUrlHost } from '@/lib/linkIcons/detect';
import { isSingleEmoji } from '@/lib/linkIcons/emoji';
import { validateIconFile } from '@/lib/linkIcons/storage';
import type { IconType } from '@/lib/linkIcons/validate';

export type IconChoice = { icon_type: IconType; icon_value: string | null };

export type IconPickerProps = {
  /** URL do link: decide o automático e o favicon. */
  url: string;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  /** Só para a prévia do topo sair com a cor real. */
  accentColor?: string | null;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
  /** Recebe o arquivo já validado (o SVG original): converter e enviar fica com quem grava. */
  onUpload: (file: File) => Promise<void>;
};

type TabValue = 'brands' | 'icons' | 'emoji' | 'favicon' | 'upload';

type CatalogState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; entries: T[] };

/** Grade com fundo branco em qualquer tema: os ícones de marca pretos não somem no escuro. */
const GRID_DEFAULT_COLOR = '#1f2937';
const GRID_BACKGROUNDS = ['#ffffff'];
const MAX_RESULTS = 60;
const SEARCH_DEBOUNCE_MS = 200;
const ACCEPT = '.png,.webp,.svg,image/png,image/webp,image/svg+xml';

const BRAND_ERROR = 'Não foi possível carregar as marcas';
const LUCIDE_ERROR = 'Não foi possível carregar os ícones';
const EMOJI_ERROR = 'Use um único emoji';

// As marcas da detecção vêm da tabela (sempre existem), na ordem dela
const DETECTED_BRANDS: BrandEntry[] = DETECTION_TABLE.filter((entry) => entry.kind === 'brand').map((entry) => ({
  s: entry.value,
  t: entry.title,
  h: entry.hex ?? '',
}));

const TAB_BY_TYPE: Record<string, TabValue> = {
  brand: 'brands',
  lucide: 'icons',
  emoji: 'emoji',
  favicon: 'favicon',
  upload: 'upload',
};

/** Sem maiúsculas nem acentos (NFD). */
function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Carrega o catálogo quando `active` fica true; o cache do catalog.ts evita baixar de novo. */
function useCatalog<T>(active: boolean, load: () => Promise<T[]>, errorMessage: string) {
  const [state, setState] = useState<CatalogState<T>>({ status: 'idle' });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active || state.status !== 'idle') return;
    setState({ status: 'loading' });
    load().then(
      (entries) => mounted.current && setState({ status: 'ready', entries }),
      () => mounted.current && setState({ status: 'error', error: errorMessage }),
    );
  }, [active, state.status, load, errorMessage]);

  const retry = () => setState({ status: 'idle' });
  return { state, retry };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function IconSquare({ children, size = 36 }: { children: ReactNode; size?: number }) {
  return (
    <span
      data-icon-square=""
      className="flex shrink-0 items-center justify-center rounded-md border bg-white"
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

type GridItem = { key: string; label: string; type: 'brand' | 'lucide'; value: string; hex: string | null };

function IconGrid({
  items,
  testId,
  selectedType,
  selectedValue,
  disabled,
  onSelect,
}: {
  items: GridItem[];
  testId: string;
  selectedType: string | null | undefined;
  selectedValue: string | null | undefined;
  disabled?: boolean;
  onSelect: (item: GridItem) => void;
}) {
  return (
    <div data-testid={testId} className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto p-1 sm:grid-cols-8">
      {items.map((item) => {
        const pressed = selectedType === item.type && selectedValue === item.value;
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-pressed={pressed}
            title={item.label}
            disabled={disabled}
            onClick={() => onSelect(item)}
            className={cn(
              'flex items-center justify-center rounded-md p-0.5 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              pressed ? 'ring-2 ring-primary' : 'hover:bg-muted',
            )}
          >
            <IconSquare>
              <LinkIcon
                link={{ url: '', icon_type: item.type, icon_value: item.value, accent_color: item.hex }}
                defaultColor={GRID_DEFAULT_COLOR}
                backgrounds={GRID_BACKGROUNDS}
                size={22}
              />
            </IconSquare>
          </button>
        );
      })}
    </div>
  );
}

function LiveStatus({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function CatalogStatus<T>({
  state,
  count,
  singular,
  pluralForm,
  onRetry,
}: {
  state: CatalogState<T>;
  count: number;
  singular: string;
  pluralForm: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <LiveStatus>
        {state.status === 'error'
          ? state.error
          : state.status === 'ready'
            ? plural(count, singular, pluralForm)
            : 'Carregando…'}
      </LiveStatus>
      {state.status === 'error' && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

function BrandsPanel({
  state,
  onRetry,
  iconType,
  iconValue,
  disabled,
  onChange,
}: {
  state: CatalogState<BrandEntry>;
  onRetry: () => void;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
}) {
  const [query, setQuery] = useState('');
  const search = normalizeSearch(useDebounced(query, SEARCH_DEBOUNCE_MS));
  const catalog = state.status === 'ready' ? state.entries : null;

  const items = useMemo<GridItem[]>(() => {
    if (!catalog) return [];
    const bySlug = new Map(catalog.map((entry) => [entry.s, entry]));
    const detected = new Set(DETECTED_BRANDS.map((entry) => entry.s));
    // Detecção primeiro (com os apelidos do catálogo), depois o resto do catálogo
    const all = [
      ...DETECTED_BRANDS.map((entry) => ({ ...entry, a: bySlug.get(entry.s)?.a })),
      ...catalog.filter((entry) => !detected.has(entry.s)),
    ];
    const matches = search
      ? all.filter(
          (entry) =>
            normalizeSearch(entry.t).includes(search) ||
            (entry.a ?? []).some((alias) => normalizeSearch(alias).includes(search)),
        )
      : all;
    return matches.slice(0, MAX_RESULTS).map((entry) => ({
      key: entry.s,
      label: entry.t,
      type: 'brand',
      value: entry.s,
      // Hex oficial (tabela da detecção, depois o catálogo validado); a máscara ainda passa pelo contraste
      hex: getBrandHex(entry.s),
    }));
  }, [catalog, search]);

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker-brand-search" className="sr-only">
        Buscar marca
      </Label>
      <Input
        id="icon-picker-brand-search"
        type="search"
        placeholder="Buscar marca"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <CatalogStatus state={state} count={items.length} singular="marca" pluralForm="marcas" onRetry={onRetry} />
      {catalog && (
        <IconGrid
          items={items}
          testId="brand-grid"
          selectedType={iconType}
          selectedValue={iconValue}
          disabled={disabled}
          onSelect={(item) => onChange({ icon_type: 'brand', icon_value: item.value })}
        />
      )}
    </div>
  );
}

function IconsPanel({
  state,
  onRetry,
  iconType,
  iconValue,
  disabled,
  onChange,
}: {
  state: CatalogState<LucideEntry>;
  onRetry: () => void;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
}) {
  const [query, setQuery] = useState('');
  const search = normalizeSearch(useDebounced(query, SEARCH_DEBOUNCE_MS));
  const catalog = state.status === 'ready' ? state.entries : null;

  const names = useMemo<string[]>(() => {
    // A lista fixa não depende do catálogo: aparece já enquanto ele carrega
    if (!search) return COMMON_LUCIDE_ICONS;
    if (!catalog) return [];
    return catalog
      .filter(
        (entry) =>
          normalizeSearch(entry.n).includes(search) ||
          (entry.k ?? []).some((keyword) => normalizeSearch(keyword).includes(search)),
      )
      .slice(0, MAX_RESULTS)
      .map((entry) => entry.n);
  }, [catalog, search]);

  const items = names.map<GridItem>((name) => ({ key: name, label: name, type: 'lucide', value: name, hex: null }));

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker-lucide-search" className="sr-only">
        Buscar ícone
      </Label>
      <Input
        id="icon-picker-lucide-search"
        type="search"
        placeholder="Buscar ícone"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <CatalogStatus state={state} count={items.length} singular="ícone" pluralForm="ícones" onRetry={onRetry} />
      <IconGrid
        items={items}
        testId="lucide-grid"
        selectedType={iconType}
        selectedValue={iconValue}
        disabled={disabled}
        onSelect={(item) => onChange({ icon_type: 'lucide', icon_value: item.value })}
      />
    </div>
  );
}

function EmojiPanel({
  iconType,
  iconValue,
  disabled,
  onChange,
}: {
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
}) {
  const [value, setValue] = useState(iconType === 'emoji' && iconValue ? iconValue : '');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const emoji = value.trim();
    if (!isSingleEmoji(emoji)) {
      setError(EMOJI_ERROR);
      return;
    }
    setError(null);
    onChange({ icon_type: 'emoji', icon_value: emoji });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor="icon-picker-emoji">Emoji do link</Label>
      <div className="flex gap-2">
        <Input
          id="icon-picker-emoji"
          value={value}
          maxLength={32}
          placeholder="🚀"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'icon-picker-emoji-error' : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          className="w-24 text-center text-lg"
        />
        <Button type="submit" disabled={disabled}>
          Usar
        </Button>
      </div>
      <p id="icon-picker-emoji-error" role="alert" className="min-h-4 text-xs text-destructive">
        {error}
      </p>
    </form>
  );
}

function FaviconPanel({
  url,
  iconType,
  disabled,
  onChange,
}: {
  url: string;
  iconType: string | null | undefined;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
}) {
  const favicon = getFaviconUrl(url);
  const host = getUrlHost(url);

  return (
    <div className="space-y-3">
      {favicon ? (
        <div className="flex items-center gap-3">
          <span data-testid="favicon-preview">
            <IconSquare>
              <LinkIcon
                link={{ url, icon_type: 'favicon', icon_value: null }}
                defaultColor={GRID_DEFAULT_COLOR}
                backgrounds={GRID_BACKGROUNDS}
                size={22}
              />
            </IconSquare>
          </span>
          <p className="text-sm text-muted-foreground">Ícone do site {host}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este link não aponta para um site, então não há ícone do site para usar.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        aria-pressed={iconType === 'favicon'}
        disabled={disabled || !favicon}
        onClick={() => onChange({ icon_type: 'favicon', icon_value: null })}
      >
        Usar o ícone do site
      </Button>
    </div>
  );
}

function UploadPanel({ disabled, onUpload }: { disabled?: boolean; onUpload: (file: File) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Limpa para o mesmo arquivo poder ser escolhido de novo
    input.value = '';
    if (!file) return;
    const check = validateIconFile(file);
    if (check.ok === false) {
      setError(check.error);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (uploadError) {
      if (mounted.current) {
        setError(uploadError instanceof Error && uploadError.message ? uploadError.message : 'Não foi possível enviar a imagem');
      }
    } finally {
      if (mounted.current) setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker-upload">Arquivo do ícone</Label>
      <Input
        id="icon-picker-upload"
        type="file"
        accept={ACCEPT}
        disabled={disabled || uploading}
        aria-describedby="icon-picker-upload-hint icon-picker-upload-error"
        onChange={handleFile}
      />
      <p id="icon-picker-upload-hint" className="text-xs text-muted-foreground">
        PNG, WebP ou SVG, até 512 KB. O SVG é convertido em PNG.
      </p>
      <p aria-live="polite" className="flex min-h-4 items-center gap-1 text-xs text-muted-foreground">
        {uploading && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        )}
      </p>
      <p id="icon-picker-upload-error" role="alert" className="min-h-4 text-xs text-destructive">
        {error}
      </p>
    </div>
  );
}

/**
 * Seletor do ícone de um link (controlado): mostra a prévia e chama onChange/onUpload, sem gravar nada.
 * Todas as grades usam o quadrado branco do card do painel.
 */
export function IconPicker({ url, iconType, iconValue, accentColor, disabled, onChange, onUpload }: IconPickerProps) {
  const [tab, setTab] = useState<TabValue>(() => TAB_BY_TYPE[iconType ?? ''] ?? 'brands');
  const brands = useCatalog<BrandEntry>(tab === 'brands', loadBrandCatalog, BRAND_ERROR);
  const lucide = useCatalog<LucideEntry>(tab === 'icons', loadLucideCatalog, LUCIDE_ERROR);
  const isAuto = !iconType || iconType === 'auto';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span data-testid="icon-picker-preview">
          <IconSquare size={44}>
            <LinkIcon
              link={{ url, icon_type: iconType, icon_value: iconValue, accent_color: accentColor }}
              defaultColor={GRID_DEFAULT_COLOR}
              backgrounds={GRID_BACKGROUNDS}
              size={28}
              decorative={false}
            />
          </IconSquare>
        </span>
        <Button
          type="button"
          variant={isAuto ? 'secondary' : 'outline'}
          size="sm"
          aria-pressed={isAuto}
          disabled={disabled}
          onClick={() => onChange({ icon_type: 'auto', icon_value: null })}
        >
          Automático (pela URL)
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="brands">Marcas</TabsTrigger>
          <TabsTrigger value="icons">Ícones</TabsTrigger>
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="favicon">Favicon</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="brands">
          <BrandsPanel
            state={brands.state}
            onRetry={brands.retry}
            iconType={iconType}
            iconValue={iconValue}
            disabled={disabled}
            onChange={onChange}
          />
        </TabsContent>
        <TabsContent value="icons">
          <IconsPanel
            state={lucide.state}
            onRetry={lucide.retry}
            iconType={iconType}
            iconValue={iconValue}
            disabled={disabled}
            onChange={onChange}
          />
        </TabsContent>
        <TabsContent value="emoji">
          <EmojiPanel iconType={iconType} iconValue={iconValue} disabled={disabled} onChange={onChange} />
        </TabsContent>
        <TabsContent value="favicon">
          <FaviconPanel url={url} iconType={iconType} disabled={disabled} onChange={onChange} />
        </TabsContent>
        <TabsContent value="upload">
          <UploadPanel disabled={disabled} onUpload={onUpload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
