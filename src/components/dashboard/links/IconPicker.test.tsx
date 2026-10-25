// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { COMMON_LUCIDE_ICONS, resetCatalogCacheForTests, type BrandEntry, type LucideEntry } from '@/lib/linkIcons/catalog';
import { DETECTED_BRAND_SLUGS, DETECTION_TABLE } from '@/lib/linkIcons/detect';
import { BRAND_CATALOG_URL, LUCIDE_CATALOG_URL } from '@/lib/linkIcons/vendor';
import { IconPicker, type IconPickerProps } from './IconPicker';

const brandCatalog: BrandEntry[] = [
  { s: 'youtube', t: 'YouTube', h: '#ff0000' },
  { s: 'snapchat', t: 'Snapchat', h: '#fffc00' },
  { s: 'dotnet', t: '.NET', h: '#512bd4', a: ['dot net'] },
  { s: 'nubank', t: 'Nubank', h: '#820ad1', a: ['Banco Roxo'] },
  { s: 'cafe', t: 'Café', h: '#6f4e37' },
];

const lucideCatalog: LucideEntry[] = [
  ...COMMON_LUCIDE_ICONS.map((n) => ({ n, k: [] as string[] })),
  { n: 'rocket', k: ['foguete', 'lançamento'] },
  { n: 'anchor', k: ['âncora'] },
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetCatalogCacheForTests();
  fetchMock = vi.fn(async (url: string) => jsonResponse(url === BRAND_CATALOG_URL ? brandCatalog : lucideCatalog));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetCatalogCacheForTests();
});

function renderPicker(props: Partial<IconPickerProps> = {}) {
  const onChange = vi.fn();
  const onUpload = vi.fn(async (_file: File) => {});
  render(
    <IconPicker
      url="https://exemplo.com.br/pagina"
      iconType="auto"
      iconValue={null}
      accentColor={null}
      onChange={onChange}
      onUpload={onUpload}
      {...props}
    />,
  );
  return { onChange, onUpload };
}

const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }));
const maskOf = (button: HTMLElement) => button.querySelector('.link-icon-mask') as HTMLElement;
const searchBrands = (value: string) => fireEvent.change(screen.getByLabelText('Buscar marca'), { target: { value } });
const searchIcons = (value: string) => fireEvent.change(screen.getByLabelText('Buscar ícone'), { target: { value } });
const liveText = () => (document.querySelector('[aria-live="polite"]') as HTMLElement).textContent;

