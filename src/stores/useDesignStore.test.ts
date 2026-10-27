import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultCustomTheme, DEFAULT_THEME_ID, useDesignStore } from './useDesignStore';

afterEach(() => {
  useDesignStore.getState().resetDesign();
  useDesignStore.getState().setPreviewMode(false);
});

describe('useDesignStore.resetDesign', () => {
  it('volta ao tema inicial (pebble-blue e o customTheme inicial)', () => {
    const store = useDesignStore.getState();
    store.setCurrentTheme('warm-peach');
    store.setCustomTheme({ ...createDefaultCustomTheme(), colors: { text: '#000000' } });

    useDesignStore.getState().resetDesign();

    expect(DEFAULT_THEME_ID).toBe('pebble-blue');
    expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');
    expect(useDesignStore.getState().customTheme).toEqual(createDefaultCustomTheme());
  });

  it('não mexe no modo de prévia', () => {
    useDesignStore.getState().setPreviewMode(true);
    useDesignStore.getState().resetDesign();
    expect(useDesignStore.getState().isPreviewMode).toBe(true);
  });

  it('cada reinício entrega um objeto novo: alterar um não contamina o próximo', () => {
    useDesignStore.getState().resetDesign();
    useDesignStore.getState().customTheme.colors.text = '#123456';
    useDesignStore.getState().resetDesign();
    expect(useDesignStore.getState().customTheme.colors.text).toBe('#ffffff');
  });
});
