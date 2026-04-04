/**
 * Manual de capacitação (PT): capítulos por slug de rota de menu.
 * Campos dos blocos: id, h, html, icon? (Bootstrap Icons), cat? (i18n capacitacion.cat_<cat>).
 */
export const CHAPTERS = {
  admin__dashboard: {
    overview:
      'Este é normalmente o primeiro ecrã que a equipa administrativa vê ao entrar no GROBO. Ajuda a perceber o que precisa de atenção e a saltar rapidamente para protocolos, pedidos, reservas, mensagens e outras áreas do dia a dia.\n\nPense nele como um painel de controlo, não como o sítio onde cada tarefa termina: números e cartões resumem trabalho que continua nos módulos dedicados. Abaixo explicamos o menu lateral, a barra superior e como ler os blocos sem os confundir com filas completas.',
    summary:
      'Painel inicial da administração da sede: visão rápida da atividade, atalhos a módulos críticos e lembretes operacionais.',
    roles:
      'Utilizadores com menu administrativo (tipicamente perfil mestre em contexto de instituição, superadmin da sede, admin da sede). O visível depende dos módulos contratados e permissões.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'info-circle',
        h: 'O que é este ecrã',
        html: '<p>É o <strong>ponto de entrada</strong> após login de administração: resume o urgente e dá atalhos. <strong>Não substitui</strong> as filas completas de protocolos, pedidos ou reservas—abra esses módulos para detalhe e trabalho em massa.</p>',
      },
      {
        id: 'nav_marco',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Menu lateral (cada item)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-house-door text-success" aria-hidden="true"></i> Painel / Início</dt><dd>Volta a esta vista.</dd><dt><i class="bi bi-people text-success" aria-hidden="true"></i> Utilizadores</dt><dd>Abre o diretório de contas e perfis da sede.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolos / Pedidos de protocolo</dt><dd>Gestão operacional ou fila de tramitação conforme o rótulo exato.</dd><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Animais, reagentes, insumos</dt><dd>Filas de pedidos por tipo (se o módulo estiver contratado).</dd><dt><i class="bi bi-calendar-week text-success" aria-hidden="true"></i> Reservas / Alojamentos</dt><dd>Agenda e infraestrutura ou estadias no biotério.</dd><dt><i class="bi bi-bar-chart-line text-success" aria-hidden="true"></i> Estatísticas</dt><dd>Indicadores e relatórios agregados.</dd><dt><i class="bi bi-gear text-success" aria-hidden="true"></i> Configuração</dt><dd>Centro de parâmetros (submenus).</dd><dt><i class="bi bi-currency-dollar text-success" aria-hidden="true"></i> Preços / Faturação / Histórico contabilístico</dt><dd>Módulo financeiro se ativo.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> Notícias (admin)</dt><dd>Publicação de avisos do portal.</dd><dt><i class="bi bi-question-circle text-success" aria-hidden="true"></i> Ajuda (Capacitação, Bilhete, Vendas)</dt><dd>Manual e tutoriais para todos; <strong>Bilhete/Contacto</strong> (suporte Gecko) costuma estar só em perfis <strong>administrativos</strong> para falhas da aplicação; <strong>Vendas</strong> é contacto comercial.</dd></dl><p class="small text-muted mt-2 mb-0">Itens que <strong>não vê</strong> costumam estar ocultos por <strong>módulo</strong> ou <strong>perfil</strong>.</p>',
      },
      {
        id: 'nav_superior',
        cat: 'navigation',
        icon: 'window',
        h: 'Barra superior (ícones habituais)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Sino / Notificações</dt><dd>Abre ou pré-visualiza alertas recentes.</dd><dt><i class="bi bi-brightness-high text-success" aria-hidden="true"></i> Tema claro / escuro</dt><dd>Alterna o contraste da interface se existir.</dd><dt><i class="bi bi-globe2 text-success" aria-hidden="true"></i> Idioma</dt><dd>Muda o idioma da UI quando há seletor global.</dd><dt><i class="bi bi-person-circle text-success" aria-hidden="true"></i> Perfil / utilizador</dt><dd>Acesso a <strong>O meu perfil</strong>, sair ou dados de conta.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Instituição / sede</dt><dd>Se gere várias sedes, escolha o contexto aqui quando aplicável.</dd></dl>',
      },
      {
        id: 'dash_bloques',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Blocos do painel (cartões, números, listas)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-graph-up-arrow text-success" aria-hidden="true"></i> Contadores e KPI</dt><dd>Números que resumem pendências (pedidos, mensagens). Um clique costuma abrir o módulo filtrado.</dd><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Cartões de atalho</dt><dd>Atalhos gráficos; equivalente a abrir o mesmo destino no menu lateral.</dd><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Listas de movimentos recentes</dt><dd>Mostram um subconjunto; use <strong>Ver tudo</strong> ou o menu para a lista completa.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega dados do painel sem F5.</dd></dl><p class="small text-muted mt-2 mb-0">Se um número <strong>não bater</strong> com a realidade, abra o módulo de origem: o painel pode ser só um resumo.</p>',
      },
      {
        id: 'flujo',
        cat: 'content',
        icon: 'diagram-3',
        h: 'Fluxo de trabalho recomendado',
        html: '<ol class="mb-0 small"><li><strong>Entrada:</strong> rever pedidos de protocolo, pedidos operacionais e mensagens institucionais.</li><li><strong>Operação:</strong> processar filas na ordem acordada com o biotério.</li><li><strong>Fecho:</strong> reservas em conflito, alojamentos a faturar e vistas de faturação se aplicável.</li></ol>',
      },
      {
        id: 'fab_otras',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'Noutros ecrãs: barra inferior verde',
        html: '<p>Fora deste painel, muitas páginas mostram uma <strong>barra fixa inferior</strong> com <strong>«Ver documento de ajuda»</strong> (manual nesse tema) e <strong>«Tutorial interativo»</strong> (realce dos controlos, se existir percurso para a rota).</p><ul class="mb-0"><li>Incidências técnicas: <strong>Ajuda → Bilhete/Contacto</strong>.</li><li>Manual completo: <strong>Ajuda → Capacitação</strong>.</li></ul>',
      },
    ],
  },
  panel__dashboard: {
    overview:
      'Quando utiliza o GROBO para pedidos ou para acompanhar protocolos e mensagens, este é o ecrã de boas-vindas. Reúne atalhos para o que investigadores e técnicos usam com mais frequência.\n\nO menu lateral continua a ser o mapa completo; aqui tem um caminho visual mais rápido. Se falta um módulo, a sede não o ativou ou o seu perfil não tem acesso—é esperado, não um erro.',
    summary:
      'Início do painel do investigador: acesso rápido a protocolos, pedidos e comunicações.',
    roles:
      'Investigadores e utilizadores da sede nessa função (perfis 3, 5, 6 ou outros conforme a instituição). Só vê módulos que o administrador ativou.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'house-door',
        h: 'O que é o painel do investigador',
        html: '<p>Vista de <strong>entrada</strong> após o login: atalhos ao que usa no dia a dia. O menu lateral só lista módulos <strong>ativados</strong> para o seu utilizador.</p>',
      },
      {
        id: 'nav_lateral',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Menu lateral (itens frequentes)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-ui-checks text-success" aria-hidden="true"></i> Centro de pedidos / Formulários</dt><dd>Inicia novos pedidos de animais, reagentes ou insumos conforme o contrato.</dd><dt><i class="bi bi-card-list text-success" aria-hidden="true"></i> Os meus formulários</dt><dd>Histórico e estado de tudo o que enviou.</dd><dt><i class="bi bi-file-earmark-medical text-success" aria-hidden="true"></i> Os meus protocolos</dt><dd>Vigência e dados do estudo que autorizam os pedidos.</dd><dt><i class="bi bi-house-heart text-success" aria-hidden="true"></i> Os meus alojamentos / As minhas reservas</dt><dd>Consulta de estadias ou agenda própria.</dd><dt><i class="bi bi-chat-dots text-success" aria-hidden="true"></i> Mensagens / Mensagens institucionais</dt><dd>Comunicação 1:1 ou avisos oficiais.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> Notícias</dt><dd>Quadro da instituição.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> O meu perfil</dt><dd>Dados, idioma, tema e e-mail para notificações.</dd></dl>',
      },
      {
        id: 'dash_tarjetas',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Cartões e atalhos do painel',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Atalhos (tiles)</dt><dd>Cada cartão abre o módulo indicado—igual a escolher no menu.</dd><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Avisos</dt><dd>Podem mostrar vencimentos de protocolo ou itens a corrigir.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega dados do painel se existir botão.</dd></dl>',
      },
      {
        id: 'pedidos',
        cat: 'content',
        icon: 'clipboard-check',
        h: 'Pedidos: onde começam e onde acompanhar',
        html: '<ul class="mb-0"><li><strong>Criar:</strong> <em>Centro de pedidos</em> → escolha o tipo e preencha campos obrigatórios.</li><li><strong>Acompanhar:</strong> <em>Os meus formulários</em> → abra o item para ver estado, notas e anexos.</li><li>O texto exato de <strong>Enviar</strong> / <strong>Guardar rascunho</strong> pode variar.</li></ul>',
      },
      {
        id: 'fab',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'Barra inferior verde (noutros ecrãs)',
        html: '<p>Em ecrãs como <strong>Os meus formulários</strong> ou o <strong>Centro de pedidos</strong>, a barra fixa oferece <strong>Ver documento de ajuda</strong> e, se aplicável, <strong>Tutorial interativo</strong>.</p><figure class="manual-cap-figure my-3 border rounded overflow-hidden"><img src="../../dist/img/capacitacion/panel-barra-ayuda-inferior.svg" width="640" height="120" alt="Esquema: faixa verde fixa na margem inferior da janela com atalhos de ajuda." class="img-fluid d-block w-100" style="max-height:140px;object-fit:contain" loading="lazy" decoding="async" /><figcaption class="small text-body-secondary px-3 py-2 border-top">Esquema orientativo da barra inferior; sem dados de utilizador nem captura real.</figcaption></figure>',
      },
      {
        id: 'red',
        cat: 'links',
        icon: 'share',
        h: 'Instituição em REDE',
        html: '<p>Se a sua dependência agrupa várias sedes, leia também <strong>Trabalhar em REDE</strong>. Menus e derivações podem diferir.</p>',
      },
    ],
  },
  admin__usuarios: {
    overview:
      'Em Utilizadores gere-se quem pode entrar no GROBO, com que permissões e em que departamento figura. Também é o sítio habitual para rever contactos, repor acessos segundo a política da sede e perceber como cada pessoa se relaciona com protocolos ou pedidos.\n\nNão é uma agenda social: é uma ferramenta de administração. As ações (criar, editar, exportar) dependem do seu perfil e das regras da instituição. Respeite sempre a proteção de dados ao exportar listas ou partilhar informação.',
    summary:
      'Diretório de pessoas da sede: criação, edição, departamento, perfis e ligação a protocolos e formulários.',
    roles:
      'Administração da sede (tipicamente perfis 2 e 4). O perfil mestre (1) pode atuar em contexto superadmin; as ações dependem da política interna.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'people',
        h: 'Objetivo de Utilizadores e perfis',
        html: '<p class="mb-0">Gira <strong>quem pode entrar</strong> no GROBO, o <strong>perfil</strong>, o <strong>departamento</strong> e as ligações a <strong>protocolos</strong> e <strong>pedidos</strong>. Os rótulos exatos dos botões podem variar ligeiramente na sua sede.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-door-open text-success" aria-hidden="true"></i> Acesso e perfil</dt><dd>Quem pode iniciar sessão nesta sede e com que nível de permissões no menu.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Departamento ou unidade</dt><dd>Onde a pessoa figura para organização e filtros da grelha.</dd><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Protocolos e pedidos</dt><dd>Como a conta se liga a trâmites e formulários em curso; influencia o que pode ver e pedir.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Botões típicos na barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Novo utilizador / Convidar</dt><dd>Abre o formulário para criar conta ou enviar convite.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar lista</dt><dd>Recarrega a grelha a partir do servidor.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar Excel / CSV</dt><dd>Ficheiro tabular para auditoria—cumpra RGPD.</dd><dt><i class="bi bi-file-earmark-pdf text-success" aria-hidden="true"></i> Exportar PDF / Imprimir</dt><dd>Relatório ou vista de impressão.</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Descarregar / Modelo</dt><dd>Algumas sedes disponibilizam modelo de importação em massa.</dd><dt><i class="bi bi-upload text-success" aria-hidden="true"></i> Importar utilizadores</dt><dd>Carrega ficheiro validado; costuma haver <strong>confirmação</strong> com resumo de linhas.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros e pesquisa',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisa de texto</dt><dd>Por nome, apelido, utilizador, e-mail ou documento. <kbd>Enter</kbd> ou lupa.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtro por perfil</dt><dd>Admin, Investigador, Laboratório, etc.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Filtro por departamento</dt><dd>Restringe a uma unidade.</dd><dt><i class="bi bi-toggle-on text-success" aria-hidden="true"></i> Só ativos / Incluir inativos</dt><dd>Contas desativadas ou históricas.</dd><dt><i class="bi bi-x-lg text-success" aria-hidden="true"></i> Limpar filtros</dt><dd>Repor critérios.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Tabela de utilizadores',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-down-up text-success" aria-hidden="true"></i> Cabeçalhos ordenáveis</dt><dd>Clique para ordenar ascendente/descendente.</dd><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Coluna de perfil</dt><dd>Nível de acesso principal.</dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> E-mail</dt><dd>Manter atualizado para notificações e recuperação de senha.</dd><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Ícone lápis na linha</dt><dd>Atalho à edição ou ficha.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Clique na linha e menu de ações',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Clique na linha</dt><dd>Abre a <strong>ficha completa</strong>.</dd><dt><i class="bi bi-three-dots-vertical text-success" aria-hidden="true"></i> Menu ⋮</dt><dd>Pode incluir <strong>Editar</strong>, <strong>Redefinir senha</strong>, <strong>Desativar</strong>, etc.</dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Redefinir / enviar ligação</dt><dd>Fluxo de nova senha—confirme identidade.</dd><dt><i class="bi bi-person-x text-success" aria-hidden="true"></i> Desativar</dt><dd>Bloqueia novos acessos; dados costumam manter-se. Pode pedir <strong>confirmação</strong>.</dd></dl>',
      },
      {
        id: 'ficha',
        cat: 'detail',
        icon: 'card-heading',
        h: 'Dentro da ficha de utilizador',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Guardar</dt><dd>Persiste alterações; erros de validação marcam campos.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Voltar / Fechar</dt><dd>Regressa à lista; alterações não guardadas podem avisar.</dd><dt><i class="bi bi-diagram-3 text-success" aria-hidden="true"></i> Separador Protocolos / Formulários</dt><dd>Ligações operacionais—verifique antes de apagar ou mudar perfil.</dd></dl><p class="small text-muted mt-2 mb-0">Mudar <strong>perfil</strong> pode alterar o menu <strong>no próximo login</strong> ou de imediato.</p>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Janelas emergentes habituais',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Confirmação de desativação</dt><dd>Leia o impacto antes de aceitar.</dd><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Sucesso ao guardar</dt><dd>Confirma que os dados foram gravados.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Erro de permissão</dt><dd>O seu perfil não pode executar a ação ou houve conflito de versão.</dd></dl>',
      },
      {
        id: 'vinculos',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Boas práticas',
        html: '<ul class="mb-0"><li>Antes de <strong>dar baixa</strong>, confirme que não é titular único de protocolos ativos.</li><li>Não partilhe exportações com dados pessoais fora da instituição sem base legal.</li><li>Documente mudanças sensíveis de perfil segundo o procedimento interno.</li></ul>',
      },
    ],
  },
  admin__protocolos: {
    overview:
      'Este módulo é a «mesa de trabalho» dos protocolos já na plataforma ou em uso quotidiano: vigências, espécies permitidas, participantes e estados que condicionam pedidos de animais ou outros trâmites.\n\nNão confunda com a fila de «Pedidos de protocolo»: ali entram novos trâmites ou renovações; aqui mantém e ajusta o já aprovado. Se a vigência mudar ou o estudo for suspenso, o impacto nota-se em pedidos e alojamentos—revise com cuidado antes de confirmar.',
    summary:
      'Gestão operacional de protocolos já na plataforma: estado, dados do estudo, espécies e ligação a pedidos e alojamentos.',
    roles:
      'Administração do biotério / conformidade / secretariado técnico da sede. Não confundir com a fila de «Pedidos de protocolo» para novas submissões.',
    blocks: [
      {
        id: 'diferencia',
        cat: 'navigation',
        icon: 'signpost-split',
        h: 'Protocolos (este ecrã) vs Pedidos de protocolo',
        html: '<p><strong>Aqui</strong> trabalha protocolos já no sistema. <strong>Pedidos de protocolo</strong> é a <strong>fila de tramitação</strong> de novas candidaturas ou renovações.</p><ul class="mb-0"><li>Menu lateral <strong>Pedidos de protocolo</strong> → itens em curso de aprovação.</li><li>Esta grelha → manutenção do ciclo de vida após aprovação.</li></ul>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra de ferramentas',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Novo protocolo manual</dt><dd>Raro: só se a sede permitir alta direta.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega estados.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar lista</dt><dd>Vista filtrada para comités ou auditoria.</dd><dt><i class="bi bi-printer text-success" aria-hidden="true"></i> Imprimir / PDF</dt><dd>Versão imprimível.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros da fila',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisa global</dt><dd>Título, código, palavras-chave.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Investigador principal</dt><dd>Protocolos onde é responsável.</dd><dt><i class="bi bi-toggle2-on text-success" aria-hidden="true"></i> Estado operacional</dt><dd>Ativo, suspenso, vencido, em renovação…</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Vigência</dt><dd>Intervalo de datas para encontrar vencimentos.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Colunas da grelha',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bookmark text-success" aria-hidden="true"></i> Código / referência</dt><dd>ID para cruzar com pedidos e alojamentos.</dd><dt><i class="bi bi-calendar-event text-success" aria-hidden="true"></i> Início e fim de vigência</dt><dd>Condicionam pedidos de animais e dias de alojamento.</dd><dt><i class="bi bi-bug text-success" aria-hidden="true"></i> Espécies autorizadas</dt><dd>Resumo ou ligação a limites.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Abrir protocolo e ações na ficha',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Editar dados administrativos</dt><dd>Corrige título, departamento, centros de custo.</dd><dt><i class="bi bi-pause-btn text-success" aria-hidden="true"></i> Suspender / reativar</dt><dd>Bloqueia novos pedidos enquanto se resolve incumprimento.</dd><dt><i class="bi bi-diagram-2 text-success" aria-hidden="true"></i> Participantes</dt><dd>Co-investigadores ou pessoal autorizado.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Documentação</dt><dd>PDFs de comité, emendas.</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Confirmações frequentes',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Alteração de vigência</dt><dd>Pode avisar que pedidos abertos ficam fora de âmbito.</dd><dt><i class="bi bi-check-lg text-success" aria-hidden="true"></i> Guardar espécies / quotas</dt><dd>Valida quantidades face à política interna.</dd></dl>',
      },
      {
        id: 'integracion',
        cat: 'content',
        icon: 'link-45deg',
        h: 'Impacto noutros módulos',
        html: '<p><strong>Pedidos de animais</strong> e <strong>alojamentos</strong> validam vigência em tempo real. A <strong>faturação</strong> pode agregar por protocolo. Erros aqui propagam-se.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
    overview:
      'Aqui chegam os pedidos de protocolo que o investigador (ou quem corresponda) envia pelo sistema: novas altas, renovações ou alterações ainda por rever antes de ficarem operativos no módulo principal de Protocolos.\n\nServe para ordenar o trabalho do comité ou da administração: ver o que está pendente, pedir esclarecimentos, anexar documentação e marcar progressos até o trâmite estar concluído. Os nomes de estado dependem da configuração da sua sede; o essencial é distinguir esta fila da manutenção quotidiana de protocolos já ativos.',
    summary:
      'Fila de tramitação de protocolo: novas altas, renovações ou alterações que o investigador envia e a administração ou comité processa no GROBO.',
    roles:
      'Pessoal administrativo e de conformidade. O investigador inicia o pedido na sua área quando ativo; aqui gere a resposta.',
    blocks: [
      {
        id: 'flujo',
        cat: 'navigation',
        icon: 'diagram-3',
        h: 'Fluxo típico',
        html: '<ol class="mb-0 small"><li>O investigador preenche o formulário de pedido e anexa documentação.</li><li>O pedido aparece aqui como pendente ou equivalente.</li><li>A administração revê completude, pode pedir correções ou avançar o estado.</li><li>Aprovado, o protocolo fica disponível em <strong>Protocolos</strong> para o dia a dia.</li></ol>',
      },
      {
        id: 'revision',
        cat: 'forms',
        icon: 'file-earmark-medical',
        h: 'O que rever em cada item',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Titular e equipa</dt><dd>Identificação do titular e co-investigadores.</dd><dt><i class="bi bi-heart-pulse text-success" aria-hidden="true"></i> Âmbito científico</dt><dd>Espécies, procedimentos e datas alinhadas ao documento oficial.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Anexos</dt><dd>PDF do comité, anexos obrigatórios e formatos permitidos.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Dados institucionais</dt><dd>Departamento, centro de custos ou campos locais conforme política.</dd></dl>',
      },
      {
        id: 'estados',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Estados e comunicação',
        html: '<p>Os nomes exatos de <strong>estado</strong> variam por configuração. Documente internamente o que significa «pronto para biotério» vs «só trâmite ético».</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Comentários ao investigador</dt><dd>Linguagem clara; costumam ser visíveis no acompanhamento dele.</dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> E-mail</dt><dd>Se há notificação automática, confirme o e-mail no perfil.</dd><dt><i class="bi bi-window-stack text-success" aria-hidden="true"></i> Subsanção</dt><dd>Devolver com motivo concreto evita idas e voltas.</dd></dl>',
      },
    ],
  },
  admin__animales: {
    overview:
      'Nesta fila o biotério ou operações segue cada pedido de animais vivos: desde o envio pelo investigador até à entrega ou encerramento, com estados intermédios e notas visíveis conforme a configuração.\n\nÉ o sítio para filtrar por protocolo, data ou estado, registar observações e alinhar o laboratório com aquilo que o utilizador pediu. O detalhe em ecrã pode variar, mas a ideia é sempre a mesma: uma linha por pedido e ações claras ao abri-lo.',
    summary:
      'Administração de pedidos de animais vivos: receção, preparação, estados de entrega e comunicação com o investigador.',
    roles:
      'Biotério / compras / logística animal conforme organograma.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'rabbit',
        h: 'Função da fila de animais',
        html: '<p>Gere o <strong>ciclo operativo</strong> de cada pedido de animais vivos até entrega ou cancelamento. É o lado admin do que o investigador vê em <strong>Os meus formulários</strong>.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega pedidos em curso.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar</dt><dd>Lista filtrada para logística ou compras.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtros avançados</dt><dd>Algumas sedes usam painel lateral ou modal.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros típicos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> N.º de pedido</dt><dd>Localize caso citado pelo investigador.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolo</dt><dd>Só pedidos desse código.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Requerente</dt><dd>Por utilizador ou IP.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Estado</dt><dd>Pendente, em preparação, pronto para levantamento, entregue, cancelado…</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Data necessária</dt><dd>Priorize prazos de experiência.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Grelha de pedidos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-gender-ambiguous text-success" aria-hidden="true"></i> Sexo e linhagem</dt><dd>Deve coincidir com autorização do protocolo.</dd><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Quantidade</dt><dd>Cruze com quotas e capacidade.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> Ver detalhe</dt><dd>Abre ficha com linhas, notas e anexos.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Ações dentro do pedido',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Mudar estado</dt><dd>Lista ou botões de fluxo.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Nota ao investigador</dt><dd>Visível no detalhe dele—linguagem clara.</dd><dt><i class="bi bi-lock text-success" aria-hidden="true"></i> Nota interna</dt><dd>Só equipa admin/biotério.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Rejeitar / cancelar</dt><dd>Costuma exigir motivo e confirmação.</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Janelas de confirmação',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Marcar entregue</dt><dd>Pode confirmar quantidade levantada e responsável.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Reatribuir protocolo</dt><dd>Se permitido, siga o procedimento de auditoria.</dd></dl>',
      },
      {
        id: 'trazabilidad',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Rastreabilidade e erros',
        html: '<p>Se o pedido está no <strong>protocolo errado</strong>, não force correções sem coordenar com <strong>Protocolos</strong>—faturação e conformidade podem ser afetadas.</p>',
      },
    ],
  },
  admin__reactivos: {
    overview:
      'Algumas sedes separam pedidos de reagentes ou material biológico numa fila própria, distinta dos insumos de consumo geral. Se vê este módulo, aqui essas solicitações são revistas, atualizam-se estados e coordena-se com o investigador.\n\nA dinâmica é semelhante a outras filas: lista filtrável, detalhe ao abrir uma linha e ações segundo permissões. Se a sua instituição unificou tudo em «Insumos», este item pode não aparecer no menu.',
    summary:
      'Fila de pedidos de reagentes (distinta do fluxo genérico de insumos quando assim está configurado).',
    roles:
      'Administração de laboratório ou depósito de reagentes.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'droplet-half',
        h: 'Função da fila de reagentes',
        html: '<p>Gere pedidos de <strong>reagentes ou material biológico</strong> quando a sede os separa dos insumos gerais. É o lado admin do que o investigador acompanha em <strong>Os meus formulários</strong>. Mantenha estados atualizados e verifique <strong>unidade</strong>, <strong>quantidade</strong> e <strong>condições de armazenamento</strong> no detalhe.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega a lista e estados em curso.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar</dt><dd>Lista filtrada para depósito ou compras (se existir).</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtros avançados</dt><dd>Podem estar num painel lateral ou modal.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros típicos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> N.º de pedido / referência</dt><dd>Localize o caso citado pelo investigador.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolo</dt><dd>Só pedidos desse código.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Solicitante</dt><dd>Quem enviou o formulário.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Estado</dt><dd>Pendente, em preparação, entregue, cancelado…</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Data necessária</dt><dd>Priorize prazos de experiência declarados.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Grelha de pedidos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-box-seam text-success" aria-hidden="true"></i> Item / catálogo</dt><dd>Nome ou código do reagente no cadastro da sede.</dd><dt><i class="bi bi-sort-numeric-down text-success" aria-hidden="true"></i> Quantidade e unidade</dt><dd>Deve ser coerente com aprovação e armazém.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> Ver detalhe</dt><dd>Abre linhas, notas e anexos do formulário.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Ações no detalhe',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Mudar estado</dt><dd>Avança o fluxo segundo a taxonomia da sede.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Nota ao investigador</dt><dd>Visível no detalhe dele.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Rejeitar / cancelar</dt><dd>Costuma exigir motivo e janela de confirmação.</dd></dl>',
      },
      {
        id: 'prioridad',
        cat: 'content',
        icon: 'lightning-charge',
        h: 'Priorização e coerência',
        html: '<ul class="mb-0"><li>Marque <strong>urgências</strong> pela data de experiência declarada.</li><li>Resolva primeiro pedidos que <strong>bloqueiam</strong> outros módulos (p.ex. ensaio que precisa do reagente antes dos animais).</li><li>Se a sede unificou reagentes em <strong>Insumos</strong>, use essa fila; aqui só quando o menu mostra ambos.</li></ul>',
      },
    ],
  },
  admin__insumos: {
    overview:
      'Aqui gerem-se pedidos de insumos de laboratório ou consumíveis enviados pelos investigadores: preparação, entrega, mudanças de estado e comunicação quando é preciso clarificar algo.\n\nCada linha costuma representar um pedido; ao abrir vê o detalhe e as ações permitidas. Manter estados atualizados ajuda o investigador a ver o progresso real em «Os meus formulários».',
    summary:
      'Gestão de pedidos de insumos gerais: preparação, stock, entrega e fecho.',
    roles:
      'Depósito / compras / administração de insumos experimentais.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'box-seam',
        h: 'Função da fila de insumos',
        html: '<p>Gere pedidos de <strong>consumíveis e material de depósito</strong> enviados pelos investigadores. Cada linha costuma ser um pedido; o detalhe mostra linhas, notas e ações permitidas. Estados corretos fecham o circuito de avisos para <strong>Os meus formulários</strong>.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega pedidos e estados.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar</dt><dd>Útil para depósito ou compras quando existir.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtros</dt><dd>Campos superiores ou painel conforme o desenho da sede.</dd></dl>',
      },
      {
        id: 'operativa',
        cat: 'content',
        icon: 'clipboard-check',
        h: 'Operação diária',
        html: '<ul class="mb-0"><li>Confirme <strong>disponibilidade</strong> ou prazo de compra antes de prometer datas.</li><li>Se o item é <strong>substituível</strong>, registe o critério em notas visíveis à equipa.</li><li>Na <strong>entrega</strong>, atualize o estado para fechar notificações.</li></ul>',
      },
      {
        id: 'lista_detalle',
        cat: 'table',
        icon: 'table',
        h: 'Lista face ao detalhe do pedido',
        html: '<p>A <strong>lista</strong> resume cada pedido; ao abrir uma linha acede ao <strong>detalhe</strong> com linhas, notas e histórico se existir.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisa e filtros</dt><dd>Reduza o volume por datas, estado ou solicitante.</dd><dt><i class="bi bi-check2-square text-success" aria-hidden="true"></i> Entrega total</dt><dd>Antes de marcar, confirme no detalhe que as quantidades coincidem com a retirada física.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Ações habituais no pedido',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Mudar estado</dt><dd>Preparação, pronto, entregue, etc., conforme a sede.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Notas</dt><dd>Comunicação com o investigador ou nota interna se existir.</dd><dt><i class="bi bi-window-stack text-success" aria-hidden="true"></i> Confirmações</dt><dd>Alterações de quantidade ou fecho costumam pedir janela emergente.</dd></dl>',
      },
      {
        id: 'config',
        cat: 'links',
        icon: 'gear',
        h: 'Ligação à configuração',
        html: '<p>Catálogos e listas permitidas costumam estar em <strong>Configuração → Insumos experimentais</strong>. Se um pedido falha por item não catalogado, corrija primeiro o <strong>cadastro mestre</strong>.</p>',
      },
    ],
  },
  admin__reservas: {
    overview:
      'Este módulo serve para administrar reservas de salas, equipamentos ou franjas horárias partilhadas. Aqui podem rever-se pedidos, detetar sobreposições e, segundo a sede, aprovar ou ajustar turnos.\n\nA vista pode incluir calendário e listagens; o importante é perceber que cada reserva segue regras internas (cancelamento, duração máxima, quem pode reservar). Se algo não bate certo, costuma ser política da instituição mais do que uma falha pontual do programa.',
    summary:
      'Calendário e administração de reservas de salas, equipamentos ou franjas partilhadas.',
    roles:
      'Administração de infraestrutura ou quem centraliza a agenda do biotério.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'calendar-week',
        h: 'Função do módulo de reservas',
        html: '<p>Administra <strong>reservas de salas, equipamentos ou franjas</strong> partilhadas. A vista pode incluir calendário e listagens; cada reserva segue <strong>regras internas</strong> (cancelamento, duração máxima, quem pode reservar).</p>',
      },
      {
        id: 'vista',
        cat: 'filters',
        icon: 'calendar3',
        h: 'Vistas, datas e conflitos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Intervalo de datas</dt><dd>Limite o período antes de rever sobreposições.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Sobreposições</dt><dd>Revise conflitos de horário antes de aprovar.</dd><dt><i class="bi bi-shield-check text-success" aria-hidden="true"></i> Aprovação</dt><dd>Algumas sedes exigem confirmação explícita da administração.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Lista e calendário',
        html: '<p>A <strong>grelha ou calendário</strong> resume reservas com requerente, recurso e estado. Um clique num evento ou linha abre o <strong>detalhe</strong> para ajustar ou anular conforme permissões.</p>',
      },
      {
        id: 'acciones',
        cat: 'row',
        icon: 'pencil-square',
        h: 'Criar, mover ou cancelar',
        html: '<ul class="mb-0"><li><strong>Documente</strong> o motivo de alterações impostas pela administração.</li><li><strong>Comunique</strong> ao investigador se a reserva for alterada no back-office.</li><li>As <strong>janelas de confirmação</strong> ao cancelar costumam ser definitivas—leia antes de aceitar.</li></ul>',
      },
    ],
  },
  admin__alojamientos: {
    overview:
      'Os alojamentos registam onde e durante quanto tempo os animais permanecem no biotério, ligados a protocolos e, muitas vezes, à faturação. Este ecrã permite rever lotes, localizações, estados e encerramentos de estadia.\n\nAções como finalizar ou reabrir um período podem afetar custos: alinhe com a área contabilística ou regras internas antes de confirmar. O detalhe de colunas e botões depende da configuração da sede.',
    summary:
      'Gestão de estadias de animais: caixas, localização, responsáveis e fecho de períodos faturáveis.',
    roles:
      'Pessoal de alojamento com permissões.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'house-heart',
        h: 'Função da grelha de alojamentos',
        html: '<p>Gere <strong>estadias de animais</strong> no biotério: localização, lotes, responsáveis e fecho de períodos. Cada registo liga <strong>protocolo</strong>, espécie, quantidade e datas. Use filtros para alinhar com <strong>inventário físico</strong>.</p>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros habituais',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolo</dt><dd>Restrinja por estudo autorizado.</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Datas</dt><dd>Período ativo ou histórico conforme necessidade.</dd><dt><i class="bi bi-geo-alt text-success" aria-hidden="true"></i> Localização / caixa</dt><dd>Se a sede usa códigos ou salas, filtre para auditoria.</dd></dl>',
      },
      {
        id: 'grilla',
        cat: 'table',
        icon: 'table',
        h: 'Grelha e detalhe',
        html: '<p>A tabela lista alojamentos; ao abrir uma linha vê <strong>detalhe</strong>, observações do biotério e ações permitidas. Em ecrãs estreitos pode ser preciso scroll horizontal.</p>',
      },
      {
        id: 'finalizar',
        cat: 'modals',
        icon: 'cash-coin',
        h: 'Finalizar, reabrir e faturação',
        html: '<p><strong>Finalizar</strong> ou <strong>reabrir</strong> afeta como os consumos entram na <strong>faturação</strong>. Alinhe com a contabilidade antes de desfazer períodos fechados.</p><ul class="mb-0"><li>O histórico pode mostrar mensagens do responsável de alojamento.</li><li><strong>QR</strong> ou fichas podem mostrar dados só de leitura.</li></ul>',
      },
    ],
  },
  admin__estadisticas: {
    overview:
      'As estatísticas concentram gráficos e totais sobre a utilização do biotério ou do sistema—pedidos, ocupação, tendências, etc.—conforme o contratado e configurado.\n\nServe para relatórios de gestão e para detetar picos de procura; não substitui o detalhe operativo de cada fila. Se um indicador chamar a atenção, abra o módulo correspondente para ver casos concretos.',
    summary:
      'Relatórios e gráficos agregados (conforme módulos ativos).',
    roles:
      'Direção do biotério, qualidade ou administração que precise indicadores.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'bar-chart-line',
        h: 'O que é o módulo de estatísticas',
        html: '<p>Concentra <strong>gráficos e totais</strong> sobre utilização do biotério ou do sistema conforme contratação. Serve para <strong>relatórios de gestão</strong> e picos de procura; não substitui o detalhe de cada fila operativa.</p>',
      },
      {
        id: 'interpretacion',
        cat: 'dashboard',
        icon: 'graph-up-arrow',
        h: 'Como interpretar os dados',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Intervalo de datas</dt><dd>Largo para tendências; curto para operação do dia.</dd><dt><i class="bi bi-database-check text-success" aria-hidden="true"></i> Qualidade dos dados</dt><dd>Totais dependem de fecho atempado de pedidos e alojamentos.</dd><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Aprofundar</dt><dd>Se um indicador chamar a atenção, abra o módulo origem para casos concretos.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'download',
        h: 'Exportar e partilhar',
        html: '<p>Ao exportar (<strong>PDF</strong>, <strong>Excel</strong>, etc.), <strong>anonimize</strong> para audiências externas e respeite a confidencialidade. Os botões costumam aplicar ao <strong>conjunto já filtrado</strong> no ecrã.</p>',
      },
    ],
  },
  admin__configuracion__config: {
    overview:
      'Configuração é onde a sede define «como funciona o GROBO» para os utilizadores: dados da instituição, listas mestras (espécies, tipos de pedido), regras de reservas, permissões por perfil, parâmetros de insumos e alojamentos, e muito mais segundo a contratação.\n\nNão é uma única página longa: costuma organizar-se em submenus à esquerda. As alterações aqui podem afetar todos os utilizadores, por isso costuma estar restrita a administradores. Antes de mudanças grandes, documente o critério e avise a equipa se for necessário.',
    summary:
      'Centro de parâmetros da sede—não é uma página única: subsecções (instituição, espécies, reservas, perfis, protocolos, insumos, alojamentos, etc.).',
    roles:
      'Apenas pessoal de configuração autorizado; alterações em dados mestres são de alto impacto.',
    blocks: [
      {
        id: 'intro',
        cat: 'hub',
        icon: 'gear-wide-connected',
        h: 'Hub vs subpáginas',
        html: '<p>Este ecrã é o <strong>centro de acessos</strong>: vê uma grelha de cartões; cada um abre outro URL com o formulário ou tabela específica.</p><p>Não confunda a <strong>lista de cartões</strong> (esta página) com o <strong>detalhe editável</strong> de cada módulo: aí estão campos, validações, tabelas e por vezes confirmações em janela.</p>',
      },
      {
        id: 'mapa',
        cat: 'hub',
        icon: 'diagram-3',
        h: 'Mapa de subsecções',
        html: '<ul class="mb-0"><li><strong>Instituição / departamentos:</strong> identidade e estrutura.</li><li><strong>Espécies e categorias:</strong> base para pedidos e alojamentos.</li><li><strong>Reservas e espaços:</strong> salas, equipamentos, regras.</li><li><strong>Tipos de formulário / insumos:</strong> o que cada perfil pode pedir.</li><li><strong>Protocolos:</strong> modelos, estados ou validações locais.</li><li><strong>Alojamentos:</strong> localizações físicas, tarifas se aplicável.</li><li><strong>Utilizadores e perfis:</strong> por vezes ligado à gestão global.</li></ul>',
      },
      {
        id: 'riesgos',
        cat: 'forms',
        icon: 'exclamation-triangle',
        h: 'Riscos ao alterar parâmetros',
        html: '<p>Uma mudança em espécie ou tipo de formulário pode invalidar rascunhos. Planeie janelas de manutenção e avise utilizadores-chave.</p>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Janelas e gravação',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Guardar / Aceitar</dt><dd>Nas subpáginas grava as alterações no sistema; espere a mensagem de sucesso antes de fechar o separador.</dd><dt><i class="bi bi-x-circle text-success" aria-hidden="true"></i> Cancelar</dt><dd>Descarta alterações não gravadas no formulário atual.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Aviso emergente</dt><dd>Caixa pequena centrada: por vezes erro de validação, permissão negada ou conflito. Leia com atenção e corrija o que pedir antes de repetir.</dd><dt><i class="bi bi-layout-text-window-reverse text-success" aria-hidden="true"></i> Janela grande de edição</dt><dd>Em alguns ecrãs edita um registo numa janela por cima da lista; ao fechar volta à grelha.</dd></dl>',
      },
      {
        id: 'documentar',
        cat: 'content',
        icon: 'journal-text',
        h: 'Boa prática',
        html: '<p>Mantenha registo externo (wiki interna) do significado de cada estado e de quem autorizou mudanças críticas para auditorias.</p>',
      },
    ],
  },
  panel__formularios: {
    overview:
      'Daqui iniciam os trâmites de pedido que a sua sede tenha ativados—por exemplo animais, reagentes ou insumos. O ecrã costuma mostrar cartões ou blocos por instituição e tipo de formulário; o que não vê simplesmente não está contratado ou não aplica ao seu perfil.\n\nCada botão «Iniciar» ou equivalente abre o assistente correspondente. Não confunda esta página com «Os meus formulários»: ali está o histórico do que já enviou; aqui só se criam pedidos novos.',
    summary:
      'Entrada para formulários de pedido (animais, reagentes, insumos). Pode mostrar sub-rotas ou cartões conforme o contrato.',
    roles:
      'Investigadores e utilizadores autorizados a gerar pedidos.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'ui-checks-grid',
        h: 'O que é o Centro de pedidos',
        html: '<p>Ecrã para <strong>escolher o tipo de pedido</strong>. Consoante os módulos verá cartões ou ligações: animais vivos, reagentes, insumos, etc.</p>',
      },
      {
        id: 'eleccion',
        cat: 'content',
        icon: 'grid-3x3-gap',
        h: 'Cartões ou botões de tipo de pedido',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Pedido de animais</dt><dd>Assistente: protocolo, espécie, sexo, quantidade, datas.</dd><dt><i class="bi bi-droplet-half text-success" aria-hidden="true"></i> Pedido de reagentes</dt><dd>Catálogo ou texto livre.</dd><dt><i class="bi bi-box-seam text-success" aria-hidden="true"></i> Pedido de insumos</dt><dd>Material de depósito.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Voltar ao painel</dt><dd>Sai sem criar rascunho se entrou por engano.</dd></dl>',
      },
      {
        id: 'form_pasos',
        cat: 'forms',
        icon: 'pencil-square',
        h: 'Dentro do formulário (botões habituais)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-right text-success" aria-hidden="true"></i> Seguinte / Continuar</dt><dd>Avança passos do assistente.</dd><dt><i class="bi bi-chevron-left text-success" aria-hidden="true"></i> Anterior</dt><dd>Volta sem perder dados validados.</dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Guardar rascunho</dt><dd>Guarda trabalho incompleto; retome em <strong>Os meus formulários</strong>.</dd><dt><i class="bi bi-send text-success" aria-hidden="true"></i> Enviar pedido</dt><dd>Valida campos obrigatórios; sucesso costuma mostrar código interno.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Anexar ficheiro</dt><dd>Carrega formatos permitidos dentro do limite de tamanho.</dd><dt><i class="bi bi-trash text-success" aria-hidden="true"></i> Remover anexo / linha</dt><dd>Elimina antes de enviar.</dd></dl>',
      },
      {
        id: 'antes',
        cat: 'forms',
        icon: 'clipboard-check',
        h: 'Antes de premir Enviar',
        html: '<ul class="mb-0"><li>Protocolo <strong>válido</strong> selecionado.</li><li>Quantidades dentro dos <strong>limites</strong> autorizados.</li><li>Campos obrigatórios (*) completos.</li></ul>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Mensagens e confirmações',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-circle text-success" aria-hidden="true"></i> Validação</dt><dd>Lista campos em falta ou formatos incorretos.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Sucesso</dt><dd>Confirma receção do pedido.</dd></dl>',
      },
      {
        id: 'despues',
        cat: 'links',
        icon: 'card-list',
        h: 'Depois do envio',
        html: '<p>Abra <strong>Os meus formulários</strong> para ver o novo item e comentários da administração.</p>',
      },
    ],
  },
  panel__misformularios: {
    overview:
      '«Os meus formulários» é o arquivo vivo de tudo o que enviou: pedidos de vários tipos numa só lista, com estado atual e acesso ao detalhe. Serve para saber se o biotério já processou algo, se pedem um esclarecimento ou falta um anexo.\n\nUse filtros e pesquisa quando a lista crescer. Abrir uma linha mostra o fio desse pedido; dali costuma ver notas da administração ou documentos associados.',
    summary:
      'Histórico unificado de todos os seus pedidos com estado e detalhe.',
    roles:
      'Qualquer utilizador que tenha enviado formulários.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'card-list',
        h: 'O que são Os meus formulários',
        html: '<p class="mb-0">Lista <strong>todos os seus pedidos</strong> num só sítio. Cada linha é um envio; o estado é atualizado pelo biotério ou laboratório.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Lista unificada</dt><dd>Um só lugar para acompanhar qualquer tipo de pedido enviado pelo sistema.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Cada linha</dt><dd>Corresponde a um envio; abra o detalhe para ver linhas, notas do biotério e anexos.</dd><dt><i class="bi bi-toggle-on text-success" aria-hidden="true"></i> Estado</dt><dd>Atualizado pelo biotério ou laboratório; se mudar, veja o detalhe antes de contactar de novo.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Atualizar</dt><dd>Recarrega a lista.</dd><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Novo pedido</dt><dd>Atalho ao Centro de pedidos se existir.</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Exportar</dt><dd>Excel/PDF da vista atual quando permitido.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros e pesquisa',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisa</dt><dd>Texto livre em código, protocolo, notas.</dd><dt><i class="bi bi-tag text-success" aria-hidden="true"></i> Tipo de formulário</dt><dd>Só animais, só reagentes ou só insumos.</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Intervalo de datas</dt><dd>Por envio ou última atualização.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Estado</dt><dd>Pendente, em curso, entregue, devolvido, cancelado…</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Colunas típicas',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> ID / código</dt><dd>Cite nas mensagens ao biotério.</dd><dt><i class="bi bi-info-circle text-success" aria-hidden="true"></i> Estado</dt><dd>Fonte operacional de verdade.</dd><dt><i class="bi bi-clock-history text-success" aria-hidden="true"></i> Data</dt><dd>Última alteração ou envio.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> Ver / Detalhe</dt><dd>Abre o pedido completo.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Ao abrir um pedido',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Linhas do pedido</dt><dd>Quantidades e itens que introduziu.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Notas da administração</dt><dd>Instruções ou pedido de correção.</dd><dt><i class="bi bi-file-earmark-arrow-down text-success" aria-hidden="true"></i> Descarregar anexo</dt><dd>Obtém PDFs ou ficheiros do fluxo.</dd><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Corrigir / reenviar</dt><dd>Quando o estado permitir (rótulo variável).</dd></dl>',
      },
      {
        id: 'alerta',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Se um pedido fica pendente muito tempo',
        html: '<p>Contacte por <strong>Mensagens</strong> citando o <strong>código do pedido</strong>. Não assuma falha do sistema sem verificar esta lista.</p>',
      },
    ],
  },
  panel__misalojamientos: {
    overview:
      'Se o seu trabalho com animais inclui estadias no biotério, aqui vê os alojamentos ligados aos seus protocolos: datas, estado e a informação que a sede decide mostrar ao investigador.\n\nPermite acompanhar sem ligar ao laboratório para cada consulta básica. O nível de detalhe (custos, localização exata, etc.) depende da configuração institucional.',
    summary:
      'Alojamentos em que participa como investigador: datas, protocolo e estado.',
    roles:
      'Investigadores com animais alojados ou ligados aos seus protocolos.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'house-heart',
        h: 'Para que serve esta lista',
        html: '<p>Consulte as <strong>suas estadias</strong> ligadas a protocolos: planifique experiências e renovações sem depender só do telefone. Custos ou detalhe de caixa dependem do que a sede mostra ao investigador.</p>',
      },
      {
        id: 'consulta',
        cat: 'content',
        icon: 'calendar-check',
        h: 'Boas práticas de consulta',
        html: '<p>Se detetar <strong>divergências</strong> com o biotério, abra um fio em <strong>Mensagens</strong> citando o <strong>código de alojamento</strong> visível na grelha.</p>',
      },
      {
        id: 'lista_ficha',
        cat: 'table',
        icon: 'table',
        h: 'Lista e ficha do alojamento',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-list text-success" aria-hidden="true"></i> Tabela</dt><dd>Lista períodos ou caixas ligados ao utilizador ou protocolo.</dd><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Clique na linha</dt><dd>Abre detalhe: datas, espécie, localização, observações.</dd><dt><i class="bi bi-arrows-expand text-success" aria-hidden="true"></i> Scroll horizontal</dt><dd>Em ecrãs estreitos pode ser necessário.</dd></dl>',
      },
    ],
  },
  panel__misreservas: {
    overview:
      'Aqui listam-se as reservas que tem ao seu nome: salas, equipamentos ou outros recursos partilhados segundo o que a sua sede gere no GROBO. Pode rever horários, estado (confirmada, pendente, cancelada) e as regras de uso da instituição.\n\nSe precisar de alterar ou anular uma reserva, faça-o a partir deste ecrã quando existir o botão; nalguns casos o biotério tem de aprovar a alteração.',
    summary:
      'As suas reservas de salas ou equipamentos: horários, estado e política de cancelamento.',
    roles:
      'Utilizadores com permissão de reserva.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'calendar-week',
        h: 'As suas reservas num relance',
        html: '<p>Constam aqui as <strong>reservas ao seu nome</strong>: salas, equipamentos ou outros recursos conforme contrato. Veja horários e estado (confirmada, pendente, cancelada) segundo as regras da sede.</p>',
      },
      {
        id: 'gestion',
        cat: 'row',
        icon: 'sliders',
        h: 'Gestão e cancelamento',
        html: '<ul class="mb-0"><li><strong>Cancele com antecedência</strong> conforme regras da sede para libertar a franja.</li><li>Para <strong>séries recorrentes</strong>, verifique se a interface permite ou peça à administração.</li><li><strong>Alterações</strong> impostas no back-office podem notificar por mensagem ou e-mail conforme configuração.</li></ul>',
      },
    ],
  },
  panel__misprotocolos: {
    overview:
      'Esta secção concentra os protocolos em que participa: vigência, dados essenciais e, muitas vezes, a possibilidade de mudar de vista (só os seus, os da sede ou os da rede se aplicável).\n\nAntes de um pedido novo convém verificar aqui que o protocolo continua válido e autoriza o que precisa. Os trâmites de alta de protocolo novo podem estar noutro item do menu segundo a sede.',
    summary:
      'Protocolos em que é membro: vigência, dados-chave e base para novos pedidos.',
    roles:
      'Investigadores e colaboradores conforme atribuição em cada protocolo.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'file-earmark-medical',
        h: 'O que são Os meus protocolos',
        html: '<p>Lista os <strong>protocolos em que participa</strong>: vigência, dados essenciais e, muitas vezes, seletor de vista (próprios, sede ou rede). Antes de um pedido novo, confirme aqui que o protocolo continua <strong>válido</strong> e autoriza o necessário.</p>',
      },
      {
        id: 'consulta',
        cat: 'detail',
        icon: 'clipboard-check',
        h: 'O que rever sempre',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Vigência</dt><dd>Datas de início e fim da autorização.</dd><dt><i class="bi bi-heart-pulse text-success" aria-hidden="true"></i> Âmbito</dt><dd>Espécies e procedimentos permitidos.</dd><dt><i class="bi bi-people text-success" aria-hidden="true"></i> Perfis</dt><dd>Titular, co-investigador ou outros conforme atribuição.</dd></dl>',
      },
      {
        id: 'solicitud',
        cat: 'links',
        icon: 'arrow-right-circle',
        h: 'Renovações e alterações',
        html: '<p>Para <strong>alargar vigência</strong> ou alterar âmbito, o caminho costuma ser <strong>Pedido de protocolo</strong> (perfil ou ligação da sede), não um pedido de animais isolado.</p><ul class="mb-0"><li>Com o trâmite <strong>pendente</strong>, novos pedidos podem estar restritos—pergunte ao comité ou biotério.</li></ul>',
      },
      {
        id: 'vinculo',
        cat: 'comms',
        icon: 'share',
        h: 'Ligação à REDE',
        html: '<p>Em instituições <strong>multi-sede</strong>, o âmbito é definido pela administração. Faça pedidos na sede correta conforme regras internas.</p>',
      },
    ],
  },
  admin__precios: {
    overview:
      'Aqui administram-se tarifas e listas de preços que depois alimentam orçamentos ou faturação de serviços do biotério. As mudanças podem impactar relatórios e o que o investigador vê se existirem vistas de custos.\n\nCoordene com contabilidade ou direção antes de alterar estruturas de preço. A interface exata depende da versão implantada na sua sede.',
    summary:
      'Manutenção de tarifas e listas de preços usadas na faturação ou orçamentos de serviços.',
    roles:
      'Finanças ou biotério conforme delegação.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'currency-dollar',
        h: 'Função do ecrã de preços',
        html: '<p>Mantém <strong>tarifas e listas</strong> que alimentam orçamentos e faturação do biotério. As alterações repercutem-se em relatórios e em vistas de custo para investigadores, se existirem. Coordene com <strong>finanças ou direção</strong> antes de reestruturações grandes.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Controlos habituais na grelha',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Alta / duplicar lista</dt><dd>Conforme a sede: criar item ou copiar estrutura vigente.</dd><dt><i class="bi bi-pencil text-success" aria-hidden="true"></i> Edição</dt><dd>Altera valores ou vigências; costuma exigir guardar.</dd><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisa</dt><dd>Localize serviço ou código em listas longas.</dd></dl>',
      },
      {
        id: 'cambios',
        cat: 'content',
        icon: 'calendar-check',
        h: 'Alterações de preço e datas efetivas',
        html: '<p><strong>Versionamento</strong> e datas efetivas: uma data errada pode desfasar faturas já emitidas. Alinhe com <strong>Histórico contabilístico</strong> e relatórios abertos antes de descontos ou sobretaxas em massa.</p>',
      },
    ],
  },
  admin__facturacion__index: {
    overview:
      'A área de faturação agrupa relatórios e vistas para cruzar consumos do biotério com departamentos, investigadores, protocolos ou outras dimensões que a sua sede utilize.\n\nNão substitui o sistema contabilístico principal da instituição, mas concentra o necessário para conciliar encargos e serviços ligados ao GROBO. A partir deste hub escolhe o corte (cartões); na biblioteca de capacitação cada corte tem também o seu tema na lista à esquerda.',
    summary:
      'Hub de faturação: entradas para departamento, investigador, protocolo, instituição (REDE) e organização.',
    roles:
      'Pessoal com módulo de faturação ativo.',
    blocks: [
      {
        id: 'lista_manual',
        cat: 'hub',
        icon: 'book',
        h: 'Temas no manual (lista à esquerda)',
        html: '<p>Com acesso à faturação, <strong>Capacitação</strong> mostra entradas separadas para <strong>Faturação por departamento / investigador / protocolo / instituição / organização</strong> além deste <strong>Centro de faturação</strong>. Abra-as quando estiver nessa subpágina ou quiser ler só esse fluxo.</p>',
      },
      {
        id: 'subvistas',
        cat: 'hub',
        icon: 'grid-3x3-gap',
        h: 'O que faz cada cartão do hub',
        html: '<ul class="mb-0"><li><strong>Por departamento:</strong> liquidação e tabelas por unidade.</li><li><strong>Por investigador:</strong> dívidas e saldos por pessoa (titular / solicitante conforme o ecrã).</li><li><strong>Por protocolo:</strong> custos associados a cada protocolo.</li><li><strong>Por instituição:</strong> só se a sede tiver derivação na REDE; pagamentos cruzados com saldo do titular.</li><li><strong>Por organização:</strong> visão agregada por organização quando aplicável.</li></ul>',
      },
      {
        id: 'pdf',
        cat: 'toolbar',
        icon: 'file-earmark-pdf',
        h: 'PDF, Excel e ajuda no ecrã',
        html: '<p>Nas subpáginas costumam existir botões <strong>PDF</strong> e/ou <strong>Excel</strong> e <strong>Ajuda</strong> que abre um modal próprio. O detalhe das janelas de cobrança (animal, reagente, insumo, alojamento) está no tema <strong>Janelas emergentes (modais)</strong>.</p>',
      },
    ],
  },
  admin__facturacion__depto: {
    overview:
      'A faturação por departamento concentra consumos faturáveis filtrados pela unidade académica ou administrativa: animais, alojamentos, insumos e, conforme filtros, reagentes.\n\nServe para informar decanatos ou centros de custo e gerar documentos de suporte antes de lançar no sistema contabilístico externo.',
    summary:
      'Relatórios e grelha por departamento; filtros de âmbito; exportações; linhas que abrem modais de detalhe e cobro.',
    roles:
      'Quem tenha módulo de faturação.',
    blocks: [
      {
        id: 'filtros',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros e consulta',
        html: '<ul class="mb-0"><li><strong>Âmbito / departamento:</strong> escolha departamento (e tipos de consumo) antes de carregar; o sistema avisa se faltar algo obrigatório.</li><li>Ative pelo menos um eixo (animais, alojamento ou insumos) em cada corrida.</li></ul>',
      },
      {
        id: 'tabla_modal',
        cat: 'table',
        icon: 'table',
        h: 'Tabela e linhas clicáveis',
        html: '<p>Após a consulta, cada linha é um item faturável. Ao clicar (evitando inputs) abre o <strong>modal</strong> correspondente—animal, reagente, insumo ou alojamento—com valores e ações de pagamento.</p>',
      },
      {
        id: 'export',
        cat: 'toolbar',
        icon: 'download',
        h: 'PDF global e Excel',
        html: '<p>Os botões superiores exportam o relatório <strong>já carregado</strong>. Sem consulta prévia, o sistema avisa. PDF para arquivo, Excel para folha de cálculo.</p>',
      },
    ],
  },
  admin__facturacion__investigador: {
    overview:
      'A vista por investigador organiza dívidas e consumos em torno da pessoa: útil para carregar saldos, cobrar projetos ou repartir custos por fundos ligados a esse investigador.\n\nO titular do protocolo costuma ser o «pagador» contabilístico no modal, ainda que outro utilizador tenha feito o pedido.',
    summary:
      'Escolher investigador, carregar posições, mesmos modais de linha e controlos de cobro que noutros cortes.',
    roles:
      'Faturação ou administração com módulo ativo.',
    blocks: [
      {
        id: 'seleccion',
        cat: 'filters',
        icon: 'person-lines-fill',
        h: 'Seleção e carga',
        html: '<p>Escolha um <strong>investigador</strong> na lista antes de executar a consulta. Sem isso não há dados.</p>',
      },
      {
        id: 'cobros',
        cat: 'table',
        icon: 'credit-card',
        h: 'Cobros a partir da grelha',
        html: '<p>Como em departamento, as linhas abrem modais com <strong>custo total</strong>, <strong>pago</strong>, <strong>saldo do titular</strong> e botões <strong>PAGAR</strong> / <strong>RETIRAR</strong>. O tema <strong>Janelas emergentes</strong> descreve cada campo.</p>',
      },
    ],
  },
  admin__facturacion__protocolo: {
    overview:
      'A faturação por protocolo alinha gastos com cada projeto aprovado: útil para relatórios a comités, subsídios ou auditorias onde o protocolo é o eixo contabilístico.\n\nOs modais de linha são os mesmos tipos (animal, reagente, insumo, alojamento); mudam o filtro e o layout.',
    summary:
      'Escolher protocolo, gerar informe, abrir modais por item e exportar.',
    roles:
      'Faturação / administração com módulo ativo.',
    blocks: [
      {
        id: 'protocolo',
        cat: 'filters',
        icon: 'file-earmark-medical',
        h: 'Consulta por protocolo',
        html: '<p>Selecione um <strong>protocolo</strong> e execute a pesquisa. Sem protocolo não há dados.</p>',
      },
      {
        id: 'coherencia',
        cat: 'content',
        icon: 'link-45deg',
        h: 'Coerência entre vistas',
        html: '<p>O mesmo pedido pode aparecer em departamento, investigador ou protocolo; os valores devem coincidir. Se não coincidirem, verifique filtros de data e âmbito antes de reportar erro.</p>',
      },
    ],
  },
  admin__facturacion__institucion: {
    overview:
      'A faturação por instituição surge quando a sede participa numa REDE com instituições destino: consolida ou paga linhas com derivação entre sedes.\n\nInclui lógica de saldo do titular e seleção de itens em massa com confirmação quando a interface o permitir.',
    summary:
      'Relatório institucional REDE, saldos, modais por tipo e pagamentos com confirmação.',
    roles:
      'Só perfis de faturação; o cartão do hub pode ocultar-se se não houver rede configurada.',
    blocks: [
      {
        id: 'red',
        cat: 'navigation',
        icon: 'share',
        h: 'Visibilidade e REDE',
        html: '<p>Se não vir a opção no hub, a sua instituição não tem derivação configurada para outras sedes—não é necessariamente um erro de permissões.</p>',
      },
      {
        id: 'pago',
        cat: 'modals',
        icon: 'cash-coin',
        h: 'Pagamentos e investigador',
        html: '<p>Algumas ações em massa exigem <strong>investigador</strong> associado a cada item. Se o sistema avisar, recarregue o relatório. Os modais individuais seguem o mesmo esquema cabeçalho / corpo / rodapé do tema de janelas emergentes.</p>',
      },
    ],
  },
  admin__facturacion__org: {
    overview:
      'A vista por organização agrega consumos segundo a organização vinculada (empresa, fundação, unidade externa, etc., conforme dados mestres).\n\nÚtil para faturação B2B ou relatórios executivos onde o cliente é uma organização e não um departamento interno.',
    summary:
      'Filtros de consumo, grelha agregada, mesmas exportações e modais de linha.',
    roles:
      'Faturação ativa.',
    blocks: [
      {
        id: 'filtros_org',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros',
        html: '<p>Mantenha pelo menos um tipo de consumo ativo (animais, alojamento, insumos) como em departamento; o sistema valida antes de consultar.</p>',
      },
      {
        id: 'uso',
        cat: 'toolbar',
        icon: 'file-earmark-spreadsheet',
        h: 'Uso típico',
        html: '<p>Gere o informe, reveja totais por organização e use PDF/Excel conforme procedimento interno para finanças ou cliente externo.</p>',
      },
    ],
  },
  admin__historialcontable: {
    overview:
      'O histórico contabilístico documenta movimentos e ajustes relacionados com a faturação do biotério no GROBO: útil para auditoria e para perceber correções ao longo do tempo.\n\nQuem pode vê-lo e com que detalhe depende do perfil. Se precisar de um extracto oficial, combine esta consulta com os procedimentos da área financeira.',
    summary:
      'Registo de movimentos e correções contabilísticas ligadas ao biotério.',
    roles:
      'Finanças ou administração com auditoria.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'journal-text',
        h: 'O que é o histórico contabilístico',
        html: '<p>Documenta <strong>movimentos e ajustes</strong> ligados à faturação do biotério no GROBO: útil para auditoria e correções ao longo do tempo. O detalhe visível depende do <strong>perfil</strong>.</p>',
      },
      {
        id: 'auditoria',
        cat: 'filters',
        icon: 'search',
        h: 'Uso para auditoria',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Data</dt><dd>Limite o período a rever.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Utilizador</dt><dd>Filtre quem registou o movimento quando existir.</dd><dt><i class="bi bi-tag text-success" aria-hidden="true"></i> Tipo</dt><dd>Classificação conforme a sede.</dd></dl><p class="small text-muted mt-2 mb-0">Não apague evidências fora de procedimentos aprovados; prefira <strong>estornos</strong> se o sistema permitir.</p>',
      },
    ],
  },
  panel__mensajes: {
    overview:
      'Mensagens é a caixa para conversar com outras pessoas dentro do GROBO: cada fio agrupa um assunto e as respostas, de forma semelhante a um correio interno.\n\nUse-a para coordenar detalhes de pedidos, clarificar documentação ou qualquer comunicação directa que não seja um aviso institucional massivo. Se o perfil for muito restrito, pode só escrever a certos destinatários—define a administração.',
    summary:
      'Mensagens pessoais entre utilizadores da plataforma (1:1 ou por fio).',
    roles:
      'Todos os perfis com módulo de mensagens ativo.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'chat-dots',
        h: 'Mensagens pessoais',
        html: '<p>Caixa para conversas <strong>1:1</strong> ou outros fios directos no GROBO. Use para coordenar pedidos ou documentação; não substitui a <strong>mensagem institucional</strong> em massa.</p>',
      },
      {
        id: 'hilo',
        cat: 'comms',
        icon: 'envelope-open',
        h: 'Criar e seguir fios',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-person-plus text-success" aria-hidden="true"></i> Destinatário</dt><dd>Escolha utilizador ou balcão permitido pela sede.</dd><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Assunto</dt><dd>Claro e referenciado (ex. «Pedido A-1234 — entrega»).</dd><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Respostas</dt><dd>Um fio por assunto para manter contexto.</dd><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> E-mail</dt><dd>Veja em <strong>O meu perfil</strong> se recebe alertas.</dd></dl>',
      },
    ],
  },
  panel__mensajes_institucion: {
    overview:
      'A mensagem institucional é o canal oficial da sede: comunicados que muitas pessoas podem ver, consultas ao «balcão» da instituição ou mensagens de gestão que não são conversas privadas entre dois utilizadores.\n\nSegundo o perfil verá opções diferentes (por exemplo criar um comunicado ou só fazer uma consulta). As conversas um a um com pessoas concretas continuam em «Mensagens».',
    summary:
      'Canal institucional para comunicação formal entre sedes ou broadcast interno, distinto do chat pessoal.',
    roles:
      'Quem tem o módulo; muitas vezes administradores enviam e todos leem.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'megaphone',
        h: 'Canal institucional',
        html: '<p>Comunicação <strong>oficial</strong> da sede: avisos que muitas pessoas podem ler, consultas ao balcão institucional ou gestão que não é conversa privada. Conversas entre duas pessoas ficam em <strong>Mensagens</strong>.</p>',
      },
      {
        id: 'red',
        cat: 'comms',
        icon: 'share',
        h: 'Mensagens e REDE',
        html: '<p>Em <strong>redes multi-sede</strong>, use para anúncios ou comunicação oficial. Textos curtos com ligações a <strong>notícias</strong> ou repositório.</p>',
      },
    ],
  },
  admin__comunicacion__noticias: {
    overview:
      'Desde a administração de notícias redigem-se e publicam-se os avisos que depois leem investigadores e pessoal no portal: encerramentos, convocatórias, lembretes, etc.\n\nPode definir-se alcance (só sede ou outras sedes da mesma rede), datas de publicação e rascunhos. Não substitui a mensagem interna: é conteúdo pensado para leitura ampla.',
    summary:
      'Publicação e manutenção de notícias do portal (avisos, encerramentos, convocatórias).',
    roles:
      'Comunicação institucional ou administração.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'newspaper',
        h: 'Redação de notícias (admin)',
        html: '<p>Aqui se criam e publicam itens do <strong>portal de notícias</strong>. Pode definir alcance (sede ou rede), datas e rascunhos. Não substitui mensagens 1:1.</p>',
      },
      {
        id: 'publicar',
        cat: 'forms',
        icon: 'check2-circle',
        h: 'Publicar com critério',
        html: '<ul class="mb-0"><li><strong>Datas de vigência</strong> claras para não confundir com avisos antigos.</li><li><strong>Tom institucional</strong> e contacto para dúvidas.</li><li>Revise <strong>ortografia</strong> e ligações antes de publicar.</li><li><strong>Modais</strong> de edição seguem o padrão cabeçalho/corpo/rodapé do tema de janelas emergentes.</li></ul>',
      },
    ],
  },
  panel__noticias: {
    overview:
      'O portal de notícias é o quadro institucional: avisos oficiais, novidades da sede e, se aplicável, notícias partilhadas com outras sedes da mesma rede.\n\nPode filtrar por alcance, pesquisar por texto e abrir cada cartão para ler o texto completo. Para incidências técnicas ou problemas com o sistema use «Ajuda → Bilhete», não este quadro.',
    summary:
      'Leitura do mural de notícias para investigadores e pessoal.',
    roles:
      'Qualquer utilizador com acesso ao portal de notícias.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'newspaper',
        h: 'Portal de notícias (leitura)',
        html: '<p>Mural <strong>oficial</strong>: avisos, novidades e, se aplicável, notícias partilhadas entre sedes. Para falhas da aplicação use <strong>Ajuda → Bilhete</strong> se o seu perfil tiver, não este quadro.</p>',
      },
      {
        id: 'lectura',
        cat: 'filters',
        icon: 'funnel',
        h: 'Como usar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Pesquisar</dt><dd>Filtre por texto quando existir o campo.</dd><dt><i class="bi bi-geo-alt text-success" aria-hidden="true"></i> Alcance</dt><dd>Algumas sedes permitem só local ou também rede.</dd><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Abrir notícia</dt><dd>Mostra o texto completo e anexos se houver.</dd></dl><p class="small text-muted mt-2 mb-0">Consulte periodicamente; alguns avisos só aparecem aqui. O e-mail pode não duplicar automaticamente.</p>',
      },
    ],
  },
  panel__perfil: {
    overview:
      'O meu perfil é onde atualiza os dados pessoais (nome, e-mail, telefone) e a palavra-passe. O e-mail é especialmente importante: aí costumam chegar notificações e a recuperação de acesso.\n\nNa mesma área da aplicação podem aparecer preferências de interface (tamanho de letra, tema claro ou escuro, idioma, acessibilidade) conforme a sua versão do GROBO inclua. Os apartados detalhados abaixo percorrem botão a botão o que pode ver em ecrã; nem todos os utilizadores têm as mesmas funções ativas.',
    summary:
      'Guia extensa: o que é o ecrã O meu perfil face à barra de preferências; cada botão (voz, letra, tema claro/escuro, idioma, atalhos, menu superior/lateral) explicado à parte; como os dados se guardam no servidor; e Gecko Search (pílula, teclado, pesquisa, IA e comandos de voz).',
    roles:
      'Todos os utilizadores autenticados.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'person-badge',
        h: 'O que é o perfil e o que são preferências globais',
        html: '<p class="mb-2"><strong>O meu perfil</strong> (esta rota do menu) é onde cuida da informação que o identifica: e-mail, telefone, dados de contacto, e muitas vezes a <strong>palavra-passe</strong> e uma <strong>foto</strong>. Serve para o sistema saber a quem notificar, como recuperar o acesso se esquecer a palavra-passe, e para que outros módulos (por exemplo Vendas ou Suporte) usem um e-mail válido.</p><p class="mb-2">As <strong>preferências de interface</strong> são outra coisa: são escolhas sobre <em>como o programa se vê e comporta</em> para si—idioma, cores (claro ou escuro), tamanho de letra, se o menu fica em cima ou ao lado, e se quer usar o assistente por voz. A maior parte desses controlos <strong>não está só</strong> no meu perfil: está na <strong>barra de ícones redondos</strong> junto ao menu principal, para os mudar em qualquer ecrã sem ir ao perfil.</p><p class="mb-2"><strong>Porque a página às vezes recarrega sozinha:</strong> ao mudar o <strong>idioma</strong> ou o <strong>desenho do menu</strong> (superior ↔ lateral), a aplicação costuma <strong>recarregar por completo</strong>. Não é uma falha: é preciso para todos os textos, o menu e as cores ficarem coerentes com a nova escolha.</p><p class="mb-0 small text-muted">Quando a sessão e a instituição o permitem, essas preferências também se guardam na sua <strong>conta no servidor</strong> e recuperam-se ao iniciar sessão (tema, idioma, tamanho de letra, menu preferido, microfone). Se algo não «lembra» a sua escolha, confirme que iniciou sessão com normalidade e que o utilizador tem instituição atribuída.</p>',
      },
      {
        id: 'barra_contexto',
        cat: 'toolbar',
        icon: 'layout-sidebar',
        h: 'Onde fica a barra e a ordem habitual dos botões',
        html: '<p class="mb-2">A <strong>barra de preferências</strong> é uma faixa de controlos que vai <strong>junto ao menu principal</strong>. Reconhecê-la-á como uma <strong>linha de ícones circulares</strong> (microfone, letra, sol/lua, bandeira, teclado, desenho) separada dos restantes links do menu por um <strong>limite ou espaço</strong> discreto.</p><p class="mb-2"><strong>Menu superior (horizontal):</strong> os ícones costumam alinhar-se à <strong>direita</strong> da barra superior, depois dos acessos aos módulos (Painel, Protocolos, etc.). O <strong>buscador Gecko</strong> (a pílula alongada com lupa) costuma ficar na zona central ou perto; os botões redondos agrupam-se no fim dessa barra.</p><p class="mb-2"><strong>Menu lateral (vertical):</strong> os mesmos controlos redistribuem-se—muitas vezes em <strong>linha ou bloco</strong> dentro do painel lateral, com botões um pouco <strong>maiores</strong> para tocar com comodidade. A <strong>bandeira de idioma</strong> abre para cima ou para o lado conforme o espaço.</p><p class="mb-2"><strong>Ordem habitual da esquerda para a direita</strong> no grupo de ícones (pode variar ligeiramente): (1) microfone, (2) tamanho de letra, (3) tema claro/escuro, (4) idioma com bandeira, (5) ajuda de atalhos de teclado, (6) mudança de desenho do menu superior/lateral.</p><p class="mb-0 small text-muted"><strong>Ecrãs pequenos:</strong> em telemóveis muito estreitos alguns botões podem ocultar-se para ganhar espaço. Se não vir o de atalhos ou o do desenho do menu, experimente tablet ou computador; o buscador continua disponível com <kbd>Ctrl</kbd>+<kbd>G</kbd> em muitos equipamentos.</p>',
      },
      {
        id: 'ctrl_microfono',
        cat: 'toolbar',
        icon: 'mic-fill',
        h: 'Botão do microfone (Gecko Voice): o que faz e quando usar',
        html: '<p class="mb-2"><strong>O que é este botão:</strong> liga ou desliga o <strong>assistente de voz</strong> que usa o navegador. O ícone é um <strong>microfone</strong>. Não grava ficheiros para enviar por e-mail: só converte o que diz em texto dentro do próprio programa, quando o navegador o permite.</p><p class="mb-2"><strong>A primeira vez:</strong> o navegador pedirá <strong>permissão para usar o microfone</strong>. Aceite se quiser falar com o sistema. Se bloquear, a voz não funcionará até alterar a permissão do site nas definições do navegador.</p><p class="mb-2"><strong>Como saber se está a ouvir:</strong> quando está <strong>ativo</strong>, o botão costuma parecer mais <strong>verde</strong> ou realçado. Quando está <strong>desligado</strong>, fica mais neutro ou cinzento. Ligue-o só quando for usar voz.</p><p class="mb-2"><strong>Palavra de ativação e buscador:</strong> com o microfone ligado, pode dizer o nome do assistente (por exemplo «Gecko»); ao reconhecer, costuma abrir-se o <strong>quadro de pesquisa</strong> para continuar a dizer o pedido. Mais detalhe no apartado «Gecko: voz e IA».</p><p class="mb-2"><strong>Navegadores:</strong> no <strong>Firefox</strong> a voz integrada por vezes não está disponível e pode ver um aviso. Para voz costuma ir melhor <strong>Chrome ou Edge</strong>; se não, use teclado e rato.</p><p class="mb-0 small text-muted"><strong>Atalho de teclado:</strong> <kbd>Alt</kbd>+<kbd>V</kbd> equivale a premir este botão em muitos equipamentos, quando não está a escrever num campo que capture todas as teclas.</p>',
      },
      {
        id: 'ctrl_tamano_letra',
        cat: 'toolbar',
        icon: 'type',
        h: 'Botão de tamanho de letra: os três níveis e o que muda no ecrã',
        html: '<p class="mb-2"><strong>O que é:</strong> um botão que não abre menus: cada vez que o prime, a aplicação passa ao <strong>próximo tamanho de letra</strong> num ciclo de três passos. Serve para quem precisa de ler maior (acessibilidade) ou mais compacto (ver mais dados no ecrã).</p><p class="mb-2"><strong>Os três tamanhos (ordem do ciclo):</strong> <strong>pequena</strong> → <strong>média</strong> → <strong>grande</strong> → volta à pequena. O programa aplica esse tamanho a títulos, tabelas, formulários e menus de forma <strong>uniforme</strong> em toda a sessão.</p><p class="mb-2"><strong>O que notará:</strong> o texto sobe ou desce de tamanho em conjunto. <strong>Não</strong> é o mesmo que o zoom do navegador (<kbd>Ctrl</kbd> + roda do rato): aqui só muda como o GROBO mostra as letras.</p><p class="mb-2"><strong>Lembrança entre sessões:</strong> o tamanho escolhido pode guardar-se com o utilizador para que ao voltar a entrar continue igual.</p><p class="mb-0 small text-muted"><strong>Dica:</strong> se algo se vir cortado, experimente o <strong>tema claro</strong> ou alargue a janela; algumas tabelas precisam de deslocar na horizontal.</p>',
      },
      {
        id: 'ctrl_tema',
        cat: 'toolbar',
        icon: 'brightness-high',
        h: 'Botão de tema: modo claro e modo escuro',
        html: '<p class="mb-2"><strong>O que é o “tema”:</strong> é o <strong>esquema de cores</strong> de toda a aplicação. O <strong>modo claro</strong> usa fundos claros e texto escuro, parecido com um documento em papel. O <strong>modo escuro</strong> usa fundos escuros e texto claro, pensado para trabalhar com pouca luz e cansar menos a vista.</p><p class="mb-2"><strong>O que o botão faz:</strong> ao premir, o programa <strong>alterna</strong> entre claro e escuro. Botões, menus, tabelas e janelas emergentes mudam de cor de forma coerente.</p><p class="mb-2"><strong>O ícone sol / lua:</strong> indica para que modo pode passar ou qual está ativo conforme a versão; o importante é que <strong>um só botão</strong> controla a mudança, sem ter de procurar dentro do meu perfil.</p><p class="mb-2"><strong>Para quem é útil:</strong> quem trabalha muitas horas seguidas, ecrãs muito brilhantes ou quem prefere mais contraste. Pode combinar tema escuro com <strong>letra grande</strong>.</p><p class="mb-0 small text-muted">O tema pode guardar-se na conta para não ter de o escolher em cada equipamento.</p>',
      },
      {
        id: 'ctrl_idioma',
        cat: 'toolbar',
        icon: 'flag',
        h: 'Seletor de idioma (bandeira): Español, English e Português',
        html: '<p class="mb-2"><strong>O que é:</strong> um botão circular que mostra a <strong>bandeira do idioma atual</strong> (Espanha, EUA ou Brasil). Ao premir abre uma <strong>lista de três idiomas</strong> com bandeira e nome.</p><p class="mb-2"><strong>As três opções:</strong> <strong>Español</strong>, <strong>English</strong> e <strong>Português</strong> (Brasil). Mudam todos os textos de menus, botões e mensagens do sistema. O assistente de voz também se alinha com o idioma escolhido.</p><p class="mb-2"><strong>O que acontece ao escolher:</strong> o programa <strong>guarda</strong> o idioma e <strong>recarrega a página</strong>. Espere a que termine: até então pode ver mistura de textos antigos e novos.</p><p class="mb-2"><strong>Onde o menu abre:</strong> com menu em cima costuma desdobrar-se para baixo; com menu lateral por vezes para cima para não sair do ecrã.</p><p class="mb-0 small text-muted">Se partilhar equipamento, o idioma fica ligado ao utilizador e à sessão, não só ao modo privado do navegador.</p>',
      },
      {
        id: 'ctrl_atajos',
        cat: 'toolbar',
        icon: 'keyboard',
        h: 'Botão de atalhos de teclado: que lista mostra e cada atalho principal',
        html: '<p class="mb-2"><strong>O que é:</strong> um botão com ícone de <strong>teclado</strong> que abre a <strong>lista de atalhos</strong> do programa: uma “chuleta” para não memorizar combinações.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd> — Buscador Gecko:</strong> abre ou fecha o painel grande de pesquisa. Costuma funcionar mesmo com o cursor num campo de texto. Use-o para pesquisar rápido sem ir com o rato à pílula.</p><p class="mb-2"><strong><kbd>Esc</kbd> — Fechar:</strong> fecha o buscador se estiver aberto ou outras janelas à frente, conforme o caso.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>K</kbd> — Esta ajuda:</strong> equivale a premir o botão do teclado quando está visível.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>D</kbd> — Painel principal:</strong> leva ao tabuleiro de início conforme o seu papel (administração ou investigador).</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>V</kbd> — Microfone:</strong> liga ou desliga o mesmo controlo que o botão redondo do microfone.</p><p class="mb-2"><strong>Outros atalhos frequentes com <kbd>Alt</kbd> + letra:</strong> por exemplo <kbd>Alt</kbd>+<kbd>F</kbd> para <strong>formulários</strong>, <kbd>Alt</kbd>+<kbd>Q</kbd> a <strong>Os meus formulários</strong>, <kbd>Alt</kbd>+<kbd>P</kbd> a <strong>Os meus protocolos</strong>, <kbd>Alt</kbd>+<kbd>A</kbd> a <strong>Os meus alojamentos</strong>. Os administradores podem ter atalhos extra para protocolos e alojamentos de gestão. A lista no ecrã é a referência: se um texto não coincidir com o seu menu, confie no que acontece ao premir a tecla.</p><p class="mb-2"><strong><kbd>Alt</kbd>, depois <kbd>Q</kbd>, depois <kbd>S</kbd> — Terminar sessão:</strong> fecha a sessão sem passar por menus (sequência de três teclas).</p><p class="mb-0 small text-muted">Em telemóveis o botão do teclado pode não mostrar-se; os atalhos continuam ativos no computador quando o programa os tem ativos.</p>',
      },
      {
        id: 'ctrl_layout_menu',
        cat: 'toolbar',
        icon: 'layout-sidebar-reverse',
        h: 'Botão de desenho do menu: barra superior face a menu lateral',
        html: '<p class="mb-2"><strong>O que é:</strong> alterna entre duas formas de ver o menu principal. Num modo o menu é uma <strong>faixa horizontal</strong> em cima. No outro, os links estão numa <strong>coluna à esquerda</strong>.</p><p class="mb-2"><strong>O que acontece ao premir:</strong> o programa <strong>guarda a preferência</strong> e <strong>recarrega a página</strong>. Depois do recarregar verá as mesmas secções mas com o menu em cima ou ao lado. Os ícones de preferências (microfone, tema, etc.) reorganizam-se para encaixar no novo desenho.</p><p class="mb-2"><strong>Quando usar cada um:</strong> o menu superior costuma ir bem em ecrãs largos. O lateral costuma agradar em portáteis ou quando quer mais espaço central para tabelas.</p><p class="mb-0 small text-muted">Em telemóveis este botão por vezes não aparece; use um ecrã mais largo se precisar de mudar o desenho do menu.</p>',
      },
      {
        id: 'prefs_servidor',
        cat: 'toolbar',
        icon: 'cloud-arrow-down',
        h: 'Como as preferências se guardam e recuperam no servidor',
        html: '<p class="mb-2"><strong>Porque importa:</strong> se as preferências ficassem só no navegador, ao mudar de computador ou limpar dados perderia tema, idioma, tamanho de letra, etc. O GROBO tenta <strong>guardá-las na conta</strong> quando é possível.</p><p class="mb-2"><strong>Ao mudar um ajuste:</strong> o programa envia de forma segura o necessário ao servidor (tema, idioma, tamanho de letra, menu preferido, microfone…). Nem tudo se envia em cada clique: cada botão guarda o que lhe corresponde.</p><p class="mb-2"><strong>Ao iniciar sessão:</strong> se o tipo de utilizador o permitir, recuperam-se as preferências guardadas e aplicam-se antes de continuar a trabalhar.</p><p class="mb-2"><strong>Casos especiais:</strong> alguns utilizadores sem instituição atribuída podem depender mais do que fica só no navegador.</p><p class="mb-0 small text-muted">Se tiver duas abas abertas e mudar algo numa, a outra pode mostrar valores antigos até a recarregar.</p>',
      },
      {
        id: 'gecko_buscar',
        cat: 'content',
        icon: 'search',
        h: 'Gecko Search: a pílula, o painel e a pesquisa por texto',
        html: '<p class="mb-2"><strong>O que é o Gecko Search:</strong> o <strong>buscador central</strong> do GROBO: um só quadro para pesquisar no sistema e, se a sua sede tiver ativo, pedir ajuda à <strong>IA</strong> com frases completas (ver também o apartado de voz e IA).</p><p class="mb-2"><strong>A barra alongada com lupa:</strong> costuma mostrar um texto guia do tipo «Escreva um comando ou diga Gecko…». <strong>Ao clicar</strong> abre-se o painel grande. Com menu lateral a barra pode ver-se <strong>a flutuar</strong> em cima; com menu superior costuma estar <strong>fixa</strong> na faixa do menu.</p><p class="mb-2"><strong>Ao abrir o painel:</strong> o resto da página <strong>escurece</strong> e aparece um <strong>quadro central</strong> com animação. Assim concentra a atenção na pesquisa sem perder a sessão atrás.</p><p class="mb-2"><strong>Dentro do quadro:</strong> em cima está o <strong>campo onde escreve</strong> e um botão de <strong>microfone</strong> para ditar sem voltar à barra. Abaixo aparecem os <strong>resultados</strong> enquanto escreve. Se não houver coincidências, verá uma mensagem clara com ícone de lupa.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd>:</strong> abre ou fecha este painel em quase qualquer ecrã (também costuma funcionar se estiver a escrever num campo).</p><p class="mb-2"><strong><kbd>Esc</kbd>:</strong> fecha o painel e volta ao ecrã de trabalho.</p><p class="mb-2"><strong>Microfone no painel:</strong> liga ou desliga o ditado ligado ao mesmo sistema de voz que o botão redondo do menu.</p><p class="mb-2"><strong>Teclas <kbd>↓</kbd> e <kbd>↑</kbd>:</strong> com o cursor no quadro de pesquisa pode descer e subir pela lista de resultados realçados a verde.</p><p class="mb-2"><strong><kbd>Enter</kbd>:</strong> se tiver um resultado realçado, confirma como se fizesse clique. Se <strong>não</strong> há linha selecionada mas <strong>há</strong> texto escrito, costuma enviar a frase à <strong>IA</strong> (igual ao terminar de falar): verá uma mensagem do tipo «Consultando a GROBO IA…» enquanto espera.</p><p class="mb-0 small text-muted"><strong>Respostas de IA:</strong> o texto pode aparecer no próprio painel de pesquisa ou num bloco dedicado abaixo, conforme a versão.</p>',
      },
      {
        id: 'gecko_voz_ia',
        cat: 'modals',
        icon: 'robot',
        h: 'Gecko: escuta contínua, palavra de ativação, envio à IA e tipos de resposta',
        html: '<p class="mb-2"><strong>Em conjunto:</strong> primeiro o <strong>navegador</strong> converte o que diz em texto; depois o <strong>sistema</strong> interpreta esse texto e pode, conforme permissões, <strong>levá-lo a outro ecrã</strong>, <strong>mostrar resultados de pesquisa</strong>, <strong>ajudar a preencher um formulário</strong> ou <strong>responder em voz alta</strong>.</p><p class="mb-2"><strong>1. Microfone na barra:</strong> active-o até ficar claramente ligado. Costuma continuar a ouvir sem se desligar após uma só palavra curta.</p><p class="mb-2"><strong>2. Palavra de ativação:</strong> enquanto ouve, o programa procura uma forma do nome do assistente (<strong>Gecko</strong> e sons parecidos: geco, gueco, eco, jeco, etc.). Não é precisa pronúncia perfeita.</p><p class="mb-2"><strong>3. Janela de dados aberta:</strong> se tiver um formulário grande por cima do ecrã, o buscador pode <strong>não abrir sozinho</strong> para não tapar o que está a preencher; use teclado e rato com normalidade nesse caso.</p><p class="mb-2"><strong>4. O seu pedido:</strong> depois do nome do assistente, diga o que precisa. Verá o texto no <strong>quadro do buscador</strong> para confirmar que percebeu.</p><p class="mb-2"><strong>5. O que a IA pode fazer:</strong></p><ul class="small mb-3"><li><strong>Levá-lo a outra secção</strong> do portal (por exemplo utilizadores ou protocolos).</li><li><strong>Preencher a lista de resultados</strong> com o que corresponder.</li><li><strong>Ajudar na página atual</strong> escrevendo em campos ou premindo ações que o fluxo permita.</li></ul><p class="mb-2"><strong>Voz de resposta:</strong> por vezes o sistema <strong>lê em voz alta</strong> a resposta usando a voz do próprio navegador, no mesmo idioma que tiver escolhido no GROBO.</p><p class="mb-2"><strong>Se algo falhar:</strong> lerá uma mensagem de erro no ecrã; se não houver ligação, a lista de resultados pode esvaziar. Volte a tentar quando a rede estiver estável.</p><p class="mb-0 small text-muted"><strong>Privacidade:</strong> o áudio trata-o o navegador; não use o microfone onde a confidencialidade do trabalho o proíba.</p>',
      },
      {
        id: 'form_perfil',
        cat: 'forms',
        icon: 'person-lines-fill',
        h: 'Ecrã O meu perfil: cada campo e botão do formulário',
        html: '<p class="mb-3">Esta secção descreve os elementos <strong>típicos</strong> da página de perfil. A sua instituição pode ocultar campos ou acrescentar outros; use isto como mapa mental.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Identidade e dados básicos</dt><dd><p class="mb-1">Costuma incluir <strong>nome</strong> e <strong>apelidos</strong> ou um único campo de nome completo, conforme o desenho. É a etiqueta humana que os colegas veem em listas e mensagens.</p></dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Correio eletrónico</dt><dd><p class="mb-1"><strong>Para quê serve:</strong> é o endereço para onde o sistema envia <strong>notificações</strong> (bilhetes, avisos, recuperação de conta). Muitos formulários de contacto preenchem destinatário ou remetente a partir deste dado.</p><p class="mb-0"><strong>O que deve fazer:</strong> mantenha-o atualizado e acessível; se mudar de domínio institucional, atualize-o antes de pedir suporte para não perder respostas.</p></dd><dt><i class="bi bi-telephone text-success" aria-hidden="true"></i> Telefone</dt><dd><p class="mb-1"><strong>Para quê serve:</strong> contacto urgente, verificação em algumas sedes, ou campos legais de consentimento.</p><p class="mb-0"><strong>Formato:</strong> use o prefixo internacional se o formulário o pedir (p. ex. +351…) para evitar erros de validação.</p></dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Palavra-passe atual / nova / confirmação</dt><dd><p class="mb-1"><strong>Fluxo típico:</strong> pede-se a <strong>palavra-passe atual</strong> por segurança; depois a <strong>nova</strong> duas vezes para evitar erros de escrita.</p><p class="mb-0"><strong>Boas práticas:</strong> comprimento adequado, mistura de caracteres, não reutilizar a do correio pessoal. Após guardar, termine sessão em dispositivos que não controla se suspeitar de fuga de dados.</p></dd><dt><i class="bi bi-image text-success" aria-hidden="true"></i> Foto ou avatar</dt><dd><p class="mb-1"><strong>O que é:</strong> imagem circular ou quadrada que identifica a conta em cabeçalhos e listas.</p><p class="mb-0"><strong>Como usar:</strong> botão «Procurar» ou arrastar ficheiro; respeite <strong>formato</strong> (jpg, png…) e <strong>tamanho máximo</strong> indicado para não rejeitar o guardar.</p></dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Instituição ou papel (só leitura)</dt><dd><p class="mb-0">Por vezes vê o <strong>centro</strong> ou o <strong>papel</strong> sem poder editá-los: altera um administrador. Serve para confirmar que entrou na conta certa.</p></dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Botão Guardar / Atualizar perfil</dt><dd><p class="mb-1"><strong>O que faz:</strong> envia as alterações ao sistema; enquanto processa, o botão pode desativar-se ou mostrar carregamento.</p><p class="mb-0"><strong>Importante:</strong> aguarde a mensagem de sucesso ou erro antes de fechar o separador; se sair antes, pode perder edições.</p></dd></dl>',
      },
    ],
  },
  panel__soporte: {
    overview:
      'O suporte Gecko é o canal de bilhetes para a equipa que mantém o software GROBO: falhas da aplicação (ecrãs que não carregam, erros ao guardar, mensagens de erro inesperadas, comportamento claramente anómalo do programa). Não substitui o comité nem resolve dúvidas de trâmite científico na sua instituição.\n\nFunciona por turnos: escreve, o suporte responde, e assim sucessivamente; não é um chat em tempo real. Cada envio costuma gerar notificação por e-mail. Use um assunto claro e descreva o que fazia quando ocorreu o problema.',
    summary:
      'Bilhete ao suporte técnico do produto (Gecko) por falhas ou comportamento anómalo da aplicação; normalmente só perfis administrativos veem esta opção no menu.',
    roles:
      'Na configuração habitual, administração do biotério e outros perfis administrativos da sede. Investigadores e utilizadores do painel de pedidos não costumam ter Ajuda → Bilhete/Contacto: devem avisar a administração local para abrir ou escalar o bilhete se a incidência for do programa.',
    blocks: [
      {
        id: 'para_que',
        cat: 'navigation',
        icon: 'ticket-perforated',
        h: 'Para que serve o bilhete (e para que não)',
        html: '<p><strong>Use o bilhete</strong> quando algo <strong>do programa GROBO</strong> falhe ou se comporte mal: erros ao enviar formulários, ecrãs em branco, mensagens de erro do sistema, funções que deixaram de responder sem alteração de permissões na sede, etc.</p><p class="mb-0"><strong>Não use o bilhete</strong> como canal geral de consultas operacionais com o biotério (prazos de pedidos, interpretação de protocolos): use a <strong>mensageria</strong> ou o procedimento interno da instituição. <strong>Vendas GROBO</strong> é só para o comercial (orçamentos, contratação).</p>',
      },
      {
        id: 'buenas',
        cat: 'forms',
        icon: 'clipboard-check',
        h: 'Como abrir um bilhete útil',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Assunto</dt><dd>Curto, com o módulo (ex. «Reservas — erro ao guardar»).</dd><dt><i class="bi bi-body-text text-success" aria-hidden="true"></i> Primeira mensagem</dt><dd>Passos para reproduzir, captura se possível, navegador e perfil.</dd><dt><i class="bi bi-1-circle text-success" aria-hidden="true"></i> Um tema por bilhete</dt><dd>Não misture incidências distintas.</dd></dl>',
      },
      {
        id: 'turnos',
        cat: 'comms',
        icon: 'arrow-left-right',
        h: 'Turnos e fecho',
        html: '<p>Quando o suporte responde, pode enviar na sua vez ou fechar se ficou resolvido. Cada envio notifica o suporte por e-mail.</p>',
      },
    ],
  },
  panel__ventas: {
    overview:
      'Vendas GROBO é o canal para orçamentos, contratação de módulos ou consultas comerciais. A mensagem envia-se por e-mail à equipa comercial; a resposta chega ao e-mail registado no seu perfil.\n\nNão use este ecrã para reportar falhas do sistema: para isso existe «Ajuda → Bilhete». Escreva com detalhe suficiente (mínimo umas linhas) para a equipa comercial o poder orientar.',
    summary:
      'Contacto comercial com a GROBO: um único envio por e-mail à equipa comercial (não é bilhete de suporte técnico).',
    roles:
      'Utilizadores com Ajuda → Vendas. É necessário e-mail válido em Meu perfil.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'shop',
        h: 'Para que serve este ecrã',
        html: '<p>Serve para <strong>orçamentos</strong>, dúvidas de contratação ou feedback positivo. A mensagem vai para <strong>ventas@groboapp.com</strong> com categoria <strong>venda</strong>.</p><ul class="mb-0"><li>Não use para falhas da aplicação: <strong>Ajuda → Bilhete/Contacto</strong> (suporte Gecko) é para incidências técnicas—costuma estar disponível para perfis <strong>administrativos</strong>; se não tiver o item, peça à administração da sede que abra o bilhete.</li><li>Pode mencionar prazos, módulos ou <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
      },
      {
        id: 'lista_ui',
        cat: 'forms',
        icon: 'ui-checks',
        h: 'O que vê no ecrã (lista de elementos)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-text-paragraph text-success" aria-hidden="true"></i> Texto introdutório</dt><dd>Contexto e benefícios.</dd><dt><i class="bi bi-envelope-at text-success" aria-hidden="true"></i> Responderemos a</dt><dd>Mostra o e-mail do perfil; vendas responde aí.</dd><dt><i class="bi bi-textarea-resize text-success" aria-hidden="true"></i> Mensagem</dt><dd>Campo onde escreve o pedido (mínimo 10 caracteres).</dd><dt><i class="bi bi-send text-success" aria-hidden="true"></i> Enviar</dt><dd>Envia o formulário para a equipa comercial; o botão pode mostrar um momento de espera.</dd></dl>',
      },
      {
        id: 'popup',
        cat: 'modals',
        icon: 'check-circle',
        h: 'Janela emergente de confirmação',
        html: '<p>Após envio bem-sucedido, costuma aparecer uma <strong>mensagem de confirmação</strong> com sucesso, o destino e a indicação de resposta ao seu e-mail de utilizador.</p><ul class="mb-0"><li>Falta de e-mail no perfil ou texto curto mostra aviso.</li><li>Problemas de ligação ou servidor: mensagem genérica; tente mais tarde.</li></ul>',
      },
    ],
  },
  panel__capacitacion: {
    overview:
      'Está a ler a biblioteca de capacitação: um manual organizado pelas mesmas áreas do seu menu lateral, para encontrar ajuda exactamente onde precisa.\n\nCada tema começa com uma explicação ampla («Sobre esta secção»), um resumo breve e apartados que pode abrir ou fechar. A lista à esquerda muda o conteúdo à direita; se guardar ou partilhar o endereço do navegador depois de escolher um tema, pode voltar directamente a essa página. Os ícones são orientativos: o aspecto exacto dos botões pode variar um pouco entre sedes.',
    summary:
      'Esta biblioteca: manual organizado pelas mesmas rotas do seu menu lateral.',
    roles:
      'Quem tem Ajuda → Capacitação.',
    blocks: [
      {
        id: 'como',
        cat: 'navigation',
        icon: 'book',
        h: 'Como o manual está organizado',
        html: '<ul class="mb-0"><li><strong>Lista à esquerda:</strong> um botão por tema, alinhado com o que tem no menu (segundo o seu perfil e o contratado na sede).</li><li><strong>Zona à direita:</strong> primeiro a introdução ampla da secção, o resumo curto, a quem costuma aplicar-se e, depois, apartados expansíveis.</li><li><strong>Títulos de categoria em verde:</strong> agrupam temas por tipo de ecrã (por exemplo menu, filtros, tabela principal, formulários).</li><li><strong>Listas com ícones:</strong> cada item descreve um controlo habitual; o desenho exacto pode mudar, mas a função é a indicada.</li></ul><figure class="manual-cap-figure my-3 border rounded overflow-hidden"><img src="../../dist/img/capacitacion/panel-capacitacion-biblioteca-layout.svg" width="640" height="280" alt="Esquema: coluna esquerda com lista de temas do manual e painel à direita com conteúdo e acordeão." class="img-fluid d-block w-100" style="max-height:280px;object-fit:contain" loading="lazy" decoding="async" /><figcaption class="small text-body-secondary px-3 py-2 border-top">Ilustração genérica sem dados reais; a aparência pode variar conforme a instituição e o tema claro ou escuro.</figcaption></figure>',
      },
      {
        id: 'iconos',
        cat: 'content',
        icon: 'palette',
        h: 'Ícones nos títulos e no texto',
        html: '<p>Os ícones Bootstrap (ex.: <i class="bi bi-lightbulb text-success"></i>) são <strong>ajuda visual</strong>; o botão real na sua sede pode ter outro desenho ou só texto. Priorize a <strong>posição</strong> e a <strong>função</strong> descrita.</p>',
      },
      {
        id: 'lista',
        cat: 'sidebar',
        icon: 'list',
        h: 'Botões da biblioteca (coluna esquerda)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Cada tema da lista</dt><dd>Ao premir, carrega a guia à direita e deixa guardado no endereço do navegador o sítio desse tema, para favoritos ou partilha do link.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Tema realçado a verde</dt><dd>Indica em que capítulo está a ler agora.</dd></dl>',
      },
      {
        id: 'acordeon',
        cat: 'content',
        icon: 'arrows-expand',
        h: 'Acordeão do tema (direita)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-down text-success" aria-hidden="true"></i> Cabeçalho de secção</dt><dd>Expande ou fecha o detalhe.</dd><dt><i class="bi bi-lightbulb text-success" aria-hidden="true"></i> Faixa verde superior</dt><dd>Lembra como ler o tutorial e que o texto pode variar por sede.</dd></dl>',
      },
      {
        id: 'roles',
        cat: 'help',
        icon: 'person-lock',
        h: 'Porque faltam alguns temas',
        html: '<p>Se falta uma secção na lista, não é um erro: a sua instituição não atribuiu esse módulo ou item de menu. Peça a habilitação à administração da sede.</p>',
      },
      {
        id: 'ticket_grobo',
        cat: 'help',
        icon: 'ticket-perforated',
        h: 'Bilhete suporte Gecko: falhas da aplicação (normalmente só administradores)',
        html: '<p>O item <strong>Ajuda → Bilhete/Contacto</strong> abre o <strong>suporte Gecko</strong>: serve para reportar <strong>falhas técnicas do programa</strong> (erros, bloqueios, comportamento anómalo do GROBO) à equipa do produto.</p><ul class="mb-0"><li><strong>Quem o vê:</strong> na configuração habitual do menu, perfis <strong>administrativos</strong> da sede (equipa do biotério, administração). Os <strong>investigadores</strong> muitas vezes <strong>não</strong> têm esta entrada—de propósito, para evitar canais duplicados.</li><li><strong>Se for investigador</strong> e a aplicação falhar, contacte a <strong>administração do biotério</strong> ou o contacto definido pela sede; eles podem abrir ou escalar o bilhete com os dados certos.</li><li>O tema <strong>Suporte / bilhetes</strong> nesta biblioteca (se constar da sua lista) aprofunda turnos, boas práticas e diferenças face a <strong>Vendas</strong>.</li></ul>',
      },
      {
        id: 'barra_ayuda',
        cat: 'help',
        icon: 'layout-text-window-reverse',
        h: 'Barra inferior, menu Ajuda e tutoriais sem barra',
        html:
          '<p>A <strong>barra verde inferior</strong> liga ao manual do tema atual e ao tutorial interativo do <strong>ecrã</strong> que tem à frente (lista ou vista principal).</p><ul class="mb-0"><li><strong>Com janela emergente aberta:</strong> aparece uma faixa de ajuda por cima do fundo escurecido, um botão extra na barra (só nessa altura) e, no menu <strong>Ajuda</strong>, o tutorial dessa <em>mesma</em> janela: em cima o título, ao centro os dados e campos, em baixo os botões de ação. No manual, o capítulo sobre <strong>janelas emergentes</strong> explica com mais pormenor o que pode alterar e o que faz cada botão nos cobros habituais.</li><li><strong>Ocultar a barra:</strong> use «Não voltar a mostrar esta barra» na própria barra ou na faixa quando há uma janela por cima; as duas desaparecem em conjunto.</li><li><strong>Voltar a mostrar:</strong> interruptor em Capacitação ou <strong>Ajuda → Mostrar barra inferior de ajuda</strong>.</li><li><strong>Tutoriais automáticos:</strong> a opção de não voltar a mostrá-los ao entrar num ecrã aparece no <strong>final</strong> do percurso, não no primeiro passo.</li><li><strong>Quer repetir um tutorial?</strong> Abra-o quando quiser a partir da barra verde, de <strong>Ajuda</strong> no menu superior ou de Capacitação.</li></ul>',
      },
    ],
  },
  capacitacion__tema__red: {
    overview:
      'No GROBO, «REDE» significa que várias sedes ou biotérios partilham um enquadramento comum (mesma dependência, políticas alinhadas ou contrato agrupado), sem deixarem de ser instituições distintas com dados e menus próprios.\n\nEste tema explica como podem cruzar-se fluxos (pedidos, mensagens, notícias, faturação) quando a sua organização trabalha assim. Se só opera uma sede isolada, pode ler como referência ou ignorar o que não aplicar.',
    summary:
      'Guia conceptual para instituições que operam em REDE: várias sedes sob a mesma dependência ou contrato, com fluxos partilhados ou derivados.',
    roles:
      'Todos os perfis; a aplicação prática depende da configuração de sedes, módulos e permissões.',
    blocks: [
      {
        id: 'concepto',
        cat: 'navigation',
        icon: 'share',
        h: 'O que é a REDE no GROBO',
        html: '<p>Não é uma «rede social»: é um <strong>modelo organizativo</strong> em que várias sedes partilham enquadramento (marca, contrato, políticas) mas podem ter biotérios, listas de preços e administradores próprios.</p><ul class="mb-0"><li>Cada utilizador continua a pertencer a uma <strong>instituição/sede</strong> concreta para dados e menu.</li><li>Alguns fluxos permitem <strong>derivar</strong> pedidos ou mensagens entre sedes se a configuração e permissões o permitirem.</li></ul>',
      },
      {
        id: 'formularios',
        cat: 'forms',
        icon: 'ui-checks',
        h: 'Formulários e pedidos entre sedes',
        html: '<p>O investigador normalmente faz pedidos contra protocolos e regras da <strong>sua</strong> sede. Se a execução deve ser noutra sede da rede, siga o procedimento interno (mensagem institucional, campo específico ou derivação administrativa). Não assuma envio físico para outra cidade sem validação humana.</p>',
      },
      {
        id: 'mensajes',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Mensagens pessoais vs institucionais',
        html: '<ul class="mb-0"><li><strong>Mensagens:</strong> coordenação entre pessoas.</li><li><strong>Mensagens institucionais:</strong> avisos oficiais; na REDE podem comunicar prioridades transversais.</li></ul>',
      },
      {
        id: 'noticias',
        cat: 'content',
        icon: 'newspaper',
        h: 'Notícias locais e alcance',
        html: '<p>As notícias podem ser para todo o portal ou segmentadas—verifique se afeta só uma sede.</p>',
      },
      {
        id: 'protocolos',
        cat: 'links',
        icon: 'file-earmark-medical',
        h: 'Protocolos na REDE',
        html: '<p>Um protocolo pode estar limitado a uma sede ou ter anexos que autorizem colaboração. Os pedidos de alta/alteração seguem o comité correspondente; a REDE não substitui aprovações éticas.</p>',
      },
      {
        id: 'facturacion',
        cat: 'content',
        icon: 'cash-coin',
        h: 'Faturação e rastreabilidade',
        html: '<p>Os relatórios contabilísticos costumam filtrar por sede ou departamento. Na REDE, evite duplicar custos entre sedes para o mesmo projeto.</p>',
      },
      {
        id: 'buenas',
        cat: 'help',
        icon: 'lightbulb',
        h: 'Boas práticas',
        html: '<ul class="mb-0"><li>Identifique sempre <strong>sede</strong> e <strong>código interno</strong> em mensagens e pedidos.</li><li>Documente acordos entre sedes fora do software quando necessário.</li><li>Em dúvida de permissão, pergunte primeiro ao seu administrador local.</li></ul>',
      },
    ],
  },
  capacitacion__tema__modales: {
    overview:
      'As janelas emergentes grandes concentram uma tarefa sem sair do ecrã de fundo: na faturação mostram a ficha de um pedido e permitem cobrar ou ajustar valores. Caixas pequenas ao centro servem para avisos, confirmações sim/não ou erros breves.\n\nEste tema explica o que é só leitura, o que pode editar e o que faz cada botão nas janelas habituais de cobro. Complementa o tutorial interactivo «Janelas emergentes» no menu Ajuda.',
    summary:
      'Anatomia cabeçalho/corpo/rodapé; campos informativos vs editáveis; PAGAR/RETIRAR; PDF; confirmações.',
    roles:
      'Quem use faturação ou outros ecrãs com detalhe em modal; os restantes podem ler a parte genérica.',
    blocks: [
      {
        id: 'anatomia',
        cat: 'modals',
        h: 'Partes comuns de um modal grande',
        html: '<dl class="manual-glossary mb-0"><dt>Cabeçalho escuro</dt><dd>Título (tipo de ficha e número do pedido), por vezes o <strong>saldo disponível do titular</strong> num distintivo verde, e o <strong>X</strong> para fechar sem confirmar acções pendentes.</dd><dt>Corpo</dt><dd>Coluna esquerda: protocolo, espécies, quantidades, datas, reagente, etc.—em geral <strong>só leitura</strong>. Coluna direita: bloco de <strong>cobro</strong> (valores e acções).</dd><dt>Rodapé</dt><dd>Costuma ter <strong>PDF</strong> e <strong>FECHAR</strong>. Não confunda fechar com registar pagamento—o pagamento usa os botões do bloco de cobro e as mensagens de confirmação que possam aparecer a seguir.</dd></dl>',
      },
      {
        id: 'badges',
        cat: 'modals',
        h: 'Distintivos de estado',
        html: '<p><strong>ISENTO</strong>, <strong>PAGO INTEGRAL</strong>, <strong>PAGO PARCIAL</strong>, <strong>NÃO PAGO</strong> e descontos derivam de totais, valores pagos e regras de isenção. São informativos—não se editam directamente.</p>',
      },
      {
        id: 'animal_campos',
        cat: 'modals',
        h: 'Modal pedido de animais',
        html: '<ul class="mb-0"><li><strong>Só leitura:</strong> titular do protocolo, solicitante, tipo de pedido, id/nome do protocolo, taxonomia, idade/peso, contadores de sexo, datas, <strong>nota administrativa</strong>, <strong>pago actualmente</strong>.</li><li><strong>Custo total do formulário:</strong> campo numérico só leitura por defeito; o <strong>lápis</strong> permite correcções autorizadas (o servidor valida após gravar).</li><li><strong>Montante a mover:</strong> quanto deseja <strong>PAGAR</strong> (descontar do saldo do titular) ou <strong>RETIRAR</strong> (reverter parte do pagamento). Montante inválido ou sem saldo/dívida mostra aviso.</li><li><strong>PAGAR / RETIRAR:</strong> pedem confirmação; em caso de sucesso o modal pode recarregar.</li><li><strong>PDF:</strong> documento de suporte do item.</li></ul>',
      },
      {
        id: 'reactivo_insumo',
        cat: 'modals',
        h: 'Modal reagente e insumo',
        html: '<p><strong>Reagente:</strong> mesma lógica—pagador e dados biológicos informativos; <strong>nota administrativa</strong>; <strong>custo total</strong> com lápis; <strong>pago</strong>; campo de montante e <strong>PAGAR</strong>/<strong>RETIRAR</strong>; <strong>PDF</strong>.</p><p class="mb-0"><strong>Insumo experimental:</strong> lista de linhas do pedido (só leitura); bloco de saldo, total com lápis, pago e os mesmos botões. O detalhe vem como texto estruturado do servidor.</p>',
      },
      {
        id: 'alojamiento',
        cat: 'modals',
        h: 'Modal alojamento',
        html: '<p>Mostra <strong>titular (paga)</strong> face ao <strong>responsável pela estadia</strong>, tipo de alojamento, tramos e dias calculados. A parte financeira resume <strong>custo histórico</strong> e <strong>total pago</strong> com campos para aplicar pagamentos ou estornos conforme a implementação. <strong>PDF</strong> e <strong>FECHAR</strong> no rodapé.</p>',
      },
      {
        id: 'sweetalert',
        cat: 'modals',
        h: 'Avisos e confirmações pequenas',
        html: '<p>Não são formulários de dados: comunicam erros de validação («seleccione departamento»), sucesso de pagamento ou pedem <strong>confirmação</strong> antes de movimentos sensíveis. Leia o texto e confirme ou cancele; cancelar não altera o servidor.</p>',
      },
      {
        id: 'ayuda_billing',
        cat: 'help',
        h: 'Modal «Ajuda» na faturação',
        html: '<p>O botão de ajuda de cada subpágina de faturação abre um <strong>modal próprio</strong> com texto estático sobre essa vista—independente deste manual. Use os temas da biblioteca de capacitação para aprofundar.</p>',
      },
    ],
  },
};
