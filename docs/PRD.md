# LinkHub Express — Documento de Requisitos de Produto (PRD)

**Versão:** 2.0
**Data:** 2026-10-23
**Status:** Ativo
**URLs:** https://linkhub.estudioai.site · https://linkhub-express.lovable.app

---

## 1. Visão geral
O **LinkHub Express** é uma plataforma de *link-in-bio*: cada usuário cria uma página pública (`/{username}`) que reúne redes sociais, sites e outros conteúdos. O produto se destaca pelo visual bem personalizável, pela configuração rápida (onboarding guiado) e por estatísticas detalhadas de visitas e cliques.

## 2. Problema
Instagram, TikTok e outras redes permitem só **um link na bio**. Criadores, profissionais e empresas precisam divulgar vários destinos. As ferramentas que já existem personalizam pouco o visual ou cobram caro por recursos básicos, como estatísticas.

## 3. Solução
- Uma página pública única, rápida e que funciona bem no celular.
- Onboarding em 4 passos que deixa a página pronta em poucos minutos.
- Modelos visuais prontos e um editor personalizado (fundo, tipografia, botões, avatar) com prévia em tempo real.
- Estatísticas por perfil e por link: localização, dispositivo, origem do acesso e horário.
- Painel de gestão para o administrador master.

## 4. Público-alvo e personas
| Persona | Descrição | Necessidade principal |
|---|---|---|
| **Pessoal** | Pessoa que quer centralizar suas redes | Configuração simples e visual bonito |
| **Criador** | Influenciador, artista, produtor de conteúdo | Destaque visual e métricas de engajamento |
| **Empresa** | Pequeno negócio, loja, profissional autônomo | Links para WhatsApp, loja e site, além de credibilidade |
| **Gestor master** | Administrador da plataforma | Controle de usuários e visão geral |

## 5. Proposta de valor e diferenciais
- Personalização visual maior que a dos concorrentes gratuitos.
- Dados de cada clique visíveis para o próprio dono da página.
- Onboarding adaptado ao tipo de uso.
- Suporte a domínio personalizado.
- Tema claro e escuro na landing page.

## 6. Jornada do usuário
```text
Landing page -> Cadastro/Login (email+senha ou Google) -> Confirmação de email
 -> Onboarding: 1) Tipo de uso  2) Detalhes do perfil  3) Modelo visual  4) Plataformas
 -> Dashboard (Links | Design | Analytics | Perfil) -> Ver perfil / Copiar link
 -> Visitante acessa /{username} -> visita e cliques registrados
```

## 7. Funcionalidades

### 7.1 Landing page
- Apresentação do produto, chamadas para cadastro e alternância entre tema claro e escuro.
- Página de exemplo com um celular simulado (estilo Samsung S24 Ultra) que mostra um perfil real.

### 7.2 Autenticação
- Cadastro e login com email e senha, com confirmação de email obrigatória.
- Login com Google.
- Sessão persistente e retorno do login social pela página de callback.

### 7.3 Onboarding (obrigatório no primeiro acesso)
1. **Tipo de uso:** Pessoal, Criador ou Empresa (obrigatório).
2. **Detalhes do perfil:** avatar (upload), nome exibido e biografia (até 160 caracteres).
3. **Modelo visual:** mais de 10 modelos com prévia em um celular simulado (este passo pode ser pulado).
4. **Plataformas:** 12 opções (Instagram, YouTube, TikTok, WhatsApp, Site, Facebook, LinkedIn, GitHub, Spotify, Email, Loja Online, Pinterest), com campo de URL opcional. Cada plataforma escolhida vira um link no perfil. Este passo pode ser pulado.

### 7.4 Gestão de links
- Criar, editar, excluir e ocultar links.
- Reordenar arrastando os itens.
- Ícone escolhido automaticamente a partir da URL ou do título (incluindo Google Drive e NotebookLM).
- Contador de cliques em cada link. Ao clicar no contador, abre a lista dos últimos 100 cliques com local, dispositivo, navegador, data/hora e origem do acesso.

### 7.5 Design
- **Aba Modelos:** os mesmos modelos do onboarding, aplicados com um clique.
- **Aba Personalizado:** fundo (cor, gradiente, imagem), tipografia, botões (estilo glass/solid/outline/modern/rounded, bordas de "nenhuma" até "completa", tamanho P/M/G) e avatar.
- Prévia instantânea no dashboard, igual à página pública.

### 7.6 Página pública
- Avatar, nome, bio, links e rodapé "Criar seu LinkHub".
- Links abrem na hora, inclusive no iPhone. O registro do clique acontece em segundo plano.
- Cada visita e cada clique são registrados.

### 7.7 Analytics
- Total de visitas e cliques, cliques por link e mapa de atividade por horário.
- Mapa mundial, tipos de dispositivo e painel de insights.

### 7.8 Perfil e configurações
- Username único, validado enquanto o usuário digita.
- Nome, bio, avatar com recorte, tipo de uso, domínio preferido ou personalizado e opção de exibir o username.
- Na barra lateral: botão "Ver Perfil" e ícone para copiar o link.

### 7.9 Painel Admin (somente gestor master)
- Estatísticas gerais, lista de usuários com busca e status (Ativo/Inativo).
- Inativar ou reativar usuários e excluí-los junto com todos os seus dados.
- O administrador não consegue inativar nem excluir a própria conta.

## 8. Métricas de sucesso
- Taxa de conversão de visitante para cadastro.
- Taxa de conclusão do onboarding.
- Número médio de links por usuário.
- Total de visitas e cliques por mês.
- Retenção mensal e uso das estatísticas.

## 9. Roadmap
| Fase | Entrega | Status |
|---|---|---|
| v1.0–1.3 | Autenticação, links, página pública, design, analytics, novos tipos de link | Concluído |
| v2.0 | Onboarding em 4 passos, modelos, painel Admin, detalhes de cliques, domínio personalizado | Concluído |
| v2.1 | Layouts alternativos (Cartão, Grade, Hero), exportação de cliques em CSV, filtros | Planejado |
| v3.0 | Planos pagos, agendamento de links, integrações | Futuro |

## 10. Riscos e premissas
- **Privacidade:** o app coleta IP e localização dos visitantes, o que exige seguir a LGPD e manter a política de privacidade.
- **Bloqueios no iOS:** os links precisam abrir diretamente no toque do usuário.
- **Precisão da localização:** depende de um serviço externo e pode falhar.
- **Premissa:** o backend gerenciado do Lovable Cloud garante a disponibilidade.

## 11. Tecnologias
React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, dnd-kit, Recharts, Zustand, Lovable Cloud (banco PostgreSQL com RLS, autenticação, armazenamento de arquivos e funções de servidor).

Requisitos detalhados: veja [REQUISITOS.md](./REQUISITOS.md).
