# QR code no perfil público — especificação

**Data:** 25/10/2026
**Situação:** desenho aprovado pelo Daniel em 25/10/2026.

## Objetivo

Cada página pública do LinkHub (`linkhub.avila.ia.br/<username>`) mostra, no rodapé, um QR code que leva à própria página. O visitante aponta a câmera de outro celular e abre o perfil, sem digitar nada. O dono do perfil pode desligar o QR code na aba Perfil.

## Decisões tomadas com o Daniel

| Pergunta | Escolha |
|---|---|
| Para quem é o QR code | Para os visitantes da página pública |
| Como aparece | Sempre visível no rodapé, sem precisar tocar em nada |
| Controle do dono | Interruptor na aba Perfil, **ligado de início** em todos os perfis, inclusive os já existentes |
| Estilo | Cartão branco de cantos arredondados, com os módulos na cor escura do tema; preto se nenhuma cor do tema tiver contraste suficiente |
| Biblioteca | `qrcode.react` 4.2.0 (ISC, sem dependências), carregada sob demanda |

## Fora do escopo

- Baixar o QR code como imagem (PNG ou SVG).
- Foto do perfil ou logotipo no centro do QR code.
- QR code no painel, fora da prévia do aparelho.
- Peça pronta para imprimir (cartão, folha A4).

## Comportamento

### Página pública e prévia

- Com `show_qr_code` ligado e `username` preenchido, o rodapé do `ProfileView` mostra, **acima** do botão "Clique aqui para criar seu LinkHub":
  1. um cartão branco (`#ffffff`), cantos arredondados, sombra leve, com o QR code de 120 × 120 px dentro;
  2. a legenda "Aponte a câmera para abrir este perfil", na cor do texto do tema, com a mesma opacidade discreta do "Powered by LinkHub".
- O QR code aparece nas duas variantes do `ProfileView`: `page` (página pública) e `device` (prévia do aparelho no painel). Assim, o dono vê na prévia o que o visitante verá.
- Com `show_qr_code` desligado, ou sem `username`, nada do QR code é desenhado, e o rodapé fica como hoje.
- Valor ausente (`undefined`, perfil antigo em cache) conta como **ligado**, como já acontece com `show_username !== false`.

### Endereço codificado

Uma função única monta a URL pública e passa a ser usada por **três** lugares: o QR code, o campo "Seu link para compartilhar" da aba Perfil e os botões "Ver Perfil" e "Copiar" da sidebar. Hoje a aba Perfil e a sidebar montam o endereço cada uma de um jeito. A sidebar, por exemplo, não aceita domínio personalizado gravado com `https://`.

Regras de `getPublicProfileUrl({ username, preferred_domain, custom_domain })`:

1. Sem `username` (vazio ou só espaços): devolve `null`.
2. Se `preferred_domain === 'custom'` e `custom_domain` tiver texto (depois do `trim`):
   - se começar com `http://` ou `https://` (sem diferenciar maiúsculas), usa como está;
   - senão, prefixa `https://`.
3. Nos outros casos, usa `PUBLIC_SITE_URL`.
4. Remove as barras do fim do domínio e devolve `${domínio}/${username}`.

A aba Perfil chama a função com os valores do formulário, ainda não salvos, como faz hoje. A sidebar e o `ProfileView` chamam com o perfil gravado.

### Cor dos módulos

`getQrModuleColor(theme)` devolve a primeira cor desta lista que tenha contraste de pelo menos **4,5:1** contra o branco (WCAG 2.x, a mesma conta do `getContrastText`):

1. cor do texto do tema (`theme.colors.text`, com reserva `#ffffff`, igual ao `ProfileView`);
2. cor de fundo de referência (`getBaseBackgroundColor(theme)`);
3. cor do botão resolvida (`resolveButtonColors(theme).bg`).

Se nenhuma servir, ou se o tema for `null` e as reservas também não servirem, devolve `#000000`. A cor devolvida sai normalizada em hex minúsculo. Exemplos esperados:

- tema claro com texto `#1f2937`: `#1f2937`;
- perfil `dna` (texto branco, fundo `#0B1F3A`): `#0b1f3a`;
- tema com texto, fundo e botão todos claros: `#000000`.

O fundo do QR code é sempre branco. A legenda e o cartão não mudam de cor com o tema; só os módulos mudam.

### Aba Perfil

- Interruptor "Exibir QR code no perfil público", logo abaixo de "Exibir @username no perfil público", com a descrição "Quando desativado, o QR code não aparecerá no rodapé da sua página pública."
- Entra no `formData` como `show_qr_code` (inicial: `profile?.show_qr_code ?? true`), no `useEffect` que sincroniza com o `profile` e no `update` do salvamento automático, exatamente como o `show_username`.
- A prévia do aparelho acompanha depois do salvamento automático (cerca de 1,5 s), porque o `onProfileUpdate` recarrega o perfil.

