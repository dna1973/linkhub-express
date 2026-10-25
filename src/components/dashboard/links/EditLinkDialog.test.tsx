// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetCatalogCacheForTests, type BrandEntry } from '@/lib/linkIcons/catalog';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { BRAND_CATALOG_URL } from '@/lib/linkIcons/vendor';
import { EditLinkDialog, type EditLinkDialogProps, type EditableLink } from './EditLinkDialog';

const OLD_UPLOAD_PATH = 'u1/5-111.png';
const OLD_UPLOAD_URL = `${LINK_ICONS_PUBLIC_PREFIX}${OLD_UPLOAD_PATH}`;

const mocks = vi.hoisted(() => {
  const storage = { upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn() };
  return {
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    // update(values) e eq(column, value) num só registro, com o { error } controlável
    update: vi.fn(),
    prepareIconUpload: vi.fn(),
    // Último data/callback/enabled que o diálogo passou ao useAutosave (o teste salva na mão)
    autosave: null as null | { data: { title: string; url: string }; save: (data: unknown) => Promise<void>; enabled: boolean },
    // Últimas props dos seletores: chamar o onChange direto testa valores que a interface não produz
    iconPicker: null as null | { onChange: (choice: { icon_type: string; icon_value: string | null }) => void },
    accentPicker: null as null | { onChange: (color: string | null) => void },
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: (data: { title: string; url: string }, save: (data: unknown) => Promise<void>, _delay: number, enabled: boolean) => {
    mocks.autosave = { data, save, enabled };
    return 'idle';
  },
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: mocks.storageFrom },
    from: vi.fn((table: string) => ({
      update: (values: unknown) => ({ eq: async (column: string, value: unknown) => mocks.update(table, values, column, value) }),
    })),
  },
}));
vi.mock('./IconPicker', async (importOriginal) => {
  const React = await import('react');
  const mod = await importOriginal<typeof import('./IconPicker')>();
  return {
    ...mod,
    IconPicker: (props: Parameters<typeof mod.IconPicker>[0]) => {
      mocks.iconPicker = props as never;
      return React.createElement(mod.IconPicker, props);
    },
  };
});
vi.mock('./AccentColorPicker', async (importOriginal) => {
  const React = await import('react');
  const mod = await importOriginal<typeof import('./AccentColorPicker')>();
  return {
    ...mod,
    AccentColorPicker: (props: Parameters<typeof mod.AccentColorPicker>[0]) => {
      mocks.accentPicker = props as never;
      return React.createElement(mod.AccentColorPicker, props);
    },
  };
});
vi.mock('@/lib/linkIcons/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/linkIcons/storage')>()),
  prepareIconUpload: mocks.prepareIconUpload,
}));

const brandCatalog: BrandEntry[] = [
  { s: 'youtube', t: 'YouTube', h: '#ff0000' },
  { s: 'instagram', t: 'Instagram', h: '#ff0069' },
  { s: 'nubank', t: 'Nubank', h: '#820ad1' },
];

const preparedBlob = new Blob(['png'], { type: 'image/png' });

const baseLink: EditableLink = {
  id: 5,
  title: 'Canal',
  url: 'https://youtube.com/@canal',
  icon_type: 'brand',
  icon_value: 'youtube',
  accent_color: null,
};

let fetchMock: ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

beforeEach(() => {
  resetCatalogCacheForTests();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (url === BRAND_CATALOG_URL ? brandCatalog : []),
  }));
  vi.stubGlobal('fetch', fetchMock);
  mocks.toast.mockReset();
  mocks.autosave = null;
  mocks.iconPicker = null;
  mocks.accentPicker = null;
  mocks.storageFrom.mockClear();
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.storage.upload.mockReset().mockResolvedValue({ data: {}, error: null });
  mocks.storage.remove.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.storage.getPublicUrl
    .mockReset()
    .mockImplementation((path: string) => ({ data: { publicUrl: `${LINK_ICONS_PUBLIC_PREFIX}${path}` } }));
  mocks.prepareIconUpload.mockReset().mockResolvedValue({ blob: preparedBlob, ext: 'png', contentType: 'image/png' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetCatalogCacheForTests();
});

function renderDialog(link: Partial<EditableLink> = {}, props: Partial<EditLinkDialogProps> = {}) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const full = { ...baseLink, ...link };
  const view = render(
    <EditLinkDialog open link={full} userId="u1" onOpenChange={onOpenChange} onSaved={onSaved} {...props} />,
  );
  return { ...view, onSaved, onOpenChange, link: full };
}

