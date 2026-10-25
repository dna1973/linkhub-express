// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewProfileDialog } from './NewProfileDialog';

const mocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  selectProfile: vi.fn(),
  toast: vi.fn(),
  validation: { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] } as {
    isValid: boolean;
    isAvailable: boolean;
    isChecking: boolean;
    error: string | null;
    suggestions: string[];
    // Sem ele, o resultado vale para o @ passado ao hook
    checkedUsername?: string;
  },
  validationArgs: [] as unknown[][],
}));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  MAX_PROFILES: 10,
  useCurrentProfile: () => ({ createProfile: mocks.createProfile, selectProfile: mocks.selectProfile }),
}));
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: (...args: unknown[]) => {
    mocks.validationArgs.push(args);
    return { checkedUsername: args[0], ...mocks.validation };
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

beforeEach(() => {
  mocks.createProfile.mockReset();
  mocks.selectProfile.mockReset();
  mocks.toast.mockReset();
  mocks.validation = { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] };
  mocks.validationArgs = [];
});
afterEach(() => cleanup());

function renderDialog() {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  const view = render(<NewProfileDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
  return { ...view, onOpenChange, onCreated };
}

function fill(username = 'loja', name = 'Minha loja') {
  fireEvent.change(screen.getByLabelText('@username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: name } });
}

const continuar = () => screen.getByRole('button', { name: /Continuar/ }) as HTMLButtonElement;
const usernameField = () => screen.getByLabelText('@username') as HTMLInputElement;

describe('NewProfileDialog', () => {
  it('"Continuar" só fica habilitado com o @ válido e disponível', () => {
    mocks.validation = { ...mocks.validation, isAvailable: false, error: 'Este username já está em uso' };
    renderDialog();
    expect(continuar().disabled).toBe(true);
    fill();
    expect(continuar().disabled).toBe(true);
  });

  it('cria o perfil, seleciona o novo e avisa o Dashboard', async () => {
    mocks.createProfile.mockResolvedValue({ ok: true, id: 'p9' });
    const { onOpenChange, onCreated } = renderDialog();
    fill('loja', '  Minha loja  ');
    fireEvent.click(continuar());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('p9'));
    expect(mocks.createProfile).toHaveBeenCalledWith({ username: 'loja', full_name: 'Minha loja' });
    expect(mocks.selectProfile).toHaveBeenCalledWith('p9');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('valida o @ como perfil novo (sem perfil atual)', () => {
    renderDialog();
    fill();
    expect(mocks.validationArgs.length).toBeGreaterThan(0);
    for (const args of mocks.validationArgs) expect(args[2]).toBeUndefined();
  });

  it('@ em uso: aviso no campo, sem selecionar nada', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'taken' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Este username já está em uso');
    expect(mocks.selectProfile).not.toHaveBeenCalled();
  });

  it('@ recusado pelo banco: aviso no campo', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'invalid' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Este @username não pode ser usado');
  });

  it('limite: "Você já tem 10 perfis"', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'limit' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Você já tem 10 perfis');
  });

  it('erro desconhecido: toast', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'other' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('"Continuar" desabilitado enquanto o resultado é de outro @ (o digitado ainda não foi conferido)', () => {
    mocks.validation = { ...mocks.validation, checkedUsername: 'loja' };
    renderDialog();
    fill('admin');
    expect(continuar().disabled).toBe(true);
  });

  it('"Continuar" desabilitado com o @ em validação', () => {
    mocks.validation = { ...mocks.validation, isChecking: true };
    renderDialog();
    fill();
    expect(continuar().disabled).toBe(true);
  });

  it('"Continuar" desabilitado com o @ inválido, mesmo marcado como disponível', () => {
    mocks.validation = { ...mocks.validation, isValid: false, isAvailable: true };
    renderDialog();
    fill();
    expect(continuar().disabled).toBe(true);
  });

  it('"Continuar" desabilitado com o @ vazio', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Minha loja' } });
    expect(continuar().disabled).toBe(true);
  });

  it('com a criação em andamento, Escape e Cancelar não fecham', async () => {
    mocks.createProfile.mockReturnValue(new Promise(() => {}));
    const { onOpenChange } = renderDialog();
    fill();
    fireEvent.click(continuar());
    await waitFor(() => expect(mocks.createProfile).toHaveBeenCalled());

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('@ em uso pelo banco: some o "disponível" e o campo fica inválido, ligado à mensagem', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'taken' });
    renderDialog();
    fill();
    expect(screen.getByText('Username disponível!')).toBeTruthy();
    fireEvent.click(continuar());

    await screen.findByRole('alert');
    expect(screen.queryByText('Username disponível!')).toBeNull();
    expect(usernameField().getAttribute('aria-invalid')).toBe('true');
    const describedBy = usernameField().getAttribute('aria-describedby') ?? '';
    const messages = describedBy.split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(messages).toContain('Este username já está em uso');

    // Digitar de novo tira o erro do banco
    fireEvent.change(usernameField(), { target: { value: 'loja2' } });
    expect(usernameField().getAttribute('aria-invalid')).toBeNull();
  });

  it('fechado pelo pai (open=false), limpa os campos para a próxima abertura', () => {
    const { rerender, onOpenChange, onCreated } = renderDialog();
    fill('loja', 'Minha loja');
    rerender(<NewProfileDialog open={false} onOpenChange={onOpenChange} onCreated={onCreated} />);
    rerender(<NewProfileDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
    expect(usernameField().value).toBe('');
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('');
  });
});
