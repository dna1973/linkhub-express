# LinkHub Express — Especificação de Requisitos

**Versão:** 2.0 · **Data:** 2026-10-23

## 1. Requisitos Funcionais

### Autenticação
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-01 | Cadastro com email e senha | Um email de confirmação é enviado e o login só funciona depois da confirmação |
| RF-02 | Login com email e senha | Com credenciais válidas, o usuário entra no dashboard; com credenciais inválidas, vê uma mensagem de erro |
| RF-03 | Login com Google | O usuário volta para o callback e entra no dashboard já autenticado |
| RF-04 | Logout | A sessão é encerrada e o usuário é levado para a tela de login |
| RF-05 | Sessão persistente | Ao recarregar a página, o usuário continua logado |

### Onboarding
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-06 | Mostrar o onboarding a quem ainda não escolheu o tipo de uso | O diálogo não fecha enquanto o tipo de uso não for escolhido |
| RF-07 | Escolher o tipo de uso (Pessoal, Criador ou Empresa) | A escolha fica salva no perfil |
| RF-08 | Informar avatar, nome e bio | Os dados são salvos ao finalizar e a bio aceita até 160 caracteres |
| RF-09 | Escolher um modelo visual | O tema é salvo e aparece igual na prévia e na página pública |
| RF-10 | Escolher plataformas e suas URLs | Cada plataforma escolhida vira um link, na ordem de seleção |
| RF-11 | Pular os passos 3 e 4 | O usuário finaliza sem modelo e sem links |

### Links
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-12 | Criar, editar e excluir links | As mudanças aparecem na hora na lista e na prévia |
| RF-13 | Ocultar ou exibir um link | Um link oculto não aparece na página pública |
| RF-14 | Reordenar arrastando | A nova ordem fica salva |
| RF-15 | Ícone automático | O ícone certo aparece a partir da URL ou do título |
| RF-16 | Contar cliques | Cada clique na página pública soma 1 ao contador |
| RF-17 | Ver detalhes dos cliques | Ao clicar no contador, aparecem os últimos 100 cliques com local, dispositivo, navegador, data e origem |

### Design
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-18 | Aplicar um modelo pela aba Modelos | O tema muda na prévia e fica salvo |
| RF-19 | Personalizar fundo, tipografia, botões e avatar | Cada mudança aparece na prévia na hora |
| RF-20 | Escolher o tamanho do botão (P/M/G) e as bordas (nenhuma a completa) | A prévia e a página pública ficam iguais |
| RF-21 | Fazer upload de imagem de fundo | A imagem aparece no fundo da página pública |

### Página pública
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-22 | Exibir o perfil em /{username} | Mostra avatar, nome, bio, links visíveis e o tema salvo |
| RF-23 | Abrir links na hora | O link abre no toque, inclusive no Safari do iPhone, e o registro acontece em segundo plano |
| RF-24 | Registrar visitas | Cada visita é salva com local, dispositivo e origem |
| RF-25 | Username inexistente | Aparece a página "não encontrado" |

### Analytics
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-26 | Mostrar totais de visitas e cliques | Os números batem com os registros salvos |
| RF-27 | Mostrar o mapa de atividade, o mapa mundial e os dispositivos | Os gráficos aparecem com os dados do período |
| RF-28 | Mostrar o painel de insights | Destaca o link mais clicado e os principais países e dispositivos |

### Perfil
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-29 | Escolher um username único | O sistema avisa se o nome está disponível enquanto o usuário digita |
| RF-30 | Editar nome, bio, avatar (com recorte) e tipo de uso | Os dados ficam salvos e aparecem na prévia |
| RF-31 | Configurar domínio preferido ou personalizado | "Ver Perfil" e "Copiar link" passam a usar esse domínio |
| RF-32 | Copiar o link público | O link vai para a área de transferência e aparece uma confirmação |

### Landing page
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-33 | Alternar entre tema claro e escuro | O ícone de sol/lua troca o tema e o tema claro é o padrão |
| RF-34 | Página de exemplo | Mostra o celular simulado com um perfil de demonstração e se adapta ao celular |

### Administração
| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-35 | Acesso restrito a /admin | Só usuários com papel de admin entram; os demais são redirecionados |
| RF-36 | Listar usuários com busca e estatísticas | Mostra email, cadastro, último acesso e status |
| RF-37 | Inativar ou reativar um usuário | Um usuário inativo não consegue fazer login |
| RF-38 | Excluir um usuário | Remove a conta junto com o perfil, os links, os cliques, as visitas e os papéis |
| RF-39 | Mostrar o menu Admin só para administradores | O menu aparece na barra lateral apenas para quem tem o papel de admin |

## 2. Requisitos Não Funcionais
| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Desempenho | A página pública carrega em menos de 3 s (LCP) no 4G |
| RNF-02 | Responsividade | Layout pensado primeiro para celular, funcionando a partir de 360 px |
| RNF-03 | Segurança | Todas as tabelas têm RLS e cada usuário só altera os próprios dados |
| RNF-04 | Segurança | As ações de admin são validadas no servidor pela função `admin-users` |
| RNF-05 | Segurança | Os papéis ficam numa tabela separada (`user_roles`) e nunca nos dados que o usuário pode editar |
| RNF-06 | Privacidade | Conformidade com a LGPD, com uma política de privacidade publicada em /privacy |
| RNF-07 | Compatibilidade | Funciona nas 2 últimas versões de Chrome, Safari (incluindo iOS), Firefox e Edge |
| RNF-08 | Acessibilidade | HTML semântico, contraste AA e navegação pelo teclado |
| RNF-09 | Disponibilidade | 99,9% de disponibilidade via Lovable Cloud |
| RNF-10 | Usabilidade | O onboarding pode ser concluído em menos de 3 minutos |
| RNF-11 | SEO | Título, descrição e tags de compartilhamento (og) na landing page e nos perfis |

## 3. Regras de Negócio
| ID | Regra |
|---|---|
| RN-01 | O username é único e não diferencia maiúsculas de minúsculas |
| RN-02 | A bio aceita até 160 caracteres |
| RN-03 | O onboarding é obrigatório até o usuário escolher o tipo de uso |
| RN-04 | O admin não pode excluir nem inativar a própria conta |
| RN-05 | Os detalhes de cliques de um link só podem ser vistos pelo dono desse link |
| RN-06 | Links ocultos não contam na página pública |
| RN-07 | O usuário daniel.avila@prf.gov.br é o gestor master (papel admin) |
| RN-08 | A tela de detalhes mostra no máximo os 100 cliques mais recentes |

## 4. Modelo de Dados (resumo)
| Tabela | Campos principais |
|---|---|
| profiles | id, username, full_name, bio, avatar_url, theme_options (JSON), user_type, custom_domain, preferred_domain, show_username |
| links | id, user_id, title, url, position, is_visible, clicks |
| link_clicks | id, link_id, profile_id, clicked_at, country, city, device_type, user_agent, referrer, ip_address, session_id |
| profile_views | id, profile_id, viewed_at, country, city, device_type, user_agent, referrer, ip_address, session_id |
| user_roles | id, user_id, role (admin \| user) |

Função auxiliar: `has_role(user_id, role)`, usada nas políticas de RLS.
