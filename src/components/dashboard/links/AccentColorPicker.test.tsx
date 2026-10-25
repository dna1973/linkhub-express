// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { AccentColorPicker, type AccentColorPickerProps } from './AccentColorPicker';

afterEach(cleanup);

function renderPicker(props: Partial<AccentColorPickerProps> = {}) {
  const onChange = vi.fn();
  render(
    <AccentColorPicker
      url="https://youtube.com/@canal"
      iconType="auto"
      iconValue={null}
      accentColor={null}
      officialHex="#ff0000"
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const NOTE = 'A cor vale para ícones de marca e da biblioteca';

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

  it('sem hex oficial, não oferece a cor oficial', () => {
    renderPicker({ url: 'https://exemplo.com', iconType: 'lucide', iconValue: 'rocket', officialHex: null });
    expect(screen.queryByRole('button', { name: /Cor oficial da marca/ })).toBeNull();
    expect(button('Sem cor').disabled).toBe(false);
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

    const hex = screen.getByLabelText('Código hex') as HTMLInputElement;
    fireEvent.change(hex, { target: { value: ' #ABC ' } });
    fireEvent.blur(hex);
    expect(onChange).toHaveBeenLastCalledWith('#aabbcc');

    fireEvent.change(hex, { target: { value: '12AB9F' } });
    fireEvent.keyDown(hex, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#12ab9f');

    fireEvent.change(screen.getByLabelText('Cor do ícone'), { target: { value: '#00AA55' } });
    expect(onChange).toHaveBeenLastCalledWith('#00aa55');
  });

  it('hex inválido não grava e avisa', () => {
    const { onChange } = renderPicker();
    fireEvent.click(button('Escolher cor'));
    const hex = screen.getByLabelText('Código hex');
    fireEvent.change(hex, { target: { value: '#12345' } });
    fireEvent.blur(hex);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Use uma cor no formato #rrggbb')).toBeTruthy();
  });

  it('cor manual diferente da oficial abre já em "Escolher cor"', () => {
    renderPicker({ accentColor: '#123456' });
    expect(button('Escolher cor').getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText('Código hex') as HTMLInputElement).value).toBe('#123456');
  });

  it.each([
    { iconType: 'emoji', iconValue: '🚀', url: 'https://exemplo.com' },
    { iconType: 'favicon', iconValue: null, url: 'https://exemplo.com' },
    { iconType: 'upload', iconValue: `${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`, url: 'https://exemplo.com' },
    // auto sem marca vira favicon: o ícone efetivo não é máscara
    { iconType: 'auto', iconValue: null, url: 'https://exemplo.com' },
  ])('desabilitado para $iconType ($url)', ({ iconType, iconValue, url }) => {
    const { onChange } = renderPicker({ iconType, iconValue, url, officialHex: null });
    expect(screen.getByText(NOTE)).toBeTruthy();
    for (const name of ['Sem cor', 'Escolher cor']) {
      expect(button(name).disabled).toBe(true);
      fireEvent.click(button(name));
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a prop disabled desabilita tudo, sem a nota', () => {
    renderPicker({ disabled: true, accentColor: '#123456' });
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(button('Sem cor').disabled).toBe(true);
    expect(button(/Cor oficial da marca/).disabled).toBe(true);
    expect((screen.getByLabelText('Código hex') as HTMLInputElement).disabled).toBe(true);
  });

  it('a prévia mostra o ícone no quadrado claro e no escuro, com a regra de contraste', () => {
    renderPicker({ url: 'https://x.com/eu', officialHex: '#000000', accentColor: '#000000' });
    const light = screen.getByTestId('accent-preview-light');
    const dark = screen.getByTestId('accent-preview-dark');
    expect(light.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(dark.style.backgroundColor).toBe('rgb(17, 24, 39)');
    expect((light.querySelector('.link-icon-mask') as HTMLElement).style.backgroundColor).toBe('rgb(0, 0, 0)');
    // Preto sobre #111827 fica abaixo de 3:1 e cai em #f9fafb
    expect((dark.querySelector('.link-icon-mask') as HTMLElement).style.backgroundColor).toBe('rgb(249, 250, 251)');
  });
});