describe('IconPicker: topo', () => {
  it('mostra a prévia do ícone atual com a cor de destaque e volta a "Automático (pela URL)"', () => {
    const { onChange } = renderPicker({
      url: 'https://youtube.com/@canal',
      iconType: 'brand',
      iconValue: 'github',
      accentColor: '#0a66c2',
    });
    const preview = screen.getByTestId('icon-picker-preview');
    const mask = preview.querySelector('.link-icon-mask') as HTMLElement;
    expect(mask.style.maskImage).toContain('github.svg');
    expect(mask.style.backgroundColor).toBe('rgb(10, 102, 194)');

    const auto = screen.getByRole('button', { name: 'Automático (pela URL)' });
    expect(auto.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(auto);
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'auto', icon_value: null });
  });

  it('"Automático" fica pressionado quando o tipo é auto', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Automático (pela URL)' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('desabilitado, não grava nada', () => {
    const { onChange } = renderPicker({ disabled: true, iconType: 'brand', iconValue: 'github' });
    const auto = screen.getByRole('button', { name: 'Automático (pela URL)' }) as HTMLButtonElement;
    expect(auto.disabled).toBe(true);
    fireEvent.click(auto);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('IconPicker: Marcas', () => {
  it('carrega o catálogo uma vez e, com a busca vazia, mostra primeiro as marcas da detecção', async () => {
    renderPicker();
    expect(liveText()).toBe('Carregando…');
    await screen.findByRole('button', { name: 'Snapchat' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(BRAND_CATALOG_URL);

    const grid = screen.getByTestId('brand-grid');
    const labels = Array.from(grid.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    const detectedTitles = DETECTED_BRAND_SLUGS.map((slug) => DETECTION_TABLE.find((e) => e.value === slug)!.title);
    expect(detectedTitles).toHaveLength(13);
    expect(labels.slice(0, 13)).toEqual(detectedTitles);
    // O YouTube do catálogo não aparece duas vezes
    expect(labels.filter((label) => label === 'YouTube')).toHaveLength(1);
    expect(labels).toContain('Snapchat');
    expect(liveText()).toBe(`${labels.length} marcas`);
  });

  it('cada célula é um botão com aria-label, quadrado branco e a cor pela regra de contraste', async () => {
    renderPicker({ iconType: 'brand', iconValue: 'snapchat' });
    const snapchat = await screen.findByRole('button', { name: 'Snapchat' });
    expect(snapchat.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'YouTube' }).getAttribute('aria-pressed')).toBe('false');
    // #fffc00 no branco fica abaixo de 3:1 e cai em #1f2937
    expect(maskOf(snapchat).style.backgroundColor).toBe('rgb(31, 41, 55)');
    expect(maskOf(screen.getByRole('button', { name: 'YouTube' })).style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect((snapchat.querySelector('[data-icon-square]') as HTMLElement).className).toContain('bg-white');
  });

  it('clicar numa marca grava brand e o slug', async () => {
    const { onChange } = renderPicker();
    fireEvent.click(await screen.findByRole('button', { name: 'Snapchat' }));
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'brand', icon_value: 'snapchat' });
  });

  it('busca com debounce, por título sem acento e por apelido', async () => {
    renderPicker();
    await screen.findByRole('button', { name: 'YouTube' });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    searchBrands('cafe');
    // Antes dos 200 ms, a grade ainda é a da busca vazia
    expect(screen.getByRole('button', { name: 'YouTube' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('button', { name: 'Café' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'YouTube' })).toBeNull();
    expect(liveText()).toBe('1 marca');

    searchBrands('BANCO roxo');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('button', { name: 'Nubank' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Café' })).toBeNull();

    searchBrands('zzz');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByTestId('brand-grid').querySelectorAll('button')).toHaveLength(0);
    expect(liveText()).toBe('0 marcas');
  });

  it('mostra o erro do catálogo e tenta de novo', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse(null, false));
    renderPicker();
    await screen.findByText('Não foi possível carregar as marcas');
    expect(liveText()).toBe('Não foi possível carregar as marcas');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByRole('button', { name: 'Snapchat' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('IconPicker: Ícones', () => {
  it('com a busca vazia, mostra a lista fixa em #1f2937 no quadrado branco', async () => {
    renderPicker();
    openTab('Ícones');
    const grid = screen.getByTestId('lucide-grid');
    const labels = Array.from(grid.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(COMMON_LUCIDE_ICONS);
    const globe = screen.getByRole('button', { name: 'globe' });
    expect(maskOf(globe).style.backgroundColor).toBe('rgb(31, 41, 55)');
    expect((globe.querySelector('[data-icon-square]') as HTMLElement).className).toContain('bg-white');
    await screen.findByText(`${COMMON_LUCIDE_ICONS.length} ícones`);
    expect(fetchMock).toHaveBeenCalledWith(LUCIDE_CATALOG_URL);
  });

  it('busca por nome e por palavra-chave e grava lucide com o nome', async () => {
    const { onChange } = renderPicker({ iconType: 'lucide', iconValue: 'rocket' });
    openTab('Ícones');
    await screen.findByText(`${COMMON_LUCIDE_ICONS.length} ícones`);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    searchIcons('ancora');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('button', { name: 'anchor' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'globe' })).toBeNull();

    searchIcons('rock');
    act(() => vi.advanceTimersByTime(200));
    const rocket = screen.getByRole('button', { name: 'rocket' });
    expect(rocket.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(rocket);
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'lucide', icon_value: 'rocket' });
  });
});

describe('IconPicker: Emoji', () => {
  it('grava um emoji válido', () => {
    const { onChange } = renderPicker();
    openTab('Emoji');
    fireEvent.change(screen.getByLabelText('Emoji do link'), { target: { value: '🚀' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar' }));
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'emoji', icon_value: '🚀' });
  });

  it('recusa texto e dois emojis', () => {
    const { onChange } = renderPicker();
    openTab('Emoji');
    for (const value of ['oi', '😀😀']) {
      fireEvent.change(screen.getByLabelText('Emoji do link'), { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Usar' }));
      expect(screen.getByText('Use um único emoji')).toBeTruthy();
    }
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('IconPicker: Favicon', () => {
  it('mostra o favicon do domínio e grava favicon', () => {
    const { onChange } = renderPicker({ url: 'https://www.exemplo.com.br/x' });
    openTab('Favicon');
    const img = screen.getByTestId('favicon-preview').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('domain=exemplo.com.br');
    fireEvent.click(screen.getByRole('button', { name: 'Usar o ícone do site' }));
    expect(onChange).toHaveBeenCalledWith({ icon_type: 'favicon', icon_value: null });
  });

  it.each(['mailto:eu@exemplo.com', 'tel:+5511999999999', 'não é url'])('avisa que %s não tem site', (url) => {
    const { onChange } = renderPicker({ url });
    openTab('Favicon');
    expect(screen.getByText(/não aponta para um site/)).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Usar o ícone do site' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('IconPicker: Upload', () => {
  const fileInput = () => screen.getByLabelText('Arquivo do ícone') as HTMLInputElement;
  const pick = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } });

  it('aceita só PNG, WebP e SVG no seletor', () => {
    renderPicker();
    openTab('Upload');
    expect(fileInput().getAttribute('accept')).toBe('.png,.webp,.svg,image/png,image/webp,image/svg+xml');
  });

  it('recusa arquivo de 600 KB', () => {
    const { onUpload } = renderPicker();
    openTab('Upload');
    pick(new File([new Uint8Array(600 * 1024)], 'grande.png', { type: 'image/png' }));
    expect(screen.getByText('A imagem deve ter no máximo 512 KB')).toBeTruthy();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('recusa .gif', () => {
    const { onUpload } = renderPicker();
    openTab('Upload');
    pick(new File(['GIF89a'], 'anim.gif', { type: 'image/gif' }));
    expect(screen.getByText('Use PNG, WebP ou SVG')).toBeTruthy();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('repassa o SVG original para o onUpload (a conversão fica com quem grava)', async () => {
    const { onUpload } = renderPicker();
    openTab('Upload');
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'], 'logo.svg', {
      type: 'image/svg+xml',
    });
    pick(svg);
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0]).toBe(svg);
    await act(async () => {});
  });

  it('mostra o erro do onUpload', async () => {
    const onUpload = vi.fn(async () => {
      throw new Error('Falha no envio');
    });
    renderPicker({ onUpload });
    openTab('Upload');
    pick(new File([new Uint8Array(10)], 'ok.png', { type: 'image/png' }));
    expect(await screen.findByText('Falha no envio')).toBeTruthy();
  });
});
