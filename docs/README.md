# LinkHub - Documentação do Projeto

## Visão Geral

O LinkHub é uma plataforma moderna para criação de páginas de links personalizadas, permitindo que usuários centralizem todos os seus links importantes em uma única página profissional e customizável.

## Índice da Documentação

- [Arquitetura do Sistema](./arquitetura.md)
- [Guia de Instalação](./instalacao.md)
- [Funcionalidades Atuais](./funcionalidades.md)
- [Login Social](./login-social.md)
- [Plano de Novas Features](./roadmap.md)
- [Painel de Analytics](./analytics.md)
- [API e Integrações](./api.md)
- [Guia de Contribuição](./contribuicao.md)

## Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estado**: Zustand + React Query
- **Roteamento**: React Router DOM
- **Gráficos**: Recharts
- **Drag & Drop**: @dnd-kit

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── dashboard/      # Componentes específicos do dashboard
│   └── ui/            # Componentes base do shadcn/ui
├── contexts/          # Contextos React (Auth, etc.)
├── hooks/            # Custom hooks
├── integrations/     # Integrações externas (Supabase)
├── lib/             # Utilitários e configurações
├── pages/           # Páginas da aplicação
└── stores/          # Stores do Zustand
```

## Links Rápidos

- [Configurar Ambiente de Desenvolvimento](./instalacao.md#desenvolvimento)
- [Implementar Nova Feature](./contribuicao.md#implementacao)
- [Visualizar Analytics](./analytics.md#dashboard)
- [Roadmap de Features](./roadmap.md)