## Arquitetura

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/publicProfileUrl.ts` | Criar | `getPublicProfileUrl` (regras acima) |
| `src/lib/publicProfileUrl.test.ts` | Criar | Domínio padrão, personalizado com e sem `https://`, barras no fim, sem username, personalizado vazio |
| `src/utils/linkButtonStyle.ts` | Modificar | Exportar `getContrastRatio(a, b)` sobre hex, reaproveitando `relativeLuminance` e `contrastRatio`, sem mudar `getContrastText` |
| `src/utils/qrCodeColor.ts` | Criar | `getQrModuleColor(theme)` |
| `src/utils/qrCodeColor.test.ts` | Criar | Os três exemplos acima, tema `null`, cor inválida pulada |
| `src/components/profile/ProfileQrCode.tsx` | Criar | Cartão, QR code carregado sob demanda e legenda |
| `src/components/profile/ProfileQrCode.test.tsx` | Criar | Codifica a URL recebida, cor dos módulos, nome acessível |
| `src/components/profile/ProfileView.tsx` | Modificar | Campos novos em `ProfileViewProfile` e o QR code no rodapé quando ligado |
| `src/components/profile/ProfileView.test.tsx` | Modificar | Ligado, desligado, ausente (= ligado), sem username |
| `src/components/dashboard/SettingsTab.tsx` | Modificar | Interruptor, `formData`, salvamento e `publicUrl` pela função única |
| `src/components/dashboard/SettingsTab.test.tsx` | Modificar | O interruptor grava `show_qr_code: false` |
| `src/components/dashboard/AppSidebar.tsx` | Modificar | `getPublicUrl` passa a usar a função única |
| `src/integrations/supabase/types.ts` | Modificar | `show_qr_code` em `profiles` (Row, Insert, Update) |
| `deploy/vpsavila/linkhub_schema.sql` | Modificar | Coluna nova na criação da tabela |
| `deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql` | Criar | Migração do banco que já existe |
| `package.json`, `package-lock.json` | Modificar | `qrcode.react` 4.2.0 fixo, sem `^` |

### `ProfileQrCode`

- Props: `url: string` e `color: string`, mais `captionColor`, com a cor do texto do tema para a legenda.
- O `QRCodeSVG` vem de `React.lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })))`. O pacote fica num chunk próprio, e o JS inicial da página pública não cresce. Enquanto carrega, o `Suspense` mostra um quadrado branco do mesmo tamanho, para a página não pular.
- `QRCodeSVG` com `value={url}`, `size={120}`, `level="M"`, `fgColor={color}`, `bgColor="#ffffff"` e `marginSize={2}`. Os 2 módulos de margem branca somam com o respiro do cartão (`p-2`), formando a zona de silêncio que os leitores precisam.
- Acessibilidade: o cartão tem `role="img"` e `aria-label="QR code para abrir {url}"`, e o SVG interno fica `aria-hidden`. A legenda é texto comum.

### Banco

Migração, aplicada **antes** de publicar o frontend. Sem a coluna, o salvamento automático do frontend novo falharia ao gravar `show_qr_code`:

```sql
ALTER TABLE linkhub.profiles ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN NOT NULL DEFAULT true;
NOTIFY pgrst, 'reload schema';
```

O `DEFAULT true` preenche todos os perfis existentes, e o `NOTIFY` faz o PostgREST enxergar a coluna sem reiniciar. As políticas de RLS não mudam: a leitura pública e a atualização pelo dono já cobrem a tabela inteira. As consultas usam `select('*')`, então a coluna chega à página pública, à prévia e à aba Perfil sem mudar as consultas.

## Erros e casos de borda

- **Chunk do `qrcode.react` falha ao carregar** (rede caiu, ou deploy no meio da visita): o QR code é um detalhe do rodapé e não pode derrubar nem recarregar o perfil. O `ProfileQrCode` envolve o `Suspense` num limite de erro próprio que, na falha, não desenha nada (nem cartão, nem legenda). O `ChunkErrorBoundary` geral não chega a ver esse erro.
- **Username trocado:** o QR code muda junto, porque é calculado a cada renderização.
- **Domínio personalizado que não serve o LinkHub:** o QR code aponta para ele, igual ao "Ver Perfil" de hoje. É escolha do dono.
- **URL longa** (domínio personalizado grande): o `qrcode.react` aumenta a versão do código sozinho, e em 120 px continua legível até umas 80 letras. Não há limite extra.

## Testes

- Unitários: `publicProfileUrl`, `qrCodeColor` e `getContrastRatio`, com os casos listados na tabela.
- Componente: `ProfileQrCode` (com `qrcode.react` de verdade no jsdom: espera o SVG aparecer e confere o `aria-label` e o `fill` dos módulos) e `ProfileView` (ligado, desligado, ausente, sem username, nas duas variantes).
- Aba Perfil: clicar no interruptor e conferir o `update` com `show_qr_code: false`.
- Build: o `qrcode.react` sai num chunk separado, e o `index-*.js` não o contém.
- Em produção:
  - a migração aplicada e a coluna conferida com `SELECT`;
  - o QR code no rodapé do perfil `dna`, nos temas claro e escuro, e na prévia do painel;
  - o interruptor desligando e religando, com a prévia acompanhando;
  - **o Daniel escaneia com o celular** para confirmar que abre o perfil.
