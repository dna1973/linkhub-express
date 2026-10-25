# QR code no perfil público — especificação

**Data:** 25/10/2026
**Situação:** desenho aprovado pelo Daniel em 25/10/2026; revisado contra o código.

## Objetivo

Cada página pública do LinkHub (`linkhub.avila.ia.br/<username>`) mostra, no rodapé, um QR code que leva à própria página. O visitante aponta a câmera de outro celular e abre o perfil, sem digitar nada. O dono do perfil pode desligar o QR code na aba Perfil.

## Decisões tomadas com o Daniel

| Pergunta | Escolha |
|---|---|
| Para quem é o QR code | Para os visitantes da página pública |
| Como aparece | Sempre visível no rodapé, sem precisar tocar em nada |
| Controle do dono | Interruptor na aba Perfil, **ligado de início** em todos os perfis, inclusive os já existentes |
| Estilo | Cartão branco de cantos arredondados, com os módulos na cor escura do tema; preto se nenhuma cor do tema tiver contraste suficiente |
| Biblioteca | `qrcode.react` 4.2.0 (ISC, sem dependências), com import estático |

Sobre a biblioteca: a primeira ideia era carregá-la sob demanda. A revisão mostrou que, em `src/main.tsx`, o `reloadOnChunkError()` recarrega a página em qualquer falha de `import()` dinâmico, inclusive no perfil público, que não tem service worker. Com a rede caída, o visitante cairia na página de erro do navegador. O import estático custa cerca de **6,7 KB gzip** a mais no chunk compartilhado do `ProfileView`, que é lazy (carregado pela página pública e pelo Dashboard, nunca pelo chunk de entrada): de cerca de 5,6 KB para 12,4 KB gzip. Em troca, o QR code aparece junto com o resto da página, sem espaço vazio e sem risco de recarga.

## Fora do escopo

- Baixar o QR code como imagem (PNG ou SVG).
- Foto do perfil ou logotipo no centro do QR code.
- QR code no painel, fora da prévia do aparelho.
- Peça pronta para imprimir (cartão, folha A4).
- A edge function `linkhub-profile-og`, que monta a mesma URL com regra própria para as prévias de redes sociais. Ela continua como está.

## Comportamento

### Página pública e prévia

- O `ProfileView` ganha a prop `qrCodeUrl?: string | null`. Quando ela tem valor **e** `profile.show_qr_code !== false`, o rodapé (`text-center`) mostra, **acima** do botão "Clique aqui para criar seu LinkHub":
  1. um cartão branco (`#ffffff`), centralizado com `inline-block`, cantos `rounded-xl`, sombra leve (`shadow-md`) e respiro `p-2`, com o QR code de 120 × 120 px dentro;
  2. logo abaixo, a legenda "Aponte a câmera para abrir este perfil", `text-xs`, na cor do texto do tema com `opacity-80`, a mesma do @username. A revisão mediu que, com `opacity-60`, a legenda ficava abaixo de 4,5:1 em vários temas claros.
- O `ProfileView` não calcula a URL: ela vem pronta de quem o usa. Assim ele continua sem depender do cliente Supabase.
  - `PublicProfile` passa `getPublicProfileUrl(profile)`;
  - `ProfilePreview` passa `getPublicProfileUrl(profile)` com o perfil gravado que recebe do Dashboard.
- O QR code aparece nas duas variantes do `ProfileView`, `page` (página pública) e `device` (prévia do painel). Assim, o dono vê na prévia o que o visitante verá.
- Com `show_qr_code === false`, ou sem `qrCodeUrl` (sem username), nada do QR code é desenhado e o rodapé fica como hoje.
- `show_qr_code` ausente (`undefined`, perfil antigo) conta como **ligado**, como já acontece com `show_username !== false`.

### Endereço codificado

Uma função única monta a URL pública e passa a ser usada por **três** lugares do frontend:
- o QR code, via `PublicProfile` e `ProfilePreview`;
- o campo "Seu link para compartilhar" da aba Perfil;
- os botões "Ver Perfil" e "Copiar" da sidebar.

Hoje a aba Perfil e a sidebar montam o endereço cada uma de um jeito. A sidebar, por exemplo, sempre prefixa `https://`, mesmo quando o domínio personalizado já foi gravado com ele.

Assinatura: `getPublicProfileUrl(profile, siteUrl = PUBLIC_SITE_URL): string | null`, com `profile: { username?: string | null; preferred_domain?: string | null; custom_domain?: string | null } | null | undefined`.

