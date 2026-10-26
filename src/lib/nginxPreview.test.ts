import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_SEGMENTS } from './serviceWorkerRoutes';

// A prévia de um link (WhatsApp, Telegram, redes sociais) vem das tags og do HTML.
// O nginx manda os robôs de prévia que pedem /:username para a edge function linkhub-profile-og.
const NGINX = readFileSync(path.resolve(__dirname, '..', '..', 'deploy', 'vpsavila', 'nginx.conf'), 'utf8');

const profileLocation = () => {
  const match = NGINX.match(/location ~ "\^\/\(\?!\(\?:([a-z|]+)\)\$\)\(\[a-z0-9_\]\{3,20\}\)\$"/);
  if (!match) throw new Error('location dos perfis não encontrada no nginx.conf');
  return match;
};

describe('nginx: prévia do perfil para robôs', () => {
  it('reconhece os robôs de prévia mais comuns, sem diferenciar maiúsculas', () => {
    const map = NGINX.match(/map \$http_user_agent \$linkhub_preview_bot \{([\s\S]*?)\}/);
    expect(map).not.toBeNull();
    const body = map![1];
    expect(body).toContain('default 0;');
    expect(body).toMatch(/"~\*\(/);
    for (const bot of ['whatsapp', 'facebookexternalhit', 'telegrambot', 'twitterbot', 'linkedinbot', 'discordbot', 'slackbot']) {
      expect(body).toContain(bot);
    }
  });

  it('deixa de fora exatamente as rotas do app (APP_ROUTE_SEGMENTS)', () => {
    const reserved = profileLocation()[1].split('|');
    expect([...reserved].sort()).toEqual([...APP_ROUTE_SEGMENTS].sort());
  });

  it('o @ casa com a regra do banco (^[a-z0-9_]{3,20}$)', () => {
    const pattern = new RegExp(`^/(?!(?:${profileLocation()[1]})$)([a-z0-9_]{3,20})$`);
    expect(pattern.test('/calog')).toBe(true);
    expect(pattern.test('/dna')).toBe(true);
    expect(pattern.test('/dashboard')).toBe(false);
    expect(pattern.test('/auth')).toBe(false);
    expect(pattern.test('/assets/index.js')).toBe(false);
    expect(pattern.test('/sw.js')).toBe(false);
    expect(pattern.test('/ab')).toBe(false);
  });

  it('só robôs vão para a edge function; quem visita recebe o site', () => {
    const block = NGINX.slice(NGINX.indexOf(profileLocation()[0]));
    const end = block.indexOf('\n    }');
    const location = block.slice(0, end);
    expect(location).toMatch(/if \(\$linkhub_preview_bot\)/);
    expect(location).toMatch(/rewrite \^\/\(\[a-z0-9_\]\+\)\$ \/__linkhub_og\/\$1 last;/);
    expect(location).toContain('try_files $uri /index.html;');
  });

  it('a busca na edge function é interna e volta ao site se ela falhar', () => {
    const start = NGINX.indexOf('location ~ "^/__linkhub_og/');
    expect(start).toBeGreaterThan(-1);
    const location = NGINX.slice(start, NGINX.indexOf('\n    }', start));
    expect(location).toContain('internal;');
    expect(location).toContain('/functions/v1/linkhub-profile-og?u=$1');
    expect(location).toContain('proxy_ssl_server_name on;');
    expect(location).toMatch(/resolver /);
    expect(location).toContain('proxy_intercept_errors on;');
    expect(location).toMatch(/error_page [0-9 ]*502[0-9 ]* = @linkhub_spa;/);
    expect(NGINX).toMatch(/location @linkhub_spa \{/);
  });
});