const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }));
const titleInput = () => screen.getByLabelText('Título') as HTMLInputElement;
const urlInput = () => screen.getByLabelText('URL') as HTMLInputElement;
const autoButton = () => screen.getByRole('button', { name: 'Automático (pela URL)' }) as HTMLButtonElement;
// Vale o disabled nativo ou o aria-disabled (os seletores podem usar qualquer um)
const isDisabled = (el: HTMLElement) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
const previewMask = () => screen.getByTestId('icon-picker-preview').querySelector('.link-icon-mask') as HTMLElement;
const iconUpdates = () => mocks.update.mock.calls.map((call) => call[1]);

describe('EditLinkDialog: título e URL', () => {
  it('abre com o título e a URL do link', () => {
    renderDialog();
    expect(titleInput().value).toBe('Canal');
    expect(urlInput().value).toBe('https://youtube.com/@canal');
    expect(mocks.autosave?.data).toEqual({ title: 'Canal', url: 'https://youtube.com/@canal' });
    expect(mocks.autosave?.enabled).toBe(true);
  });

  it('o salvamento automático grava o título sanitizado e a URL limpa', async () => {
    const { onSaved } = renderDialog();
    fireEvent.change(titleInput(), { target: { value: '<b>Meu canal</b>' } });
    fireEvent.change(urlInput(), { target: { value: ' https://youtube.com/@outro ' } });
    // Nada é gravado a cada tecla
    expect(mocks.update).not.toHaveBeenCalled();

    await act(() => mocks.autosave!.save(mocks.autosave!.data));
    expect(mocks.update).toHaveBeenCalledWith(
      'links',
      { title: 'Meu canal', url: 'https://youtube.com/@outro' },
      'id',
      5,
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('URL inválida avisa e pausa o salvamento automático', () => {
    renderDialog();
    fireEvent.change(urlInput(), { target: { value: 'javascript:alert(1)' } });
    expect(screen.getByText('Corrija a URL para salvar')).toBeTruthy();
    expect(mocks.autosave?.enabled).toBe(false);
  });

  it('título vazio avisa e pausa o salvamento automático', () => {
    renderDialog();
    fireEvent.change(titleInput(), { target: { value: '   ' } });
    expect(screen.getByText('O título não pode ficar vazio')).toBeTruthy();
    expect(mocks.autosave?.enabled).toBe(false);
  });

  it('erro do salvamento automático é repassado ao useAutosave', async () => {
    mocks.update.mockReturnValue({ error: { message: 'falhou' } });
    const { onSaved } = renderDialog();
    fireEvent.change(titleInput(), { target: { value: 'Outro' } });
    await expect(mocks.autosave!.save(mocks.autosave!.data)).rejects.toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('o estado só é reiniciado quando abre ou quando muda o id do link', () => {
    const { rerender, onSaved, onOpenChange } = renderDialog();
    fireEvent.change(titleInput(), { target: { value: 'Digitando' } });

    // O onSaved recarrega a lista e entrega um objeto novo do mesmo link: o que está sendo digitado fica
    rerender(
      <EditLinkDialog open link={{ ...baseLink, title: 'Canal' }} userId="u1" onOpenChange={onOpenChange} onSaved={onSaved} />,
    );
    expect(titleInput().value).toBe('Digitando');

    // Outro link: recomeça com os dados dele
    rerender(
      <EditLinkDialog
        open
        link={{ ...baseLink, id: 6, title: 'Site', url: 'https://exemplo.com.br' }}
        userId="u1"
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />,
    );
    expect(titleInput().value).toBe('Site');
    expect(urlInput().value).toBe('https://exemplo.com.br');
  });
});

describe('EditLinkDialog: ícone gravado na hora', () => {
  it('escolher um ícone grava na hora e desabilita os seletores durante a gravação', async () => {
    let finish: (value: { error: null }) => void = () => {};
    mocks.update.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onSaved } = renderDialog();
    openTab('Ícones');
    fireEvent.click(screen.getByRole('button', { name: 'star' }));
    // Desabilitado já no clique, antes de a fila chamar o update
    expect(isDisabled(autoButton())).toBe(true);

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        'links',
        { icon_type: 'lucide', icon_value: 'star', accent_color: null },
        'id',
        5,
      ),
    );
    expect(isDisabled(autoButton())).toBe(true);
    expect(screen.getByText('Gravando…')).toBeTruthy();
    expect(isDisabled(screen.getByRole('button', { name: 'Sem cor' }))).toBe(true);

    await act(async () => finish({ error: null }));
    expect(isDisabled(autoButton())).toBe(false);
    expect(screen.queryByText('Gravando…')).toBeNull();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(previewMask().style.maskImage).toContain('star.svg');
  });

  it('erro na gravação desfaz a escolha e mostra o toast', async () => {
    mocks.update.mockReturnValue({ error: { message: 'falhou' } });
    const { onSaved } = renderDialog();
    openTab('Ícones');
    fireEvent.click(screen.getByRole('button', { name: 'star' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(previewMask().style.maskImage).toContain('youtube.svg');
    expect(isDisabled(autoButton())).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('a cor oficial acompanha a troca de marca no mesmo update', async () => {
    renderDialog({ accent_color: '#ff0000' });
    fireEvent.click(await screen.findByRole('button', { name: 'Instagram' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ icon_type: 'brand', icon_value: 'instagram', accent_color: '#ff0069' });
  });

  it('a cor oficial vira null quando o ícone novo não tem hex', async () => {
    renderDialog({ accent_color: '#ff0000' });
    openTab('Ícones');
    fireEvent.click(screen.getByRole('button', { name: 'star' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ icon_type: 'lucide', icon_value: 'star', accent_color: null });
  });

  it('a cor escolhida à mão não é mexida na troca de marca', async () => {
    renderDialog({ accent_color: '#123456' });
    fireEvent.click(await screen.findByRole('button', { name: 'Instagram' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ icon_type: 'brand', icon_value: 'instagram', accent_color: '#123456' });
  });

  it('a cor também é gravada na hora', async () => {
    const { onSaved } = renderDialog({ accent_color: '#ff0000' });
    fireEvent.click(screen.getByRole('button', { name: 'Sem cor' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(mocks.update).toHaveBeenCalledWith('links', { accent_color: null }, 'id', 5);
  });

  it('erro ao gravar a cor desfaz e mostra o toast', async () => {
    mocks.update.mockReturnValue({ error: { message: 'falhou' } });
    renderDialog({ accent_color: '#ff0000' });
    fireEvent.click(screen.getByRole('button', { name: 'Sem cor' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.getByRole('button', { name: /Cor oficial da marca/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('trocar de upload para marca apaga o arquivo antigo depois do update', async () => {
    const { onSaved } = renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    openTab('Marcas');
    fireEvent.click(await screen.findByRole('button', { name: 'YouTube' }));

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith([OLD_UPLOAD_PATH]));
    expect(iconUpdates()[0]).toEqual({ icon_type: 'brand', icon_value: 'youtube', accent_color: null });
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-link-icons');
    expect(mocks.storage.remove.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.update.mock.invocationCallOrder[0]);
    expect(onSaved).toHaveBeenCalled();
  });

  it('se o update falhar, o arquivo antigo fica', async () => {
    mocks.update.mockReturnValue({ error: { message: 'falhou' } });
    renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    openTab('Marcas');
    fireEvent.click(await screen.findByRole('button', { name: 'YouTube' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('falha ao apagar o arquivo antigo vai só para o console', async () => {
    mocks.storage.remove.mockResolvedValue({ data: null, error: new Error('sem permissão') });
    renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    openTab('Marcas');
    fireEvent.click(await screen.findByRole('button', { name: 'YouTube' }));

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error removing link icon:', expect.anything()));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('EditLinkDialog: upload', () => {
  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText('Arquivo do ícone'), { target: { files: [file] } });
  const pngFile = () => new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });

  it('envia o arquivo preparado, grava e só depois apaga o anterior', async () => {
    const { onSaved } = renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    const file = pngFile();
    pick(file);

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalled());
    expect(mocks.prepareIconUpload).toHaveBeenCalledWith(file);
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-link-icons');

    const [path, blob, options] = mocks.storage.upload.mock.calls[0];
    expect(path).toMatch(/^u1\/5-\d+\.png$/);
    expect(blob).toBe(preparedBlob);
    expect(options).toEqual({ contentType: 'image/png' });

    expect(iconUpdates()[0]).toEqual({
      icon_type: 'upload',
      icon_value: `${LINK_ICONS_PUBLIC_PREFIX}${path}`,
      accent_color: null,
    });
    expect(mocks.storage.remove).toHaveBeenCalledWith([OLD_UPLOAD_PATH]);

    const upload = mocks.storage.upload.mock.invocationCallOrder[0];
    const update = mocks.update.mock.invocationCallOrder[0];
    const remove = mocks.storage.remove.mock.invocationCallOrder[0];
    expect(upload).toBeLessThan(update);
    expect(update).toBeLessThan(remove);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('primeiro upload não apaga nada', async () => {
    const { onSaved } = renderDialog();
    openTab('Upload');
    pick(pngFile());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual(expect.objectContaining({ icon_type: 'upload' }));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('falha do update apaga o arquivo novo e mostra o erro no seletor, sem toast', async () => {
    mocks.update.mockReturnValue({ error: { message: 'falhou' } });
    const { onSaved } = renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    pick(pngFile());

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalled());
    const [newPath] = mocks.storage.upload.mock.calls[0];
    expect(mocks.storage.remove).toHaveBeenCalledTimes(1);
    expect(mocks.storage.remove).toHaveBeenCalledWith([newPath]);
    expect(await screen.findByText('Não foi possível salvar o ícone enviado. Tente de novo.')).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    // O ícone continua o anterior
    const img = screen.getByTestId('icon-picker-preview').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(OLD_UPLOAD_URL);
  });

  it('falha do envio não grava nada e mostra o erro no seletor, sem toast', async () => {
    mocks.storage.upload.mockResolvedValue({ data: null, error: { message: 'cheio' } });
    renderDialog();
    openTab('Upload');
    pick(pngFile());

    expect(await screen.findByText('Não foi possível enviar a imagem. Tente de novo.')).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('erro do preparo aparece no seletor e não envia nada', async () => {
    mocks.prepareIconUpload.mockRejectedValue(new Error('Não foi possível converter este SVG'));
    renderDialog();
    openTab('Upload');
    pick(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    expect(await screen.findByText('Não foi possível converter este SVG')).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.storage.upload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('EditLinkDialog: URL de um ícone automático', () => {
  const autoLink = { icon_type: 'auto', icon_value: null } as const;

  it('trocar a URL só ajusta a cor dentro do salvamento automático', async () => {
    renderDialog({ ...autoLink, accent_color: '#ff0000' });
    // No meio da digitação nada é gravado, nem a cor
    fireEvent.change(urlInput(), { target: { value: 'https://youtube.co' } });
    fireEvent.change(urlInput(), { target: { value: 'https://instagram.com/perfil' } });
    expect(mocks.update).not.toHaveBeenCalled();

    await act(() => mocks.autosave!.save(mocks.autosave!.data));
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(iconUpdates()[0]).toEqual({ title: 'Canal', url: 'https://instagram.com/perfil', accent_color: '#ff0069' });
  });

  it('URL sem marca tira a cor oficial', async () => {
    renderDialog({ ...autoLink, accent_color: '#ff0000' });
    fireEvent.change(urlInput(), { target: { value: 'https://exemplo.com.br' } });

    await act(() => mocks.autosave!.save(mocks.autosave!.data));
    expect(iconUpdates()[0]).toEqual({ title: 'Canal', url: 'https://exemplo.com.br', accent_color: null });
  });

  it('cor escolhida à mão não é mexida', async () => {
    renderDialog({ ...autoLink, accent_color: '#123456' });
    fireEvent.change(urlInput(), { target: { value: 'https://instagram.com/perfil' } });

    await act(() => mocks.autosave!.save(mocks.autosave!.data));
    expect(iconUpdates()[0]).toEqual({ title: 'Canal', url: 'https://instagram.com/perfil' });
  });

  it('ícone escolhido (não automático) não tem a cor mexida pela URL', async () => {
    renderDialog({ accent_color: '#ff0000' });
    fireEvent.change(urlInput(), { target: { value: 'https://instagram.com/perfil' } });

    await act(() => mocks.autosave!.save(mocks.autosave!.data));
    expect(iconUpdates()[0]).toEqual({ title: 'Canal', url: 'https://instagram.com/perfil' });
  });
});

describe('EditLinkDialog: catálogo de marcas', () => {
  it('marca fora da detecção carrega o catálogo ao abrir e mostra a cor oficial', async () => {
    renderDialog({ url: 'https://nubank.com.br', icon_value: 'nubank' });
    expect(await screen.findByRole('button', { name: /Cor oficial da marca/ })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(BRAND_CATALOG_URL);
  });

  it('ícone que não é marca não baixa o catálogo de marcas ao abrir', () => {
    renderDialog({ url: 'https://meusite.com', icon_type: 'lucide', icon_value: 'star' });
    expect(fetchMock).not.toHaveBeenCalledWith(BRAND_CATALOG_URL);
  });

  it('marca fora da tabela: o catálogo é pedido ao abrir e a "Cor oficial" só aparece depois do fetch', async () => {
    const pending = deferred<unknown>();
    fetchMock.mockImplementation(() => pending.promise);
    renderDialog({ url: 'https://nubank.com.br', icon_value: 'nubank' });

    // Antes de qualquer interação
    expect(fetchMock).toHaveBeenCalledWith(BRAND_CATALOG_URL);
    expect(screen.queryByRole('button', { name: /Cor oficial da marca/ })).toBeNull();

    await act(async () => pending.resolve({ ok: true, status: 200, json: async () => brandCatalog }));
    expect(await screen.findByRole('button', { name: /Cor oficial da marca/ })).toBeTruthy();
  });
});

describe('EditLinkDialog: gravações no link certo e em fila', () => {
  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText('Arquivo do ícone'), { target: { files: [file] } });
  const pngFile = () => new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' });
  const B_UPLOAD_URL = `${LINK_ICONS_PUBLIC_PREFIX}u1/6-222.png`;

  it('upload que termina depois de trocar de link grava no link A e não mexe na tela de B', async () => {
    const pending = deferred<{ data: object; error: null }>();
    mocks.storage.upload.mockReturnValue(pending.promise);
    const { rerender, onSaved, onOpenChange } = renderDialog({
      url: 'https://meusite.com',
      icon_type: 'upload',
      icon_value: OLD_UPLOAD_URL,
    });
    pick(pngFile());
    await waitFor(() => expect(mocks.storage.upload).toHaveBeenCalled());

    const linkB: EditableLink = {
      id: 6,
      title: 'Outro',
      url: 'https://outro.com',
      icon_type: 'upload',
      icon_value: B_UPLOAD_URL,
      accent_color: null,
    };
    rerender(<EditLinkDialog open link={linkB} userId="u1" onOpenChange={onOpenChange} onSaved={onSaved} />);
    await act(async () => pending.resolve({ data: {}, error: null }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const [, values, column, id] = mocks.update.mock.calls[0];
    expect(column).toBe('id');
    expect(id).toBe(5);
    expect((values as { icon_value: string }).icon_value).toMatch(/u1\/5-\d+\.png$/);
    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith([OLD_UPLOAD_PATH]));
    expect(mocks.storage.remove).not.toHaveBeenCalledWith(['u1/6-222.png']);
    // A tela continua a de B
    expect(titleInput().value).toBe('Outro');
    const img = screen.getByTestId('icon-picker-preview').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(B_UPLOAD_URL);
  });

  it('autosave da URL em voo e cor escolhida à mão: o banco termina com a cor manual', async () => {
    const pending = deferred<{ error: null }>();
    mocks.update.mockReturnValueOnce(pending.promise);
    renderDialog({ icon_type: 'auto', icon_value: null, accent_color: '#ff0000' });
    fireEvent.change(urlInput(), { target: { value: 'https://instagram.com/perfil' } });

    let autosaveDone: Promise<void> = Promise.resolve();
    act(() => {
      autosaveDone = mocks.autosave!.save(mocks.autosave!.data);
    });
    await act(async () => {});
    expect(mocks.update).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Sem cor' }));
    await act(async () => {});
    // A cor espera o autosave terminar
    expect(mocks.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ error: null });
      await autosaveDone;
    });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(iconUpdates()[0]).toEqual({ title: 'Canal', url: 'https://instagram.com/perfil', accent_color: '#ff0069' });
    expect(iconUpdates()[1]).toEqual({ accent_color: null });
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[1]);
    // A tela fica com a escolha manual
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sem cor' }).getAttribute('aria-pressed')).toBe('true'),
    );
  });

  it('dois cliques com o update pendente gravam uma vez só', async () => {
    const pending = deferred<{ error: null }>();
    mocks.update.mockReturnValue(pending.promise);
    renderDialog();
    act(() => {
      mocks.iconPicker!.onChange({ icon_type: 'lucide', icon_value: 'star' });
      mocks.iconPicker!.onChange({ icon_type: 'lucide', icon_value: 'heart' });
    });
    openTab('Ícones');
    fireEvent.click(screen.getByRole('button', { name: 'heart' }));

    await act(async () => pending.resolve({ error: null }));
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(iconUpdates()[0]).toEqual({ icon_type: 'lucide', icon_value: 'star', accent_color: null });
  });

  it('a cor que acompanha usa a URL gravada quando o ícone anterior é automático', async () => {
    renderDialog({ icon_type: 'auto', icon_value: null, accent_color: '#ff0000' });
    // URL digitada e ainda não gravada: a cor era a oficial do YouTube (URL gravada)
    fireEvent.change(urlInput(), { target: { value: 'https://exemplo.com.br' } });
    act(() => mocks.iconPicker!.onChange({ icon_type: 'brand', icon_value: 'instagram' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ icon_type: 'brand', icon_value: 'instagram', accent_color: '#ff0069' });
  });

  it('exceção no update de um clique desfaz e mostra o toast', async () => {
    mocks.update.mockImplementation(() => {
      throw new Error('rede');
    });
    renderDialog();
    openTab('Ícones');
    fireEvent.click(screen.getByRole('button', { name: 'star' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(previewMask().style.maskImage).toContain('youtube.svg');
  });

  it('exceção no update do upload desfaz e apaga o arquivo novo', async () => {
    mocks.update.mockImplementation(() => {
      throw new Error('rede');
    });
    renderDialog({ url: 'https://meusite.com', icon_type: 'upload', icon_value: OLD_UPLOAD_URL });
    pick(pngFile());

    expect(await screen.findByText('Não foi possível salvar o ícone enviado. Tente de novo.')).toBeTruthy();
    const [newPath] = mocks.storage.upload.mock.calls[0];
    expect(mocks.storage.remove).toHaveBeenCalledWith([newPath]);
    expect(mocks.storage.remove).not.toHaveBeenCalledWith([OLD_UPLOAD_PATH]);
    const img = screen.getByTestId('icon-picker-preview').querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(OLD_UPLOAD_URL);
  });
});

describe('EditLinkDialog: validação antes de gravar', () => {
  it('valor de ícone inválido não chama o update e mostra o toast', () => {
    renderDialog();
    act(() => mocks.iconPicker!.onChange({ icon_type: 'lucide', icon_value: 'x")' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('cor inválida não chama o update', async () => {
    renderDialog();
    act(() => mocks.accentPicker!.onChange('vermelho'));
    act(() => mocks.accentPicker!.onChange('#12345'));
    await act(async () => {});
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('a cor é gravada normalizada', async () => {
    renderDialog();
    act(() => mocks.accentPicker!.onChange('#ABC'));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ accent_color: '#aabbcc' });
  });

  it('userId vazio no upload rejeita cedo', async () => {
    renderDialog({}, { userId: '' });
    openTab('Upload');
    fireEvent.change(screen.getByLabelText('Arquivo do ícone'), {
      target: { files: [new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('Não foi possível enviar a imagem. Tente de novo.')).toBeTruthy();
    expect(mocks.prepareIconUpload).not.toHaveBeenCalled();
    expect(mocks.storage.upload).not.toHaveBeenCalled();
  });
});

describe('EditLinkDialog: fechar e acessibilidade', () => {
  it('ao fechar, título e URL válidos e diferentes do gravado são gravados', async () => {
    const { onOpenChange, onSaved } = renderDialog();
    fireEvent.change(titleInput(), { target: { value: 'Canal novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(iconUpdates()[0]).toEqual({ title: 'Canal novo', url: 'https://youtube.com/@canal' });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('ao fechar sem mudanças ou com campo inválido, nada é gravado', async () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.change(urlInput(), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    await act(async () => {});
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('avisos por campo, títulos h3, status fora do aria-live e foco no título', () => {
    renderDialog();
    expect(document.activeElement).toBe(titleInput());
    expect(screen.getByRole('heading', { level: 3, name: 'Ícone' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Cor de destaque' })).toBeTruthy();
    expect(screen.getByText('Autosave ativo').closest('[aria-live]')).toBeNull();

    fireEvent.change(titleInput(), { target: { value: '' } });
    fireEvent.change(urlInput(), { target: { value: 'javascript:alert(1)' } });
    const titleWarning = screen.getByText('O título não pode ficar vazio');
    const urlWarning = screen.getByText('Corrija a URL para salvar');
    expect(titleWarning.id).toBeTruthy();
    expect(titleWarning.id).not.toBe(urlWarning.id);
    expect(titleInput().getAttribute('aria-describedby')).toBe(titleWarning.id);
    expect(urlInput().getAttribute('aria-describedby')).toBe(urlWarning.id);
  });
});
