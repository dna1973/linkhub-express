import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
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
import { BRAND_SLUG_RE, LUCIDE_NAME_RE } from '@/lib/linkIcons/vendor';

export type IconChoice = { icon_type: IconType; icon_value: string | null };

export type IconPickerProps = {
  /** URL do link: decide o automático e o favicon. */
  url: string;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  /** Só para a prévia do topo sair com a cor real. */
  accentColor?: string | null;
  /**
   * Durante a gravação: os controles ficam com aria-disabled e ignoram clique e tecla, sem o
   * disabled nativo, para o foco não cair no body (só o input de arquivo usa o nativo).
   */
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

/** Entrada pronta para a busca: os textos já normalizados ficam em `haystack`. */
type IndexedItem = { value: string; label: string; haystack: string[] };

type GridItem = { value: string; label: string; hex: string | null };

/** Grade com fundo branco em qualquer tema: os ícones de marca pretos não somem no escuro. */
const GRID_DEFAULT_COLOR = '#1f2937';
const GRID_BACKGROUNDS = ['#ffffff'];
const MAX_RESULTS = 60;
const SEARCH_DEBOUNCE_MS = 200;
const ACCEPT = '.png,.webp,.svg,image/png,image/webp,image/svg+xml';
/** Visual de desabilitado para quem usa aria-disabled no lugar do disabled nativo. */
const ARIA_DISABLED_CLASS = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const BRAND_ERROR = 'Não foi possível carregar as marcas';
const LUCIDE_ERROR = 'Não foi possível carregar os ícones';
const EMOJI_ERROR = 'Use um único emoji';

const TAB_BY_TYPE: Record<string, TabValue> = {
  brand: 'brands',
  lucide: 'icons',
  emoji: 'emoji',
  favicon: 'favicon',
  upload: 'upload',
};

/** Sem maiúsculas nem acentos (NFD). */
function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isText) : []);

// As marcas da detecção vêm da tabela (sempre existem), na ordem dela
const DETECTED_BRANDS = DETECTION_TABLE.filter((entry) => entry.kind === 'brand').map((entry) => ({
  slug: entry.value,
  title: entry.title,
}));

/** Detecção primeiro (com os apelidos do catálogo), depois o resto do catálogo; ignora entradas malformadas. */
function buildBrandIndex(catalog: BrandEntry[] | null): IndexedItem[] {
  const valid = (catalog ?? []).filter((entry) => entry && isText(entry.s) && BRAND_SLUG_RE.test(entry.s) && isText(entry.t));
  const bySlug = new Map(valid.map((entry) => [entry.s, entry]));
  const detected = new Set(DETECTED_BRANDS.map((entry) => entry.slug));
  const index = (value: string, label: string, aliases: string[]): IndexedItem => ({
    value,
    label,
    haystack: [label, ...aliases].map(normalizeSearch),
  });
  return [
    ...DETECTED_BRANDS.map((entry) => index(entry.slug, entry.title, textList(bySlug.get(entry.slug)?.a))),
    ...valid.filter((entry) => !detected.has(entry.s)).map((entry) => index(entry.s, entry.t, textList(entry.a))),
  ];
}

function buildLucideIndex(catalog: LucideEntry[] | null): IndexedItem[] {
  return (catalog ?? [])
    .filter((entry) => entry && isText(entry.n) && LUCIDE_NAME_RE.test(entry.n))
    .map((entry) => ({ value: entry.n, label: entry.n, haystack: [entry.n, ...textList(entry.k)].map(normalizeSearch) }));
}

/**
 * Até 60 itens. O item atual que ficaria de fora (mas casa com a busca) vai para o topo;
 * `pinned` cobre o atual que nem está na lista (catálogo carregando, ícone fora da lista fixa).
 */
function limitResults(matches: IndexedItem[], currentValue: string | null, pinned: IndexedItem | null) {
  let shown = matches.slice(0, MAX_RESULTS);
  let total = matches.length;
  if (currentValue && !shown.some((item) => item.value === currentValue)) {
    const current = matches.find((item) => item.value === currentValue) ?? pinned;
    if (current) {
      if (current === pinned) total += 1;
      shown = [current, ...shown.slice(0, MAX_RESULTS - 1)];
    }
  }
  return { shown, total };
}

