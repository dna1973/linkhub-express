// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { LinksTab } from './LinksTab';

const UPLOAD_URL = `${LINK_ICONS_PUBLIC_PREFIX}p1/7-123.png`;

const mocks = vi.hoisted(() => {
  const storage = { remove: vi.fn() };
  return {
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    links: [] as unknown[],
    deleteEq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    selectEq: vi.fn(),
    linksFor: null as null | ((id: unknown) => unknown),
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useAutosave', () => ({ useAutosave: () => 'idle' }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: mocks.storageFrom },
    from: vi.fn(() => ({
      select: () => ({
        eq: (column: string, value: unknown) => {
          mocks.selectEq(column, value);
          return {
            order: async () => {
              mocks.select();
              return { data: mocks.linksFor ? await mocks.linksFor(value) : mocks.links, error: null };
            },
          };
        },
      }),
      delete: () => ({ eq: async (column: string, value: unknown) => mocks.deleteEq(column, value) }),
      insert: async (rows: unknown) => mocks.insert(rows),
      update: (values: unknown) => ({ eq: async (column: string, value: unknown) => mocks.update(values, column, value) }),
    })),
  },
}));

const baseLink = { position: 0, is_visible: true, icon_type: 'auto', icon_value: null, accent_color: null };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  mocks.deleteEq.mockReset().mockReturnValue({ error: null });
  mocks.insert.mockReset().mockReturnValue({ error: null });
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.select.mockReset();
  mocks.selectEq.mockReset();
  mocks.linksFor = null;
  // O seletor de ícone baixa o catálogo de marcas ao abrir
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })));
  mocks.links = [
    { ...baseLink, id: 5, position: 0, title: 'Canal', url: 'https://youtube.com/@canal', clicks: 0 },
    { ...baseLink, id: 6, position: 1, title: 'Site', url: 'https://exemplo.com.br', clicks: 1 },
    {
      ...baseLink,
      id: 7,
      position: 2,
      title: 'Logo',
      url: 'https://meusite.com',
      clicks: 2,
      icon_type: 'upload',
      icon_value: UPLOAD_URL,
    },
  ];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderTab() {
  render(<LinksTab profile={{ id: 'p1', username: 'dna' }} onProfileUpdate={vi.fn()} />);
  await screen.findByText('Logo');
}