Regras:
1. `username` passa por `trim`. Se ficar vazio (ou não houver perfil), devolve `null`.
2. Se `preferred_domain === 'custom'` e `custom_domain` tiver texto depois do `trim`:
   - se começar com `http://` ou `https://` (sem diferenciar maiúsculas), usa como está;
   - senão, prefixa `https://`.
3. Nos outros casos, usa `siteUrl`.
4. Remove as barras do fim do domínio e devolve `${domínio}/${username}`.

Para a função não puxar o cliente Supabase, o `PUBLIC_SITE_URL` sai de `src/lib/supabase.ts` para um módulo novo, `src/lib/siteUrl.ts`, com o mesmo cálculo de hoje. O `supabase.ts` reexporta (`export { PUBLIC_SITE_URL } from './siteUrl'`), e os imports atuais continuam valendo. O `publicProfileUrl.ts` importa de `./siteUrl`.

Na aba Perfil, a semântica de hoje se mantém: **username gravado** (`profile?.username`), porque o digitado pode estar inválido ou já em uso, e **domínio do formulário** (`formData.preferred_domain` e `formData.custom_domain`), ainda não salvo. Quando a função devolve `null`, o campo mostra "Configure seu @username primeiro", como hoje, e os `disabled={!profile?.username}` não mudam. O `getSelectedDomain` sai. O `shareableUrl` (edge function) não muda.

### Cor dos módulos

`getQrModuleColor(theme: ThemeConfig | null | undefined): string` devolve a primeira cor desta lista que tenha contraste de pelo menos **4,5:1** contra `#ffffff`:

1. `theme?.colors?.text || '#ffffff'` (a mesma reserva do `ProfileView`);
2. `getBaseBackgroundColor(theme)` (reserva interna `DEFAULT_BACKGROUND` = `#111827`);
3. `resolveButtonColors(theme ?? {}).bg` (`resolveButtonColors` não aceita `null`).

Cores que não forem hex válido (`normalizeHex` devolve `null`) são puladas. Se nenhuma servir, devolve `#000000`. A cor sai normalizada, em hex minúsculo de 6 dígitos.

Para a conta, `src/utils/linkButtonStyle.ts` passa a exportar `getContrastRatio(a: string, b: string): number | null`. Ela reaproveita `normalizeHex`, `relativeLuminance` e `contrastRatio`, que hoje são privados, e devolve `null` se alguma das duas cores não for hex válido. `getContrastText` não muda.

Exemplos (valores para os testes):

| Tema | Resultado | Por quê |
|---|---|---|
| texto `#1f2937`, fundo sólido `#ffffff` | `#1f2937` | texto passa (≈ 14,7:1) |
| perfil `dna`: texto `#F1F5F9`, fundo gradiente `['#0B1F3A', …]` | `#0b1f3a` | texto falha; fundo passa (≈ 16,8:1) |
| texto `#f1f5f9`, fundo sólido `#f8fafc`, botão sólido `#ffffff` | `#000000` | nada passa |
| `null` | `#111827` | texto `#ffffff` falha; reserva do fundo passa (≈ 17,7:1) |
| texto `'azul'` (inválido), fundo sólido `#0f172a` | `#0f172a` | texto pulado; fundo passa |

O cartão é sempre branco e o fundo do QR code também. Só os módulos mudam de cor com o tema; a legenda segue a cor do texto do tema, como o resto do rodapé.

### Aba Perfil

- Interruptor "Exibir QR code no perfil público", logo abaixo de "Exibir @username no perfil público", com a descrição "Quando desativado, o QR code não aparecerá no rodapé da sua página pública."
- O `Switch` ganha `id="show_qr_code"` e o `Label` ganha `htmlFor="show_qr_code"`, para ter nome acessível. Pelo mesmo motivo, o de @username ganha `id="show_username"` e `htmlFor`.
- Entra no `formData` como `show_qr_code` (inicial: `profile?.show_qr_code ?? true`), no `useEffect` que sincroniza com o `profile` e no `update` do `handleAutosave`, exatamente como o `show_username`.
- A prévia do aparelho acompanha depois do salvamento automático (cerca de 1,5 s), porque o `onProfileUpdate` recarrega o perfil no Dashboard.

