# PRD completo e Requisitos do LinkHub Express

## Objetivo
Gerar a documentação atualizada do produto, refletindo tudo o que existe hoje no app (o PRD atual, versão 1.0, está desatualizado).

## Entregáveis
1. **docs/PRD.md (v2.0)**: reescrito em português
   - Visão geral, problema, solução, público-alvo, personas (Pessoal, Criador, Empresa)
   - Proposta de valor e diferenciais
   - Jornada do usuário: landing page → cadastro/login (email + Google) → onboarding em 4 passos (tipo de uso, detalhes do perfil, modelo visual, plataformas) → dashboard → página pública
   - Funcionalidades: links (CRUD, drag-and-drop, ícones automáticos, cliques), detalhes de quem clicou por link, Design (abas Modelos e Personalizado: fundo, tipografia, botões com estilo/bordas/tamanho, avatar), preview em tempo real, analytics (visualizações, cliques, heatmap, mapa, dispositivos, insights), configurações do perfil, ver perfil/copiar link, tema claro/escuro, painel Admin (estatísticas, busca, inativar/reativar, excluir usuários)
   - Métricas de sucesso, roadmap atualizado, riscos e premissas
2. **docs/REQUISITOS.md** (novo)
   - Requisitos funcionais numerados (RF-01…), agrupados por módulo, cada um com critério de aceite
   - Requisitos não funcionais (RNF-01…): desempenho, segurança (RLS, papéis, admin validado no servidor), privacidade/LGPD, compatibilidade (incluindo iOS Safari), acessibilidade, responsividade, disponibilidade
   - Regras de negócio (RN-01…): username único, bio com até 160 caracteres, admin não pode excluir nem inativar a si mesmo, onboarding obrigatório até escolher o tipo de uso, etc.
   - Modelo de dados resumido (profiles, links, link_clicks, profile_views, user_roles)
3. **docs/PRD_EN.md**: atualizado com a versão em inglês do novo PRD.

## Detalhes técnicos
- O conteúdo vem da leitura do código atual (páginas, componentes do dashboard, OnboardingDialog, Admin, função admin-users, tipos do banco), para que a documentação bata com o que foi realmente implementado.
- Só arquivos de documentação; o app não muda.