describe('LinksTab', () => {
  it('a resposta atrasada do perfil anterior não sobrescreve a do atual', async () => {
    let releaseP1: (value: unknown) => void = () => {};
    const p1Links = new Promise((resolve) => {
      releaseP1 = resolve;
    });
    const row = (id: number, title: string) => ({ ...baseLink, id, title, url: 'https://exemplo.com', clicks: 0 });
    mocks.linksFor = (id) => (id === 'p1' ? p1Links : [row(9, 'Link da loja')]);

    const { rerender } = render(<LinksTab profile={{ id: 'p1', username: 'dna' }} onProfileUpdate={vi.fn()} />);
    await waitFor(() => expect(mocks.selectEq).toHaveBeenCalledWith('user_id', 'p1'));
    rerender(<LinksTab profile={{ id: 'p2', username: 'loja' }} onProfileUpdate={vi.fn()} />);
    await screen.findByText('Link da loja');

    releaseP1([row(8, 'Link antigo')]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText('Link da loja')).toBeTruthy();
    expect(screen.queryByText('Link antigo')).toBeNull();
  });

  it('lista os links do perfil recebido', async () => {
    await renderTab();
    expect(mocks.selectEq).toHaveBeenCalledWith('user_id', 'p1');
  });

  it('badges com o plural certo dos cliques', async () => {
    await renderTab();
    expect(screen.getByText('0 cliques')).toBeTruthy();
    expect(screen.getByText('1 clique')).toBeTruthy();
    expect(screen.getByText('2 cliques')).toBeTruthy();
  });

  it('cada card tem o quadrado branco do ícone', async () => {
    await renderTab();
    const boxes = screen.getAllByTestId('link-icon-box');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.className).toContain('bg-white');
      expect(box.firstElementChild).toBeTruthy();
    }
    // O link do YouTube desenha a máscara da marca no tamanho do card
    const mask = boxes[0].firstElementChild as HTMLElement;
    expect(mask.style.maskImage).toContain('youtube');
    expect(mask.style.width).toBe('18px');
  });

  it('os botões só com ícone têm nome', async () => {
    await renderTab();
    expect(screen.getAllByRole('button', { name: 'Editar link' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Abrir link' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Excluir link' })).toHaveLength(3);
  });

  it('excluir o link com upload apaga o arquivo do bucket depois do delete', async () => {
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[2]);

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith(['p1/7-123.png']));
    expect(mocks.deleteEq).toHaveBeenCalledWith('id', 7);
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-link-icons');
    expect(mocks.storage.remove.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.deleteEq.mock.invocationCallOrder[0],
    );
  });

  it('excluir link sem upload não mexe no bucket', async () => {
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[0]);

    await waitFor(() => expect(mocks.deleteEq).toHaveBeenCalledWith('id', 5));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link removido' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('delete com erro não apaga o arquivo', async () => {
    mocks.deleteEq.mockReturnValue({ error: { message: 'falhou' } });
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[2]);

    await waitFor(() => expect(mocks.deleteEq).toHaveBeenCalledWith('id', 7));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('ícone na pasta de outro perfil não é apagado', async () => {
    (mocks.links[2] as { icon_value: string }).icon_value = `${LINK_ICONS_PUBLIC_PREFIX}p2/7-123.png`;
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[2]);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link removido' })));
    expect(mocks.deleteEq).toHaveBeenCalledWith('id', 7);
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('"Abrir link" abre a URL com noopener e noreferrer', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir link' })[0]);

    expect(open).toHaveBeenCalledWith('https://youtube.com/@canal', '_blank', 'noopener,noreferrer');
  });

  it('falha ao apagar o arquivo vai só para o console', async () => {
    mocks.storage.remove.mockResolvedValue({ error: new Error('sem permissão') });
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[2]);

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error removing link icon:', expect.anything()));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link removido' }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('"Adicionar Link" abre o modal sem a grade de tipos', async () => {
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Link' }));

    expect(await screen.findByLabelText('URL')).toBeTruthy();
    expect(screen.getByLabelText('Título (opcional)')).toBeTruthy();
    expect(screen.queryByText(/Escolha o tipo/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Instagram' })).toBeNull();
  });

  it('adicionar pelo modal grava com icon_type auto e o título sanitizado', async () => {
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Link' }));
    fireEvent.change(await screen.findByLabelText('URL'), { target: { value: ' https://github.com/dna ' } });
    fireEvent.change(screen.getByLabelText('Título (opcional)'), { target: { value: '<b>Meus projetos</b>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert).toHaveBeenCalledWith([
      {
        user_id: 'p1',
        title: 'Meus projetos',
        url: 'https://github.com/dna',
        position: 3,
        is_visible: true,
        clicks: 0,
        icon_type: 'auto',
        icon_value: null,
        accent_color: null,
      },
    ]);
    await waitFor(() => expect(screen.queryByLabelText('Título (opcional)')).toBeNull());
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link adicionado!' }));
  });

  it('"Editar link" abre o modal novo e gravar o ícone recarrega a lista e avisa a prévia', async () => {
    const linksUpdated = vi.fn();
    window.addEventListener('linksUpdated', linksUpdated);
    try {
      await renderTab();
      fireEvent.click(screen.getAllByRole('button', { name: 'Editar link' })[1]);

      expect(((await screen.findByLabelText('Título')) as HTMLInputElement).value).toBe('Site');
      expect((screen.getByLabelText('URL') as HTMLInputElement).value).toBe('https://exemplo.com.br');
      const loadsBefore = mocks.select.mock.calls.length;

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Favicon' }));
      fireEvent.click(screen.getByRole('button', { name: 'Usar o ícone do site' }));

      await waitFor(() => expect(linksUpdated).toHaveBeenCalledTimes(1));
      expect(mocks.update).toHaveBeenCalledWith(
        { icon_type: 'favicon', icon_value: null, accent_color: null },
        'id',
        6,
      );
      expect(mocks.select.mock.calls.length).toBeGreaterThan(loadsBefore);
    } finally {
      window.removeEventListener('linksUpdated', linksUpdated);
    }
  });
});
