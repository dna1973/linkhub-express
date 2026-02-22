# LinkHub Express — Especificação Técnica (SPEC)

**Versão:** 1.0  
**Data:** 2026-02-22

---

## 1. Arquitetura

```
┌─────────────────────────────────────────────┐
│                 Frontend                     │
│   React 18 + TypeScript + Vite + Tailwind   │
│              Lovable Cloud                   │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────┐
│              Backend (Lovable Cloud)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │   Auth   │ │ Database │ │   Storage    │ │
│  │  (OAuth) │ │ (Postgres)│ │  (Buckets)  │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────────┐│
│  │         Edge Functions (Deno)            ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## 2. Modelo de Dados

### 2.1 Tabela `profiles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | ID do usuário (auth.users) |
| username | TEXT (UNIQUE, NULLABLE) | Nome de usuário público |
| full_name | TEXT | Nome completo |
| avatar_url | TEXT | URL do avatar |
| bio | TEXT | Biografia |
| theme_options | JSONB | Configurações de tema/design |
| custom_domain | TEXT | Domínio personalizado |
| preferred_domain | TEXT | Domínio preferido |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

### 2.2 Tabela `links`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL (PK) | ID do link |
| user_id | UUID (FK → profiles) | Dono do link |
| title | TEXT | Título do link |
| url | TEXT | URL de destino |
| position | INTEGER | Posição na ordenação |
| is_visible | BOOLEAN | Visibilidade |
| clicks | INTEGER | Contador de cliques |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

### 2.3 Tabela `profile_views`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL (PK) | ID da visualização |
| profile_id | UUID (FK → profiles) | Perfil visualizado |
| viewed_at | TIMESTAMPTZ | Data/hora da visualização |
| ip_address | TEXT | IP do visitante |
| user_agent | TEXT | User agent do navegador |
| device_type | TEXT | Tipo de dispositivo |
| country | TEXT | País |
| country_code | TEXT | Código do país |
| city | TEXT | Cidade |
| referrer | TEXT | Referrer |
| session_id | TEXT | ID da sessão |

### 2.4 Tabela `link_clicks`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL (PK) | ID do clique |
| link_id | INTEGER (FK → links) | Link clicado |
| profile_id | UUID | Perfil dono do link |
| clicked_at | TIMESTAMPTZ | Data/hora do clique |
| ip_address | TEXT | IP do visitante |
| user_agent | TEXT | User agent |
| device_type | TEXT | Tipo de dispositivo |
| country | TEXT | País |
| country_code | TEXT | Código do país |
| city | TEXT | Cidade |
| referrer | TEXT | Referrer |
| session_id | TEXT | ID da sessão |

---

## 3. Segurança

### 3.1 Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado:

- **profiles:** Leitura pública (para perfis públicos), escrita restrita ao próprio usuário
- **links:** Leitura pública (para perfis públicos), CRUD restrito ao próprio usuário
- **profile_views:** Inserção pública (anônima), leitura restrita ao dono do perfil
- **link_clicks:** Inserção pública (anônima), leitura restrita ao dono do perfil

### 3.2 Autenticação

- Email/senha com confirmação por email
- OAuth 2.0 com Google via Lovable Cloud Auth
- Tokens JWT gerenciados automaticamente
- Sessões persistentes com refresh automático

---

## 4. Estrutura de Diretórios

```
src/
├── assets/              # Ícones e imagens estáticas
├── components/
│   ├── analytics/       # Componentes de analytics
│   ├── dashboard/       # Componentes do dashboard
│   ├── design-system/   # Editor de design visual
│   └── ui/              # Componentes shadcn/ui
├── contexts/            # AuthContext
├── hooks/               # Hooks customizados
├── integrations/        # Clientes Supabase/Lovable
├── lib/                 # Utilitários
├── pages/               # Páginas/rotas
├── stores/              # Zustand stores
├── types/               # TypeScript types
└── utils/               # Funções utilitárias
```

---

## 5. Rotas

| Rota | Componente | Descrição | Auth |
|------|-----------|-----------|------|
| `/` | Index | Landing page | ❌ |
| `/auth` | Auth | Login/Cadastro | ❌ |
| `/auth/callback` | AuthCallback | Callback OAuth | ❌ |
| `/dashboard` | Dashboard | Painel principal | ✅ |
| `/analytics` | Analytics | Analytics detalhado | ✅ |
| `/:username` | PublicProfile | Perfil público | ❌ |
| `/example` | ExampleProfile | Exemplo de perfil | ❌ |
| `*` | NotFound | Página 404 | ❌ |

---

## 6. Tipos de Links Suportados

| Tipo | ID | Detecção por URL |
|------|----|------------------|
| Instagram | instagram | instagram.com |
| X (Twitter) | x | x.com, twitter.com |
| TikTok | tiktok | tiktok.com |
| Facebook | facebook | facebook.com |
| LinkedIn | linkedin | linkedin.com |
| YouTube | youtube | youtube.com |
| GitHub | github | github.com |
| Google Drive | googledrive | drive.google.com |
| NotebookLM | notebooklm | notebooklm.google.com |
| Website | website | (fallback → ícone Globe) |
| Email | email | mailto: |

---

## 7. Design System

### 7.1 Tokens CSS (index.css)

O sistema utiliza tokens semânticos HSL:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`
- `--card`, `--popover`, `--border`
- `--destructive`

### 7.2 Tema Dinâmico

Os usuários podem personalizar via `theme_options` (JSONB) no perfil:
- Cores primárias e de texto
- Cor de fundo e gradientes
- Estilo dos botões
- Fontes e tipografia
- Imagem de fundo

---

## 8. Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| react | ^18.3 | Framework UI |
| @dnd-kit/core | ^6.3 | Drag and drop |
| @dnd-kit/sortable | ^10.0 | Lista ordenável |
| recharts | ^2.12 | Gráficos |
| zustand | ^5.0 | State management |
| react-router-dom | ^6.26 | Roteamento |
| react-simple-maps | ^3.0 | Mapa mundial |
| sonner | ^1.5 | Notificações toast |