function formatCount(shown: number, total: number, singular: string, pluralForm: string): string {
  if (total > shown) return `${shown} de ${total} ${pluralForm}`;
  return `${shown} ${shown === 1 ? singular : pluralForm}`;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/** Carrega o catálogo quando `active` fica true; o cache do catalog.ts evita baixar de novo. */
function useCatalog<T>(active: boolean, load: () => Promise<T[]>, errorMessage: string) {
  const [state, setState] = useState<CatalogState<T>>({ status: 'idle' });
  const mounted = useMountedRef();

  useEffect(() => {
    if (!active || state.status !== 'idle') return;
    setState({ status: 'loading' });
    load().then(
      (entries) => mounted.current && setState({ status: 'ready', entries }),
      () => mounted.current && setState({ status: 'error', error: errorMessage }),
    );
  }, [active, state.status, load, errorMessage, mounted]);

  const retry = useCallback(() => setState({ status: 'idle' }), []);
  return { state, retry };
}

/** aria-disabled no lugar do disabled nativo: o foco fica onde está durante a gravação. */
const ariaDisabled = (disabled: boolean | undefined) => (disabled ? { 'aria-disabled': true as const } : {});

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

type IconGridProps = {
  items: GridItem[];
  type: 'brand' | 'lucide';
  testId: string;
  selectedValue: string | null;
  disabled?: boolean;
  onSelect: (value: string) => void;
};

// memo: com 60 máscaras, a grade só redesenha quando os itens, a seleção ou o disabled mudam
const IconGrid = memo(function IconGrid({ items, type, testId, selectedValue, disabled, onSelect }: IconGridProps) {
  return (
    <div data-testid={testId} className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto p-1 sm:grid-cols-8">
      {items.map((item) => {
        const pressed = selectedValue === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            aria-pressed={pressed}
            {...ariaDisabled(disabled)}
            title={item.label}
            onClick={() => {
              if (!disabled) onSelect(item.value);
            }}
            className={cn(
              // Selecionado pela borda; foco pelo anel com afastamento: os dois se distinguem
              'flex items-center justify-center rounded-lg border-2 p-0.5 ring-offset-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pressed ? 'border-primary' : 'border-transparent hover:bg-muted',
              ARIA_DISABLED_CLASS,
            )}
          >
            <IconSquare>
              <LinkIcon
                link={{ url: '', icon_type: type, icon_value: item.value, accent_color: item.hex }}
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
});

function LiveStatus({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function CatalogStatus<T>({
  state,
  message,
  onRetry,
}: {
  state: CatalogState<T>;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <LiveStatus>{state.status === 'error' ? state.error : state.status === 'ready' ? message : 'Carregando…'}</LiveStatus>
      {state.status === 'error' && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

function SearchInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      {/* type="text": no type="search", o Esc limpa o campo e ainda fecha o Dialog */}
      <Input
        id={id}
        type="text"
        placeholder={label}
        autoComplete="off"
        value={value}
        readOnly={disabled}
        {...ariaDisabled(disabled)}
        onChange={(event) => {
          if (!disabled) onChange(event.target.value);
        }}
        className={ARIA_DISABLED_CLASS}
      />
    </>
  );
}

type PanelProps<T> = {
  state: CatalogState<T>;
  onRetry: () => void;
  iconType: string | null | undefined;
  iconValue: string | null | undefined;
  disabled?: boolean;
  onChange: (choice: IconChoice) => void;
};

function BrandsPanel({ state, onRetry, iconType, iconValue, disabled, onChange }: PanelProps<BrandEntry>) {
  const [query, setQuery] = useState('');
  const search = normalizeSearch(useDebounced(query, SEARCH_DEBOUNCE_MS));
  const catalog = state.status === 'ready' ? state.entries : null;
  // Sem catálogo (carregando ou com erro), o índice tem só as marcas da detecção
  const index = useMemo(() => buildBrandIndex(catalog), [catalog]);
  const currentValue = iconType === 'brand' && iconValue && BRAND_SLUG_RE.test(iconValue) ? iconValue : null;

  const { items, message } = useMemo(() => {
    const matches = search ? index.filter((item) => item.haystack.some((text) => text.includes(search))) : index;
    // O slug atual fora do índice (catálogo ainda não carregado) entra com o próprio slug
    const pinned = !search && currentValue ? { value: currentValue, label: currentValue, haystack: [] } : null;
    const { shown, total } = limitResults(matches, currentValue, pinned);
    return {
      items: shown.map<GridItem>((item) => ({
        value: item.value,
        label: item.label,
        // Hex oficial (tabela da detecção, depois o catálogo validado); a máscara ainda passa pelo contraste
        hex: getBrandHex(item.value),
      })),
      message: formatCount(shown.length, total, 'marca', 'marcas'),
    };
  }, [index, search, currentValue]);

  const handleSelect = useCallback((value: string) => onChange({ icon_type: 'brand', icon_value: value }), [onChange]);

  return (
    <div className="space-y-2">
      <SearchInput id="icon-picker-brand-search" label="Buscar marca" value={query} disabled={disabled} onChange={setQuery} />
      <CatalogStatus state={state} message={message} onRetry={onRetry} />
      <IconGrid
        items={items}
        type="brand"
        testId="brand-grid"
        selectedValue={currentValue}
        disabled={disabled}
        onSelect={handleSelect}
      />
    </div>
  );
}

const COMMON_LUCIDE_ITEMS: IndexedItem[] = COMMON_LUCIDE_ICONS.map((name) => ({ value: name, label: name, haystack: [name] }));

function IconsPanel({ state, onRetry, iconType, iconValue, disabled, onChange }: PanelProps<LucideEntry>) {
  const [query, setQuery] = useState('');
  const search = normalizeSearch(useDebounced(query, SEARCH_DEBOUNCE_MS));
  const catalog = state.status === 'ready' ? state.entries : null;
  const index = useMemo(() => buildLucideIndex(catalog), [catalog]);
  const currentValue = iconType === 'lucide' && iconValue && LUCIDE_NAME_RE.test(iconValue) ? iconValue : null;

  const { items, message } = useMemo(() => {
    // A lista fixa não depende do catálogo: aparece já enquanto ele carrega
    const matches = search ? index.filter((item) => item.haystack.some((text) => text.includes(search))) : COMMON_LUCIDE_ITEMS;
    const pinned = !search && currentValue ? { value: currentValue, label: currentValue, haystack: [] } : null;
    const { shown, total } = limitResults(matches, currentValue, pinned);
    return {
      items: shown.map<GridItem>((item) => ({ value: item.value, label: item.label, hex: null })),
      message: formatCount(shown.length, total, 'ícone', 'ícones'),
    };
  }, [index, search, currentValue]);

  const handleSelect = useCallback((value: string) => onChange({ icon_type: 'lucide', icon_value: value }), [onChange]);

  return (
    <div className="space-y-2">
      <SearchInput id="icon-picker-lucide-search" label="Buscar ícone" value={query} disabled={disabled} onChange={setQuery} />
      <CatalogStatus state={state} message={message} onRetry={onRetry} />
      <IconGrid
        items={items}
        type="lucide"
        testId="lucide-grid"
        selectedValue={currentValue}
        disabled={disabled}
        onSelect={handleSelect}
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

  // Sem <form>: o picker fica dentro do formulário do modal de edição
  const submit = () => {
    if (disabled) return;
    const emoji = value.trim();
    if (!isSingleEmoji(emoji)) {
      setError(EMOJI_ERROR);
      return;
    }
    setError(null);
    onChange({ icon_type: 'emoji', icon_value: emoji });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker-emoji">Emoji do link</Label>
      <div className="flex gap-2">
        <Input
          id="icon-picker-emoji"
          value={value}
          maxLength={32}
          placeholder="🚀"
          autoComplete="off"
          readOnly={disabled}
          {...ariaDisabled(disabled)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'icon-picker-emoji-error' : undefined}
          onChange={(event) => {
            if (disabled) return;
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          className={cn('w-24 text-center text-lg', ARIA_DISABLED_CLASS)}
        />
        <Button type="button" {...ariaDisabled(disabled)} onClick={submit} className={ARIA_DISABLED_CLASS}>
          Usar
        </Button>
      </div>
      <p id="icon-picker-emoji-error" role="alert" className="min-h-4 text-xs text-destructive">
        {error}
      </p>
    </div>
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
  const unavailable = disabled || !favicon;

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
        <p id="icon-picker-favicon-missing" className="text-sm text-muted-foreground">
          Este link não aponta para um site, então não há ícone do site para usar.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        aria-pressed={iconType === 'favicon'}
        {...ariaDisabled(unavailable)}
        aria-describedby={favicon ? undefined : 'icon-picker-favicon-missing'}
        onClick={() => {
          if (!unavailable) onChange({ icon_type: 'favicon', icon_value: null });
        }}
        className={ARIA_DISABLED_CLASS}
      >
        Usar o ícone do site
      </Button>
    </div>
  );
}

function UploadPanel({ disabled, onUpload }: { disabled?: boolean; onUpload: (file: File) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mounted = useMountedRef();

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
      {/* O único controle com o disabled nativo: o seletor de arquivo não pode abrir durante a gravação */}
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
          {...ariaDisabled(disabled)}
          onClick={() => {
            if (!disabled) onChange({ icon_type: 'auto', icon_value: null });
          }}
          className={ARIA_DISABLED_CLASS}
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
