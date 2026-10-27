import { describe, expect, it } from 'vitest';
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { PREDEFINED_THEMES } from '@/utils/themes';
import { profileThemeOf } from './profileTheme';

const PEACH = ONBOARDING_TEMPLATES.find((t) => t.id === 'warm-peach')!;

describe('profileThemeOf', () => {
  it('perfil sem tema salvo devolve null', () => {
    expect(profileThemeOf(null)).toBeNull();
    expect(profileThemeOf(undefined)).toBeNull();
    expect(profileThemeOf({})).toBeNull();
    expect(profileThemeOf({ theme_options: null })).toBeNull();
    expect(profileThemeOf({ theme_options: {} })).toBeNull();
  });

  it('theme_options que não é objeto devolve null', () => {
    expect(profileThemeOf({ theme_options: [] })).toBeNull();
    expect(profileThemeOf({ theme_options: 'warm-peach' })).toBeNull();
    expect(profileThemeOf({ theme_options: 5 })).toBeNull();
  });

  it('tema com themeId e custom devolve os dois', () => {
    const result = profileThemeOf({ theme_options: { themeId: 'warm-peach', custom: PEACH.config } });
    expect(result?.themeId).toBe('warm-peach');
    expect(result?.config).toEqual(PEACH.config);
  });

  it('só custom, sem themeId, usa "custom"', () => {
    const result = profileThemeOf({ theme_options: { custom: PEACH.config } });
    expect(result?.themeId).toBe('custom');
    expect(result?.config).toEqual(PEACH.config);
  });

  it('só themeId de um tema pronto resolve a config dele', () => {
    const pronto = PREDEFINED_THEMES[0];
    const result = profileThemeOf({ theme_options: { themeId: pronto.id } });
    expect(result?.themeId).toBe(pronto.id);
    expect(result?.config).toEqual(pronto.config);
  });
});
