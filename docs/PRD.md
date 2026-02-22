# LinkHub Express — Product Requirements Document (PRD)

**Versão:** 1.0  
**Data:** 2026-02-22  
**Status:** Ativo

---

## 1. Visão Geral

O **LinkHub Express** é uma plataforma web que permite aos usuários criar uma página de links personalizada (link-in-bio) para centralizar e compartilhar seus perfis em redes sociais, websites e outros recursos online. Inspirado em ferramentas como Linktree e Bento, o LinkHub Express se diferencia pela personalização visual avançada e analytics detalhados.

**URL de produção:** https://linkhub-express.lovable.app

---

## 2. Problema

Criadores de conteúdo, profissionais e empresas precisam compartilhar múltiplos links em plataformas que permitem apenas um link na bio (Instagram, TikTok, etc.). As soluções existentes são limitadas em personalização visual ou cobram valores elevados por funcionalidades básicas.

---

## 3. Público-Alvo

- Criadores de conteúdo e influenciadores digitais
- Profissionais autônomos e freelancers
- Pequenas empresas e empreendedores
- Estudantes e acadêmicos
- Qualquer pessoa que deseja centralizar links

---

## 4. Funcionalidades Principais

### 4.1 Autenticação
- Cadastro e login com email/senha
- Login social com Google (OAuth)
- Confirmação de email obrigatória
- Sessão persistente

### 4.2 Gerenciamento de Links
- Criar, editar e excluir links
- Tipos de links suportados: Instagram, X (Twitter), TikTok, Facebook, LinkedIn, YouTube, GitHub, Google Drive, NotebookLM, Website, Email
- Reordenação via drag-and-drop
- Detecção automática de ícones por URL/título
- Contador de cliques por link

### 4.3 Perfil Público
- Página pública acessível via `/{username}`
- Exibição de avatar, nome, bio e links
- Registro de visualizações do perfil
- Rastreamento de cliques nos links

### 4.4 Personalização Visual (Design System)
- Temas de cores personalizáveis
- Estilos de botão: glass, solid, outline, modern, rounded
- Upload de imagem de fundo
- Tipografia customizável
- Preview em tempo real no dashboard

### 4.5 Analytics
- Total de visualizações do perfil
- Cliques por link
- Heatmap de atividade
- Distribuição geográfica (mapa mundial)
- Detecção de tipo de dispositivo
- Painel de insights

### 4.6 Configurações do Perfil
- Definição de username único
- Edição de nome completo, bio e avatar
- Validação de username em tempo real

---

## 5. Requisitos Não-Funcionais

| Requisito | Especificação |
|-----------|--------------|
| Performance | Carregamento < 3s (LCP) |
| Responsividade | Mobile-first, suporte a todos os breakpoints |
| Segurança | RLS no banco, autenticação obrigatória para CRUD |
| Disponibilidade | 99.9% uptime via Lovable Cloud |
| Acessibilidade | Semântica HTML, contraste adequado |

---

## 6. Métricas de Sucesso

- Taxa de conversão de visitante → cadastro
- Número médio de links por usuário
- Cliques totais nos links dos usuários
- Engajamento com analytics
- Retenção mensal de usuários

---

## 7. Roadmap

| Fase | Funcionalidade | Status |
|------|---------------|--------|
| v1.0 | Autenticação, CRUD de links, perfil público | ✅ Concluído |
| v1.1 | Design system, personalização visual | ✅ Concluído |
| v1.2 | Analytics avançados, geolocalização | ✅ Concluído |
| v1.3 | Novos tipos de link (Drive, NotebookLM) | ✅ Concluído |
| v2.0 | Domínios customizados, templates | 🔜 Planejado |

---

## 8. Tecnologias

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **UI:** shadcn/ui, Radix UI, Lucide Icons, Framer Motion
- **Backend:** Lovable Cloud (Supabase)
- **Banco de dados:** PostgreSQL com Row Level Security
- **Autenticação:** Email/senha + Google OAuth
- **Drag & Drop:** dnd-kit
- **Charts:** Recharts
- **State Management:** Zustand
