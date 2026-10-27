// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddLinkDialog } from './AddLinkDialog';

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

function renderDialog(onAdd = vi.fn(async () => true)) {
  const onOpenChange = vi.fn();
  render(<AddLinkDialog open onOpenChange={onOpenChange} onAdd={onAdd} />);
  return { onAdd, onOpenChange };
}

const urlInput = () => screen.getByLabelText('URL') as HTMLInputElement;
const titleInput = () => screen.getByLabelText('Título (opcional)') as HTMLInputElement;
const addButton = () => screen.getByRole('button', { name: 'Adicionar' });
const setUrl = (value: string) => fireEvent.change(urlInput(), { target: { value } });
const setTitle = (value: string) => fireEvent.change(titleInput(), { target: { value } });

describe('AddLinkDialog', () => {
  it('só tem URL e título, sem a grade de tipos, e a URL vem primeiro com foco', () => {
    renderDialog();
    const inputs = Array.from(document.querySelectorAll('input'));
    expect(inputs).toEqual([urlInput(), titleInput()]);
    expect(document.activeElement).toBe(urlInput());
    expect(screen.queryByText(/Escolha o tipo/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Instagram' })).toBeNull();
  });

  it('URL do YouTube mostra a detecção e o título "YouTube"', () => {
    renderDialog();
    setUrl('https://www.youtube.com/@canal');

    expect(screen.getByText('Ícone detectado: YouTube')).toBeTruthy();
    expect(titleInput().value).toBe('YouTube');
    expect(screen.getByTestId('add-link-icon-preview')).toBeTruthy();
  });

  it('trocar a URL para o Instagram troca o título automático', () => {
    renderDialog();
    setUrl('https://youtube.com/@canal');
    setUrl('https://instagram.com/perfil');

    expect(screen.getByText('Ícone detectado: Instagram')).toBeTruthy();
    expect(titleInput().value).toBe('Instagram');
  });

  it('título digitado não é sobrescrito; apagado, o automático volta', () => {
    renderDialog();
    setUrl('https://youtube.com/@canal');
    setTitle('Meu canal');
    setUrl('https://instagram.com/perfil');
    expect(titleInput().value).toBe('Meu canal');

    setTitle('');
    expect(titleInput().value).toBe('Instagram');
  });

  it('sem marca, o título é o host e o texto é "Ícone do site"', () => {
    renderDialog();
    setUrl('https://www.exemplo.com.br/pagina');

    expect(titleInput().value).toBe('exemplo.com.br');
    expect(screen.getByText('Ícone do site')).toBeTruthy();
  });

  it('mailto: dá o título "E-mail"', () => {
    renderDialog();
    setUrl('mailto:dna@example.com');

    expect(titleInput().value).toBe('E-mail');
    expect(screen.getByText('Ícone detectado: E-mail')).toBeTruthy();
  });

  it('adicionar chama onAdd com o título automático e a URL limpa, mostra "Adicionando…", limpa e fecha', async () => {
    const pending = deferred<boolean>();
    const onAdd = vi.fn(() => pending.promise);
    const { onOpenChange } = renderDialog(onAdd);
    setUrl('  https://youtube.com/@canal  ');

    fireEvent.click(addButton());

    expect(onAdd).toHaveBeenCalledWith({ title: 'YouTube', url: 'https://youtube.com/@canal' });
    const busy = screen.getByRole('button', { name: 'Adicionando…' });
    expect(busy.hasAttribute('disabled')).toBe(true);

    await act(async () => pending.resolve(true));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(urlInput().value).toBe('');
    expect(titleInput().value).toBe('');
  });

  it('título digitado vai para o onAdd', async () => {
    const { onAdd } = renderDialog();
    setUrl('https://github.com/dna');
    setTitle('  Meus projetos ');

    await act(async () => {
      fireEvent.click(addButton());
    });

    expect(onAdd).toHaveBeenCalledWith({ title: 'Meus projetos', url: 'https://github.com/dna' });
  });

  it('título só com espaços usa o automático', async () => {
    const { onAdd } = renderDialog();
    setUrl('https://youtube.com/@canal');
    setTitle(' ');

    await act(async () => {
      fireEvent.click(addButton());
    });

    expect(onAdd).toHaveBeenCalledWith({ title: 'YouTube', url: 'https://youtube.com/@canal' });
  });

  it('durante "Adicionando…", Cancelar e Esc não fecham nem limpam', async () => {
    const pending = deferred<boolean>();
    const { onOpenChange } = renderDialog(vi.fn(() => pending.promise));
    setUrl('https://github.com/dna');
    fireEvent.click(addButton());

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(urlInput().value).toBe('https://github.com/dna');

    await act(async () => pending.resolve(false));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('se onAdd devolver false, mantém os campos e não fecha', async () => {
    const onAdd = vi.fn(async () => false);
    const { onOpenChange } = renderDialog(onAdd);
    setUrl('https://github.com/dna');

    await act(async () => {
      fireEvent.click(addButton());
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(urlInput().value).toBe('https://github.com/dna');
    expect(addButton().hasAttribute('disabled')).toBe(false);
  });

  it('URL inválida é recusada, sem prévia', () => {
    const { onAdd } = renderDialog();
    setUrl('javascript:alert(1)');

    expect(screen.queryByTestId('add-link-icon-preview')).toBeNull();
    fireEvent.click(addButton());

    expect(screen.getByText('A URL fornecida não é válida')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('URL recusada: o erro fica ligado ao campo e o foco volta para a URL', () => {
    renderDialog();
    setUrl('javascript:alert(1)');
    titleInput().focus();
    fireEvent.click(addButton());

    const alert = screen.getByRole('alert');
    expect(alert.id).toBeTruthy();
    expect(urlInput().getAttribute('aria-invalid')).toBe('true');
    expect(urlInput().getAttribute('aria-describedby')).toBe(alert.id);
    expect(titleInput().getAttribute('aria-invalid')).toBeNull();
    expect(document.activeElement).toBe(urlInput());

    // Corrigir a URL tira o erro
    setUrl('https://github.com/dna');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(urlInput().getAttribute('aria-invalid')).toBeNull();
    expect(urlInput().getAttribute('aria-describedby')).toBeNull();
  });

  it('URL vazia é recusada', () => {
    const { onAdd } = renderDialog();
    fireEvent.click(addButton());

    expect(screen.getByText('A URL fornecida não é válida')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('tel: sem título mostra "Informe um título" e não chama onAdd', () => {
    const { onAdd } = renderDialog();
    setUrl('tel:+5561999999999');
    expect(titleInput().value).toBe('');

    fireEvent.click(addButton());

    expect(screen.getByText('Informe um título')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(titleInput().getAttribute('aria-invalid')).toBe('true');
    expect(titleInput().getAttribute('aria-describedby')).toBe(alert.id);
    expect(urlInput().getAttribute('aria-invalid')).toBeNull();
    expect(document.activeElement).toBe(titleInput());
  });
});