## Arquitetura

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `package.json`, `package-lock.json` | Modificar | `qrcode.react` `4.2.0` fixo, sem `^` |
| `src/lib/siteUrl.ts` | Criar | `PUBLIC_SITE_URL`, com o cálculo que hoje está em `supabase.ts` |
| `src/lib/supabase.ts` | Modificar | Reexporta `PUBLIC_SITE_URL` de `./siteUrl` |
| `src/lib/publicProfileUrl.ts` | Criar | `getPublicProfileUrl` |
| `src/lib/publicProfileUrl.test.ts` | Criar | Domínio padrão; personalizado com e sem `https://`, e com `HTTPS://`; barras no fim; username com espaços em volta; sem username; `preferred_domain` personalizado com `custom_domain` vazio; perfil `null` |
| `src/utils/linkButtonStyle.ts` | Modificar | Exportar `getContrastRatio` |
| `src/utils/linkButtonStyle.test.ts` | Modificar | `getContrastRatio`: preto e branco = 21, mesma cor = 1, hex inválido = `null`, ordem dos argumentos indiferente |
| `src/utils/qrCodeColor.ts` | Criar | `getQrModuleColor` |
| `src/utils/qrCodeColor.test.ts` | Criar | As cinco linhas da tabela de exemplos |
| `src/components/profile/ProfileQrCode.tsx` | Criar | Cartão, QR code e legenda, dentro do limite de erro próprio |
| `src/components/profile/ProfileQrCode.test.tsx` | Criar | SVG gerado, cor dos módulos, nome acessível, legenda (pacote real) |
| `src/components/profile/ProfileQrCode.error.test.tsx` | Criar | Falha escondida e volta a desenhar com URL nova (pacote simulado) |
| `src/components/profile/ProfileView.tsx` | Modificar | `show_qr_code?: boolean` em `ProfileViewProfile`, a prop `qrCodeUrl` e, no rodapé, `<ProfileQrCode url={qrCodeUrl} color={getQrModuleColor(theme)} captionColor={textColor} />` |
| `src/components/profile/ProfileView.test.tsx` | Modificar | Ligado, desligado, ausente (= ligado), sem `qrCodeUrl`, nas duas variantes |
| `src/pages/PublicProfile.tsx` | Modificar | Passa `qrCodeUrl={getPublicProfileUrl(profile)}` |
| `src/components/dashboard/ProfilePreview.tsx` | Modificar | Passa `qrCodeUrl={getPublicProfileUrl(profile)}` |
| `src/components/dashboard/SettingsTab.tsx` | Modificar | Interruptor, `formData`, salvamento e `publicUrl` pela função única; o rótulo "Padrão (…)" passa a importar `PUBLIC_SITE_URL` de `@/lib/siteUrl`, para ter uma fonte só |
| `src/components/dashboard/SettingsTab.test.tsx` | Modificar | O mock de `useAutosave` guarda o callback; teste do interruptor |
| `src/components/dashboard/AppSidebar.tsx` | Modificar | `getPublicUrl` passa a ser `getPublicProfileUrl(profile)`; sai o import de `PUBLIC_SITE_URL`, que fica sem uso |
| `src/integrations/supabase/types.ts` | Modificar | `show_qr_code` em `profiles`: `boolean` em `Row`, `boolean` opcional em `Insert` e `Update` |
| `deploy/vpsavila/linkhub_schema.sql` | Modificar | `show_qr_code BOOLEAN NOT NULL DEFAULT true` logo após `show_username` |
| `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql` | Criar | Migração do banco que já existe (pasta nova) |
| `deploy/vpsavila/DEPLOY.md` | Modificar | Seção curta "Migrações": como aplicar um arquivo de `migrations/`, sempre antes de publicar o frontend que depende dele |

### `ProfileQrCode`

- Props: `url: string`, `color: string` (módulos) e `captionColor: string` (legenda).
- Import estático: `import { QRCodeSVG } from 'qrcode.react'`.
- `QRCodeSVG` com `value={url}`, `size={120}`, `level="M"`, `fgColor={color}`, `bgColor="#ffffff"`, `marginSize={2}` e `aria-hidden`. Os 2 módulos de margem branca somam com o `p-2` do cartão, formando a zona de silêncio que os leitores precisam.
- O cartão tem `role="img"` e `aria-label="QR code para abrir {url}"`. A legenda é texto comum.
- Limite de erro: um componente de classe pequeno no mesmo arquivo (`getDerivedStateFromError` com `return null` no `render`) envolve **o cartão e a legenda juntos**. Se o `qrcode.react` lançar erro (por exemplo, dado grande demais para o nível escolhido), o rodapé fica sem o QR code e o perfil segue normal. O erro vai para `console.error` no `componentDidCatch`.

### Banco

Arquivo `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql`:

```sql
ALTER TABLE linkhub.profiles ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN NOT NULL DEFAULT true;
NOTIFY pgrst, 'reload schema';
```

Aplicação, a partir do PowerShell na raiz do repositório e **antes** de publicar o frontend. Sem a coluna, o `update` do salvamento automático da aba Perfil falharia:

```powershell
Get-Content deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql -Raw | ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'
```

