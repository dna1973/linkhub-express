import { describe, expect, it } from 'vitest';
import { UNNAMED_PROFILE, profileLabel, profileName } from './profileLabel';

describe('profileName', () => {
  it('usa o nome sem espaços nas pontas', () => {
    expect(profileName({ full_name: '  Daniel  ' })).toBe('Daniel');
  });

  it('sem nome (nulo, vazio ou só espaços) vira "Perfil sem nome"', () => {
    expect(UNNAMED_PROFILE).toBe('Perfil sem nome');
    expect(profileName({ full_name: null })).toBe(UNNAMED_PROFILE);
    expect(profileName({ full_name: '' })).toBe(UNNAMED_PROFILE);
    expect(profileName({ full_name: '   ' })).toBe(UNNAMED_PROFILE);
    expect(profileName({})).toBe(UNNAMED_PROFILE);
  });
});

describe('profileLabel', () => {
  it('com @, mostra o @', () => {
    expect(profileLabel({ username: 'dna', full_name: 'Daniel' })).toBe('@dna');
  });

  it('sem @, mostra o nome; sem @ e sem nome, "Perfil sem nome"', () => {
    expect(profileLabel({ username: null, full_name: ' Daniel ' })).toBe('Daniel');
    expect(profileLabel({ username: '', full_name: null })).toBe(UNNAMED_PROFILE);
  });
});
