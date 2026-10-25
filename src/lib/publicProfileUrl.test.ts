import { describe, expect, it } from 'vitest';
import { getPublicProfileUrl } from './publicProfileUrl';

const SITE = 'https://linkhub.avila.ia.br';

describe('getPublicProfileUrl', () => {
  it('usa o domínio do site quando não há domínio personalizado', () => {
    expect(getPublicProfileUrl({ username: 'dna' }, SITE)).toBe('https://linkhub.avila.ia.br/dna');
  });

  it('preferred_domain padrão ignora o domínio personalizado', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'default', custom_domain: 'meusite.com' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
  });

  it('domínio personalizado sem esquema ganha https://', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'meusite.com' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
  });

  it('domínio personalizado com esquema fica como está, sem diferenciar maiúsculas', () => {
    expect(
      getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'https://meusite.com' }, SITE),
    ).toBe('https://meusite.com/dna');
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'HTTPS://meusite.com' }, SITE)).toBe(
      'HTTPS://meusite.com/dna',
    );
  });

  it('remove as barras do fim do domínio', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'meusite.com//' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
    expect(getPublicProfileUrl({ username: 'dna' }, 'https://linkhub.avila.ia.br/')).toBe('https://linkhub.avila.ia.br/dna');
  });

  it('apara espaços do username e do domínio', () => {
    expect(getPublicProfileUrl({ username: ' dna ', preferred_domain: 'custom', custom_domain: ' meusite.com ' }, SITE)).toBe(
      'https://meusite.com/dna',
    );
  });

  it('personalizado escolhido mas vazio cai no domínio do site', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: '   ' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
  });

  it('domínio personalizado só com o esquema (https://) cai no domínio do site', () => {
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: 'https://' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
    expect(getPublicProfileUrl({ username: 'dna', preferred_domain: 'custom', custom_domain: ' HTTP:// ' }, SITE)).toBe(
      'https://linkhub.avila.ia.br/dna',
    );
  });

  it('sem username devolve null', () => {
    expect(getPublicProfileUrl({ username: '' }, SITE)).toBeNull();
    expect(getPublicProfileUrl({ username: '   ' }, SITE)).toBeNull();
    expect(getPublicProfileUrl({}, SITE)).toBeNull();
    expect(getPublicProfileUrl(null, SITE)).toBeNull();
    expect(getPublicProfileUrl(undefined, SITE)).toBeNull();
  });
});
