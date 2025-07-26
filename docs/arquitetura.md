# Arquitetura do Sistema

## Visão Geral da Arquitetura

O LinkHub segue uma arquitetura moderna de SPA (Single Page Application) com backend-as-a-service.

## Diagrama de Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   CDN/Storage   │
│   (React/Vite)  │◄──►│   (PostgreSQL)  │◄──►│   (Assets)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Auth Service  │
│   (Deploy)      │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘
```

## Camadas da Aplicação

### 1. Camada de Apresentação (Frontend)
- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Estilização
- **shadcn/ui**: Componentes base
- **Vite**: Build tool e dev server

### 2. Camada de Estado
- **Zustand**: Gerenciamento de estado global
- **React Query**: Cache e sincronização de dados
- **React Hook Form**: Gerenciamento de formulários

### 3. Camada de Dados
- **Supabase**: Backend-as-a-Service
  - PostgreSQL como banco de dados
  - Auth integrado
  - Real-time subscriptions
  - Storage para assets

### 4. Camada de Roteamento
- **React Router DOM**: Roteamento client-side
- Rotas protegidas com autenticação
- Lazy loading de componentes

## Estrutura de Dados

### Tabelas Principais

#### profiles
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  theme JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### links
```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### analytics
```sql
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  link_id UUID REFERENCES links(id),
  event_type TEXT NOT NULL, -- 'view', 'click'
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Fluxo de Dados

### 1. Autenticação
```
User → Auth Form → Supabase Auth → JWT Token → Protected Routes
```

### 2. Gerenciamento de Links
```
Dashboard → Form → React Query → Supabase → Database → UI Update
```

### 3. Visualização Pública
```
Public URL → Profile Fetch → Links Fetch → Render → Analytics Track
```

## Padrões de Design

### 1. Component Composition
- Componentes pequenos e reutilizáveis
- Props drilling evitado com contextos
- Compound components para UI complexa

### 2. Custom Hooks
- Lógica de negócio encapsulada
- Reutilização entre componentes
- Separação de concerns

### 3. Error Boundaries
- Tratamento gracioso de erros
- Fallback UIs
- Logging centralizado

## Segurança

### 1. Autenticação
- JWT tokens com refresh automático
- Row Level Security (RLS) no Supabase
- Rotas protegidas no frontend

### 2. Validação
- Validação client-side com Zod
- Validação server-side no Supabase
- Sanitização de inputs

### 3. CORS e CSP
- Configuração adequada de CORS
- Content Security Policy
- Rate limiting no Supabase

## Performance

### 1. Code Splitting
- Lazy loading de rotas
- Dynamic imports
- Bundle optimization

### 2. Caching
- React Query para cache de dados
- Service Worker para assets
- CDN para recursos estáticos

### 3. Otimizações
- Image optimization
- Minificação de assets
- Tree shaking