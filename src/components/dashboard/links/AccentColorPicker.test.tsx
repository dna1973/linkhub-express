// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { AccentColorPicker, type AccentColorPickerProps } from './AccentColorPicker';

afterEach(cleanup);

function renderPicker(props: Partial<AccentColorPickerProps> = {}) {
  const onChange = vi.fn();
  const element = (extra: Partial<AccentColorPickerProps> = {}) => (
    <AccentColorPicker
      url="https://youtube.com/@canal"
      iconType="auto"
      iconValue={null}
      accentColor={null}
      officialHex="#ff0000"
      onChange={onChange}
      {...props}
      {...extra}
    />
  );
  const utils = render(element());
  return { onChange, rerender: (extra: Partial<AccentColorPickerProps>) => utils.rerender(element(extra)) };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const hexInput = () => screen.getByLabelText('Código hex') as HTMLInputElement;
const colorInput = () => screen.getByLabelText('Cor do ícone') as HTMLInputElement;
const NOTE = 'A cor vale para ícones de marca e da biblioteca';
const lightMask = () => screen.getByTestId('accent-preview-light').querySelector('.link-icon-mask') as HTMLElement;

describe('AccentColorPicker', () => {
  it('"Sem cor" grava null e fica pressionado sem cor', () => {
    const { onChange } = renderPicker({ accentColor: '#ff0000' });
    expect(button('Sem cor').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button('Sem cor'));
    expect(onChange).toHaveBeenCalledWith(null);

    cleanup();
    renderPicker();
    expect(button('Sem cor').getAttribute('aria-pressed')).toBe('true');
  });

  it('"Cor oficial da marca" grava o hex oficial e fica pressionado quando a cor é a oficial', () => {
    const { onChange } = renderPicker();
    fireEvent.click(button(/Cor oficial da marca/));
    expect(onChange).toHaveBeenCalledWith('#ff0000');

    cleanup();
    renderPicker({ accentColor: '#FF0000' });
    expect(button(/Cor oficial da marca/).getAttribute('aria-pressed')).toBe('true');
    expect(button('Sem cor').getAttribute('aria-pressed')).toBe('false');
  });

  it('grava o officialHex recebido, sem calcular o hex (YouTube com #123456)', () => {
    const { onChange } = renderPicker({ url: 'https://youtube.com/@canal', officialHex: '#123456' });
    fireEvent.click(button(/Cor oficial da marca/));
    expect(onChange).toHaveBeenCalledWith('#123456');
  });

  it('sem hex oficial, não oferece a cor oficial', () => {
    renderPicker({ url: 'https://exemplo.com', iconType: 'lucide', iconValue: 'rocket', officialHex: null });
    expect(screen.queryByRole('button', { name: /Cor oficial da marca/ })).toBeNull();
    expect(button('Sem cor').getAttribute('aria-disabled')).toBeNull();
  });

  it('oferece a cor oficial do LinkedIn (lucide da detecção)', () => {
    const { onChange } = renderPicker({ url: 'https://linkedin.com/in/eu', officialHex: '#0a66c2' });
    fireEvent.click(button(/Cor oficial da marca/));
    expect(onChange).toHaveBeenCalledWith('#0a66c2');
  });

  it('"Escolher cor" mostra o seletor e o campo hex, e grava a cor normalizada', () => {
    const { onChange } = renderPicker();
    expect(screen.queryByLabelText('Código hex')).toBeNull();
    fireEvent.click(button('Escolher cor'));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(hexInput(), { target: { value: ' #ABC ' } });
    fireEvent.blur(hexInput());
    expect(onChange).toHaveBeenLastCalledWith('#aabbcc');

    fireEvent.change(hexInput(), { target: { value: '12AB9F' } });
    fireEvent.keyDown(hexInput(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#12ab9f');

    fireEvent.change(colorInput(), { target: { value: '#00AA55' } });
    expect(onChange).toHaveBeenLastCalledWith('#00aa55');
  });

  it('no seletor de cor, o input só atualiza o campo hex e a prévia; só o change grava', () => {
    const { onChange } = renderPicker();
    fireEvent.click(button('Escolher cor'));

    fireEvent.input(colorInput(), { target: { value: '#0055aa' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(hexInput().value).toBe('#0055aa');
    // A prévia mostra o rascunho no modo "Escolher cor"
    expect(lightMask().style.backgroundColor).toBe('rgb(0, 85, 170)');

    fireEvent.change(colorInput(), { target: { value: '#0055aa' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#0055aa');
  });

  it('sair do campo hex sem digitar não grava', () => {
    const { onChange } = renderPicker();
    fireEvent.click(button('Escolher cor'));
    fireEvent.blur(hexInput());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hex inválido não grava e avisa', () => {
    const { onChange } = renderPicker();
    fireEvent.click(button('Escolher cor'));
    fireEvent.change(hexInput(), { target: { value: '#12345' } });
    fireEvent.blur(hexInput());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Use uma cor no formato #rrggbb')).toBeTruthy();
  });

  it('cor manual diferente da oficial abre já em "Escolher cor"', () => {
    renderPicker({ accentColor: '#123456' });
    expect(button('Escolher cor').getAttribute('aria-pressed')).toBe('true');
    expect(hexInput().value).toBe('#123456');
  });

  it.each([
    { iconType: 'emoji', iconValue: '🚀', url: 'https://exemplo.com' },
    { iconType: 'favicon', iconValue: null, url: 'https://exemplo.com' },
    { iconType: 'upload', iconValue: `${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`, url: 'https://exemplo.com' },
    // auto sem marca vira favicon: o ícone efetivo não é máscara
    { iconType: 'auto', iconValue: null, url: 'https://exemplo.com' },
  ])('desabilitado para $iconType ($url), com a nota ligada aos botões', ({ iconType, iconValue, url }) => {
    const { onChange } = renderPicker({ iconType, iconValue, url, officialHex: null });
    const note = screen.getByText(NOTE);
    expect(note.id).toBeTruthy();
    for (const name of ['Sem cor', 'Escolher cor']) {
      expect(button(name).disabled).toBe(false);
      expect(button(name).getAttribute('aria-disabled')).toBe('true');
      expect(button(name).getAttribute('aria-describedby')).toContain(note.id);
      fireEvent.click(button(name));
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Código hex')).toBeNull();
  });

  it('a nota continua visível com a prop disabled quando a cor não se aplica', () => {
    renderPicker({ iconType: 'emoji', iconValue: '🚀', url: 'https://exemplo.com', officialHex: null, disabled: true });
    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  it('a prop disabled desabilita tudo por aria-disabled, sem a nota quando a cor se aplica', () => {
    const { onChange } = renderPicker({ disabled: true, accentColor: '#123456' });
    expect(screen.queryByText(NOTE)).toBeNull();
    for (const name of ['Sem cor', /Cor oficial da marca/, 'Escolher cor']) {
      expect(button(name).disabled).toBe(false);
      expect(button(name).getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(button(name));
    }
    expect(hexInput().disabled).toBe(false);
    expect(hexInput().readOnly).toBe(true);
    expect(hexInput().getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(hexInput(), { target: { value: '#abcdef' } });
    fireEvent.keyDown(hexInput(), { key: 'Enter' });
    expect(colorInput().disabled).toBe(false);
    expect(colorInput().getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(colorInput(), { target: { value: '#00aa55' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('o elemento focado continua focado ao virar disabled (gravação imediata)', () => {
    const { rerender } = renderPicker();
    const official = button(/Cor oficial da marca/);
    official.focus();
    rerender({ disabled: true });
    expect(document.activeElement).toBe(official);
    rerender({ disabled: false, accentColor: '#ff0000' });
    expect(document.activeElement).toBe(official);

    fireEvent.click(button('Escolher cor'));
    hexInput().focus();
    rerender({ disabled: true });
    expect(document.activeElement).toBe(hexInput());
  });

  it('a prévia mostra o ícone no quadrado claro e no escuro, com a regra de contraste', () => {
    renderPicker({ url: 'https://x.com/eu', officialHex: '#000000', accentColor: '#000000' });
    const light = screen.getByTestId('accent-preview-light');
    const dark = screen.getByTestId('accent-preview-dark');
    expect(light.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(dark.style.backgroundColor).toBe('rgb(17, 24, 39)');
    expect(lightMask().style.backgroundColor).toBe('rgb(0, 0, 0)');
    // Preto sobre #111827 fica abaixo de 3:1 e cai em #f9fafb
    expect((dark.querySelector('.link-icon-mask') as HTMLElement).style.backgroundColor).toBe('rgb(249, 250, 251)');
  });
});