O `DEFAULT true` preenche todos os perfis existentes. O `NOTIFY` faz o PostgREST enxergar a coluna sem reiniciar. As políticas de RLS e os GRANTs são da tabela inteira e não mudam. `Dashboard.tsx` e `PublicProfile.tsx` buscam o perfil com `select('*')`, então a coluna chega à página pública, à prévia e à aba Perfil sem mexer nas consultas. A ordem inversa também é segura: o frontend antigo ignora a coluna nova.

## Erros e casos de borda

- **Erro ao gerar o QR code:** o limite de erro próprio esconde só o QR code. Não há `import()` dinâmico novo, então o `reloadOnChunkError` não entra em jogo.
- **Username trocado:** o QR code muda junto, porque é calculado a cada renderização a partir do perfil gravado.
- **Domínio personalizado que não serve o LinkHub:** o QR code aponta para ele, igual ao "Ver Perfil" de hoje. É escolha do dono.
- **URL longa** (domínio personalizado grande): o `qrcode.react` aumenta a versão do código sozinho. Com `level="M"`, cabe muito mais que qualquer URL realista, e em 120 px continua legível até umas 80 letras.

## Testes

- **Unitários:** `publicProfileUrl`, `getContrastRatio` e `qrCodeColor`, com os casos das tabelas acima.
  - Os testes de `publicProfileUrl` sempre passam o `siteUrl` explícito, com o 2º parâmetro em `'https://linkhub.avila.ia.br'`, e não dependem do `.env`. O `siteUrl.ts` protege o `window` (`typeof window !== 'undefined' ? window.location.origin : ''`), para o import não quebrar no ambiente node do Vitest, que é o padrão do projeto.
  - Em `getContrastRatio`, "preto e branco" usa `toBeCloseTo(21)` (ponto flutuante); "mesma cor" usa `toBeCloseTo(1)`.
  - Nos testes de cor, os temas parciais usam `as ThemeConfig`.
- **`ProfileQrCode`:** com o `qrcode.react` de verdade no jsdom. O teste confere:
  - o SVG renderizado;
  - o `aria-label` com a URL;
  - o atributo `fill` do `<path>` dos módulos com a cor passada;
  - a legenda;
  - que, se o `QRCodeSVG` lançar erro, nada é desenhado e o resto da árvore continua.

  A falha fica num arquivo próprio, `ProfileQrCode.error.test.tsx`, com o pacote inteiro simulado. O `QRCodeSVG` é um `React.forwardRef`, um objeto e não uma função, então não dá para embrulhá-lo com `vi.fn` mantendo o pacote real no mesmo arquivo. O teste silencia o `console.error` com `vi.spyOn` e confere o log do próprio componente (`'QR code do perfil:'`).
- **`ProfileView`:** passando `qrCodeUrl` explícito, sem nenhum mock do Supabase. Os casos são: ligado, desligado, ausente (= ligado) e sem `qrCodeUrl`, nas variantes `page` e `device`.
- **`ProfilePreview.test.tsx`:** continua passando sem mudar o mock de `@/lib/supabase`, porque o `publicProfileUrl` importa de `@/lib/siteUrl`. Se algum teste existente precisar de URL previsível, ele moca `@/lib/siteUrl`.
- **Aba Perfil:** o mock vira `useAutosave: vi.fn((data, save) => { mocks.autosave = { data, save }; return 'idle'; })`. O teste:
  1. clica em `getByRole('switch', { name: 'Exibir QR code no perfil público' })`;
  2. chama `mocks.autosave.save(mocks.autosave.data)`;
  3. confere o `update` com `expect.objectContaining({ show_qr_code: false })`.
- **Build:** confere pelo conteúdo, não pelo nome do arquivo (o chunk do pacote também se chamaria `index-*.js`).
  - Procura nos `.js` de `dist/assets` uma mensagem de erro própria do `qrcode.react`, que é string literal e sobrevive à minificação: `ECI assignment value out of range`. (`qrcodegen` não serve: é nome de variável e some.) Ela aparece **só** num chunk lazy compartilhado (o do `ProfileView`; o Rollup pode dar a ele o nome de outro módulo do grupo, como `publicProfileUrl-*.js`).
  - O chunk de entrada, o `assets/index-*.js` referenciado no `dist/index.html`, não deve contê-la.
- **Em produção:**
  - a migração aplicada e a coluna conferida com `SELECT`;
  - o QR code no rodapé do perfil `dna` e na prévia do painel;
  - o interruptor desligando e religando, com a prévia acompanhando;
  - **o Daniel escaneia com o celular** para confirmar que abre o perfil.
