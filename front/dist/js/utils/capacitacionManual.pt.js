/**
 * Manual de capacitação (PT): capítulos por slug de rota de menu.
 */
export const CHAPTERS = {
  admin__dashboard: {
    summary:
      'Painel inicial da administração da sede: visão rápida da atividade, atalhos a módulos críticos e lembretes operacionais.',
    roles:
      'Utilizadores com menu administrativo (tipicamente perfil mestre em contexto de instituição, superadmin da sede, admin da sede). O visível depende dos módulos contratados e permissões.',
    blocks: [
      {
        id: 'proposito',
        h: 'Finalidade deste painel',
        html: '<p>Agrega indicadores e atalhos para não abrir cada módulo para ver trabalho pendente. Não substitui filas detalhadas (protocolos, pedidos, reservas): serve para <strong>priorizar</strong> e <strong>navegar</strong>.</p><ul class="mb-0"><li>Revise cartões ou blocos com contagens ou listas recentes.</li><li>Use ligações diretas ao módulo onde deve agir.</li><li>Se um número não bater com a realidade, atualize ou abra o módulo de origem—o painel pode mostrar um subconjunto.</li></ul>',
      },
      {
        id: 'navegacion',
        h: 'Navegação e menu lateral',
        html: '<p>O menu lateral agrupa todas as áreas administrativas ativas na sua instituição. Itens em falta costumam estar <strong>desativados por módulo</strong> ou por perfil.</p><ul class="mb-0"><li>Confirme que está na sede certa se gere várias.</li><li>A barra superior pode incluir notificações, tema claro/escuro ou acesso ao perfil.</li><li>Volte ao painel a partir de qualquer ecrã pelo item de menu.</li></ul>',
      },
      {
        id: 'flujo',
        h: 'Fluxo de trabalho recomendado',
        html: '<ul class="mb-0"><li><strong>Manhã:</strong> rever pedidos novos (protocolo, animais, insumos) e mensagens institucionais.</li><li><strong>Contínuo:</strong> manter estados de pedidos e reservas atualizados para que investigadores vejam progresso em «Os meus formulários» / «As minhas reservas».</li><li><strong>Fecho do mês:</strong> faturação e histórico contabilístico se a sede usar.</li></ul>',
      },
      {
        id: 'ayuda',
        h: 'Se algo não corresponder ao esperado',
        html: '<p>Use a barra inferior <strong>«Ver tutorial na capacitação»</strong> no ecrã específico, ou <strong>Ajuda → Capacitação</strong> para o manual por secção. Para incidências técnicas: <strong>Ajuda → Bilhete/Contacto</strong>.</p>',
      },
    ],
  },
  panel__dashboard: {
    summary:
      'Início do painel do investigador: acesso rápido a protocolos, pedidos e comunicações.',
    roles:
      'Investigadores e utilizadores da sede nessa função (perfis 3, 5, 6 ou outros conforme a instituição). Só vê módulos que o administrador ativou.',
    blocks: [
      {
        id: 'proposito',
        h: 'O que encontrará',
        html: '<p>Resumo da sua atividade no GROBO: ligações a <strong>Os meus protocolos</strong>, <strong>Centro de pedidos</strong>, <strong>Os meus formulários</strong>, mensagens ou notícias conforme o contrato.</p><ul class="mb-0"><li>Confirme que os protocolos ativos estão válidos antes de novos pedidos.</li><li>Os avisos do painel não substituem o e-mail institucional—use-os como guia rápida.</li></ul>',
      },
      {
        id: 'pedidos',
        h: 'Pedidos e formulários',
        html: '<p>Pedidos de animais, reagentes ou insumos começam no <strong>Centro de pedidos</strong> e seguem-se em <strong>Os meus formulários</strong>. O estado é atualizado pela administração.</p><ul class="mb-0"><li>Guarde rascunhos em formulários longos.</li><li>Anexe documentação pedida para evitar devoluções.</li></ul>',
      },
      {
        id: 'red',
        h: 'Se a instituição trabalha em REDE',
        html: '<p>Várias sedes sob a mesma dependência podem partilhar fluxos (formulários, mensagens institucionais, notícias). Veja o tema <strong>«Trabalhar em REDE»</strong> na biblioteca de capacitação.</p>',
      },
    ],
  },
  admin__usuarios: {
    summary:
      'Diretório de pessoas da sede: criação, edição, departamento, perfis e ligação a protocolos e formulários.',
    roles:
      'Administração da sede (tipicamente perfis 2 e 4). O perfil mestre (1) pode atuar em contexto superadmin; as ações dependem da política interna.',
    blocks: [
      {
        id: 'lista',
        h: 'Lista e pesquisa',
        html: '<p>A grelha costuma permitir pesquisar por nome, apelido ou utilizador e filtrar por perfil ou departamento.</p><ul class="mb-0"><li>Clique na linha para abrir a <strong>ficha do utilizador</strong>.</li><li>Exportações (Excel/PDF) servem para auditorias—cumpra a normativa de dados pessoais.</li><li>Não partilhe listas completas fora da instituição sem autorização.</li></ul>',
      },
      {
        id: 'ficha',
        h: 'Ficha de utilizador',
        html: '<p>Na ficha corrige dados de contacto, atribui <strong>departamento</strong> e revê <strong>protocolos</strong> e <strong>formulários</strong> ligados conforme o sistema mostra.</p><ul class="mb-0"><li>Mudança de perfil pode alterar de imediato o menu visível—confirme com a pessoa.</li><li>Redefinição de senha: siga o fluxo da instituição (e-mail de recuperação, etc.).</li></ul>',
      },
      {
        id: 'vinculos',
        h: 'Protocolos e rastreabilidade',
        html: '<p>Antes de eliminar ou alterar fortemente um utilizador, verifique se não é titular único de protocolos ativos ou responsável por pedidos abertos.</p>',
      },
    ],
  },
  admin__protocolos: {
    summary:
      'Gestão operacional de protocolos já na plataforma: estado, dados do estudo, espécies e ligação a pedidos e alojamentos.',
    roles:
      'Administração do biotério / conformidade / secretariado técnico da sede. Não confundir com a fila de «Pedidos de protocolo» para novas submissões.',
    blocks: [
      {
        id: 'diferencia',
        h: 'Protocolos vs pedido de protocolo',
        html: '<p><strong>Este ecrã</strong> gere protocolos como <strong>entidades de trabalho</strong> (vigência, participantes, limites). <strong>Pedido de protocolo</strong> é o fluxo para <strong>submeter ou alterar</strong> um protocolo perante o comité ou a administração.</p><ul class="mb-0"><li>Para processar uma submissão nova, vá a <strong>Administração → Pedidos de protocolo</strong>.</li><li>Aqui ajusta metadados operacionais e coerência com pedidos existentes.</li></ul>',
      },
      {
        id: 'bandeja',
        h: 'Fila e filtros',
        html: '<p>Pesquise por título, código interno, investigador ou estado. Os estados dependem da configuração de protocolos da sede.</p><ul class="mb-0"><li>Revise datas de vigência antes de autorizar consumos.</li><li>Anexos ou versões podem estar no detalhe do protocolo ou no pedido associado.</li></ul>',
      },
      {
        id: 'acciones',
        h: 'Ações habituais',
        html: '<ul class="mb-0"><li>Ativar/desativar ou marcar estados que reflitam aprovação institucional.</li><li>Corrigir dados administrativos (sem substituir parecer ético—processo externo à ferramenta).</li><li>Ligar ou rever espécies e limites que condicionam pedidos de animais e alojamentos.</li></ul>',
      },
      {
        id: 'integracion',
        h: 'Integração com outros módulos',
        html: '<p><strong>Pedidos de animais</strong>, <strong>alojamentos</strong> e parte da <strong>faturação</strong> leem o protocolo como referência. Um protocolo vencido ou mal configurado gera rejeições em cadeia.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
    summary:
      'Fila de tramitação de protocolo: novas altas, renovações ou alterações que o investigador envia e a administração ou comité processa no GROBO.',
    roles:
      'Pessoal administrativo e de conformidade. O investigador inicia o pedido na sua área quando ativo; aqui gere a resposta.',
    blocks: [
      {
        id: 'flujo',
        h: 'Fluxo típico',
        html: '<ol class="mb-0 small"><li>O investigador preenche o formulário de pedido e anexa documentação.</li><li>O pedido aparece aqui como pendente ou equivalente.</li><li>A administração revê completude, pode pedir correções ou avançar o estado.</li><li>Aprovado, o protocolo fica disponível em <strong>Protocolos</strong> para o dia a dia.</li></ol>',
      },
      {
        id: 'revision',
        h: 'O que rever em cada item',
        html: '<ul class="mb-0"><li>Identificação do titular e co-investigadores.</li><li>Espécies, procedimentos e datas alinhadas ao documento oficial.</li><li>Ficheiros obrigatórios (PDF do comité, anexos).</li><li>Coerência com regras internas (departamento, centro de custos se aplicável).</li></ul>',
      },
      {
        id: 'estados',
        h: 'Estados e comunicação',
        html: '<p>Os nomes exatos variam por configuração. Documente internamente o que cada estado significa para o biotério vs apenas ética.</p><ul class="mb-0"><li>Use comentários claros visíveis ao investigador.</li><li>Se há notificação por e-mail, confirme que o e-mail do perfil está atualizado.</li></ul>',
      },
    ],
  },
  admin__animales: {
    summary:
      'Administração de pedidos de animais vivos: receção, preparação, estados de entrega e comunicação com o investigador.',
    roles:
      'Biotério / compras / logística animal conforme organograma.',
    blocks: [
      {
        id: 'grilla',
        h: 'Lista de pedidos',
        html: '<p>Filtre por protocolo, requerente, datas, estado ou espécie. Priorize pedidos com data de necessidade próxima.</p><ul class="mb-0"><li>Abra o detalhe para quantidades, sexo, linhagem e notas do formulário.</li><li>Cruze sempre com <strong>protocolo válido</strong> e quotas autorizadas.</li></ul>',
      },
      {
        id: 'estados',
        h: 'Atualização de estado',
        html: '<ul class="mb-0"><li>Registe marcos: em preparação, pronto para levantamento, entregue, cancelado, etc.</li><li>Notas internas servem para turnos; notas ao investigador devem ser compreensíveis sem jargão interno.</li><li>Antes de «entregue», confirme registo de levantamento exigido pela sede.</li></ul>',
      },
      {
        id: 'trazabilidad',
        h: 'Rastreabilidade e erros',
        html: '<p>Se o pedido foi criado contra protocolo errado, coordene com administração de protocolos antes de forçar alterações que quebrem auditoria.</p>',
      },
    ],
  },
  admin__reactivos: {
    summary:
      'Fila de pedidos de reagentes (distinta do fluxo genérico de insumos quando assim está configurado).',
    roles:
      'Administração de laboratório ou depósito de reagentes.',
    blocks: [
      {
        id: 'uso',
        h: 'Uso deste ecrã',
        html: '<p>Mantenha estados atualizados para que em <strong>Os meus formulários</strong> o investigador veja progresso. Verifique unidade, quantidade e condições de armazenamento no detalhe.</p>',
      },
      {
        id: 'prioridad',
        h: 'Priorização',
        html: '<ul class="mb-0"><li>Marque urgências pela data de experiência declarada.</li><li>Resolva primeiro pedidos que bloqueiam outros módulos.</li></ul>',
      },
    ],
  },
  admin__insumos: {
    summary:
      'Gestão de pedidos de insumos gerais: preparação, stock, entrega e fecho.',
    roles:
      'Depósito / compras / administração de insumos experimentais.',
    blocks: [
      {
        id: 'operativa',
        h: 'Operação diária',
        html: '<ul class="mb-0"><li>Confirme disponibilidade ou prazo de compra antes de prometer datas.</li><li>Se o item é substituível, registe o critério em notas.</li><li>Na entrega, atualize o estado para fechar o circuito de notificação.</li></ul>',
      },
      {
        id: 'config',
        h: 'Ligação à configuração',
        html: '<p>Catálogos de insumos costumam manter-se em <strong>Configuração → Insumos experimentais</strong>. Se um pedido falha por item não catalogado, corrija primeiro o cadastro mestre.</p>',
      },
    ],
  },
  admin__reservas: {
    summary:
      'Calendário e administração de reservas de salas, equipamentos ou franjas partilhadas.',
    roles:
      'Administração de infraestrutura ou quem centraliza a agenda do biotério.',
    blocks: [
      {
        id: 'vista',
        h: 'Vistas e conflitos',
        html: '<p>Revise sobreposições de horário e regras de cancelamento. Algumas sedes exigem aprovação explícita para certos espaços.</p>',
      },
      {
        id: 'acciones',
        h: 'Criar, mover ou cancelar',
        html: '<ul class="mb-0"><li>Documente o motivo de alterações impostas pela administração.</li><li>Comunique ao investigador se a reserva for alterada no back-office.</li></ul>',
      },
    ],
  },
  admin__alojamientos: {
    summary:
      'Gestão de estadias de animais: caixas, localização, responsáveis e fecho de períodos faturáveis.',
    roles:
      'Pessoal de alojamento com permissões.',
    blocks: [
      {
        id: 'grilla',
        h: 'Grelha de alojamentos',
        html: '<p>Cada registo liga protocolo, espécie, quantidade e janela de datas. Use filtros para alinhar com inventário físico.</p>',
      },
      {
        id: 'finalizar',
        h: 'Finalizar e faturação',
        html: '<p><strong>Finalizar</strong> ou reabrir afeta como os consumos entram na faturação. Alinhe com finanças antes de desfazer períodos fechados.</p><ul class="mb-0"><li>O histórico pode mostrar mensagens do responsável de alojamento quando implementado.</li><li>QR ou fichas técnicas podem expor dados só de leitura.</li></ul>',
      },
    ],
  },
  admin__estadisticas: {
    summary:
      'Relatórios e gráficos agregados (conforme módulos ativos).',
    roles:
      'Direção do biotério, qualidade ou administração que precise indicadores.',
    blocks: [
      {
        id: 'interpretacion',
        h: 'Como interpretar os dados',
        html: '<p>Totais dependem da qualidade de carga diária (pedidos fechados, alojamentos finalizados). Use intervalos largos para tendências e curtos para operação.</p>',
      },
      {
        id: 'export',
        h: 'Exportar e partilhar',
        html: '<p>Ao apresentar fora da instituição, anonimize e respeite confidencialidade de projetos.</p>',
      },
    ],
  },
  admin__configuracion__config: {
    summary:
      'Centro de parâmetros da sede—não é uma página única: subsecções (instituição, espécies, reservas, perfis, protocolos, insumos, alojamentos, etc.).',
    roles:
      'Apenas pessoal de configuração autorizado; alterações em dados mestres são de alto impacto.',
    blocks: [
      {
        id: 'mapa',
        h: 'Mapa de subsecções',
        html: '<ul class="mb-0"><li><strong>Instituição / departamentos:</strong> identidade e estrutura.</li><li><strong>Espécies e categorias:</strong> base para pedidos e alojamentos.</li><li><strong>Reservas e espaços:</strong> salas, equipamentos, regras.</li><li><strong>Tipos de formulário / insumos:</strong> o que cada perfil pode pedir.</li><li><strong>Protocolos:</strong> modelos, estados ou validações locais.</li><li><strong>Alojamentos:</strong> localizações físicas, tarifas se aplicável.</li><li><strong>Utilizadores e perfis:</strong> por vezes ligado à gestão global.</li></ul>',
      },
      {
        id: 'riesgos',
        h: 'Riscos ao alterar parâmetros',
        html: '<p>Uma mudança em espécie ou tipo de formulário pode invalidar rascunhos. Planeie janelas de manutenção e avise utilizadores-chave.</p>',
      },
      {
        id: 'documentar',
        h: 'Boa prática',
        html: '<p>Mantenha registo externo (wiki interna) do significado de cada estado e de quem autorizou mudanças críticas para auditorias.</p>',
      },
    ],
  },
  panel__formularios: {
    summary:
      'Entrada para formulários de pedido (animais, reagentes, insumos). Pode mostrar sub-rotas ou cartões conforme o contrato.',
    roles:
      'Investigadores e utilizadores autorizados a gerar pedidos.',
    blocks: [
      {
        id: 'subsecciones',
        h: 'Subsecções típicas',
        html: '<ul class="mb-0"><li><strong>Pedido de animais:</strong> protocolo válido, espécie, quantidades e datas; podem exigir anexos.</li><li><strong>Pedido de reagentes:</strong> catálogo ou texto livre conforme configuração.</li><li><strong>Pedido de insumos:</strong> linhas de depósito.</li></ul>',
      },
      {
        id: 'antes',
        h: 'Antes de enviar',
        html: '<ul class="mb-0"><li>Confirme que o <strong>protocolo</strong> está aprovado e válido em <strong>Os meus protocolos</strong>.</li><li>Revise limites de espécies/autorizações.</li><li>Guarde rascunho se precisar consultar o líder do projeto.</li></ul>',
      },
      {
        id: 'despues',
        h: 'Depois do envio',
        html: '<p>O seguimento é em <strong>Os meus formulários</strong>: estados, comentários da administração e pedidos de correção.</p>',
      },
    ],
  },
  panel__misformularios: {
    summary:
      'Histórico unificado de todos os seus pedidos com estado e detalhe.',
    roles:
      'Qualquer utilizador que tenha enviado formulários.',
    blocks: [
      {
        id: 'filtros',
        h: 'Filtros e leitura de estados',
        html: '<p>Filtre por tipo, datas ou texto para localizar pedidos antigos. O estado é a fonte operacional; se «pendente» demora, contacte o biotério por <strong>Mensagens</strong> ou canal oficial.</p>',
      },
      {
        id: 'detalle',
        h: 'Detalhe e anexos',
        html: '<ul class="mb-0"><li>Abra o item para linhas, notas e ficheiros.</li><li>Não apague e-mails de notificação se a sede os usa como comprovativo.</li></ul>',
      },
    ],
  },
  panel__misalojamientos: {
    summary:
      'Alojamentos em que participa como investigador: datas, protocolo e estado.',
    roles:
      'Investigadores com animais alojados ou ligados aos seus protocolos.',
    blocks: [
      {
        id: 'consulta',
        h: 'Consulta',
        html: '<p>Use esta lista para planear experiências e renovações. Se os dados divergirem do biotério, abra mensagem com referência ao código de alojamento.</p>',
      },
    ],
  },
  panel__misreservas: {
    summary:
      'As suas reservas de salas ou equipamentos: horários, estado e política de cancelamento.',
    roles:
      'Utilizadores com permissão de reserva.',
    blocks: [
      {
        id: 'gestion',
        h: 'Gestão',
        html: '<ul class="mb-0"><li>Cancele com antecedência conforme regras da sede para libertar franja.</li><li>Para séries recorrentes, verifique se a interface permite ou peça à administração.</li></ul>',
      },
    ],
  },
  panel__misprotocolos: {
    summary:
      'Protocolos em que é membro: vigência, dados-chave e base para novos pedidos.',
    roles:
      'Investigadores e colaboradores conforme atribuição em cada protocolo.',
    blocks: [
      {
        id: 'consulta',
        h: 'O que rever sempre',
        html: '<ul class="mb-0"><li>Datas de início e fim da autorização.</li><li>Espécies e procedimentos permitidos.</li><li>Perfis no protocolo (titular, co-investigador).</li></ul>',
      },
      {
        id: 'solicitud',
        h: 'Renovações e alterações',
        html: '<p>Para alargar vigência ou alterar âmbito, o caminho administrativo costuma ser <strong>Pedido de protocolo</strong> (no seu perfil ou ligação ativada pela sede), não um pedido de animais isolado.</p><ul class="mb-0"><li>Enquanto o trâmite estiver pendente, novos pedidos podem estar restritos—pergunte ao secretariado do comité ou biotério.</li></ul>',
      },
      {
        id: 'vinculo',
        h: 'Ligação à REDE',
        html: '<p>Em instituições multi-sede, o âmbito do protocolo é definido pela administração. Faça pedidos na sede correta conforme regras internas.</p>',
      },
    ],
  },
  admin__precios: {
    summary:
      'Manutenção de tarifas e listas de preços usadas na faturação ou orçamentos de serviços.',
    roles:
      'Finanças ou biotério conforme delegação.',
    blocks: [
      {
        id: 'cambios',
        h: 'Alterações de preço',
        html: '<p>Versionamento e datas efetivas: uma data errada pode desfasar faturas já emitidas. Alinhe com <strong>Histórico contabilístico</strong> e relatórios abertos.</p>',
      },
    ],
  },
  admin__facturacion__index: {
    summary:
      'Módulo contabilístico: relatórios por departamento, investigador, protocolo ou organização conforme o seu deployment.',
    roles:
      'Pessoal com módulo de faturação ativo.',
    blocks: [
      {
        id: 'subvistas',
        h: 'Subsecções habituais',
        html: '<ul class="mb-0"><li><strong>Por departamento:</strong> custos agrupados por unidade.</li><li><strong>Por investigador:</strong> útil para repartir custos por grupos ou fundos.</li><li><strong>Por protocolo:</strong> alinha gasto com projetos e requisitos de financiamento.</li><li><strong>Organização / resumo:</strong> visão executiva quando existir.</li></ul>',
      },
      {
        id: 'pdf',
        h: 'PDF, ajustes e fecho',
        html: '<p>PDFs ou exportações costumam ser por período. Ajustes manuais devem ficar justificados no histórico ou notas conforme política interna.</p>',
      },
    ],
  },
  admin__historialcontable: {
    summary:
      'Registo de movimentos e correções contabilísticas ligadas ao biotério.',
    roles:
      'Finanças ou administração com auditoria.',
    blocks: [
      {
        id: 'auditoria',
        h: 'Uso para auditoria',
        html: '<p>Use filtros por data, utilizador ou tipo de movimento. Não apague evidências fora de procedimentos aprovados; prefira estornos se o sistema permitir.</p>',
      },
    ],
  },
  panel__mensajes: {
    summary:
      'Mensagens pessoais entre utilizadores da plataforma (1:1 ou por fio).',
    roles:
      'Todos os perfis com módulo de mensagens ativo.',
    blocks: [
      {
        id: 'hilo',
        h: 'Criar e seguir fios',
        html: '<ul class="mb-0"><li>Escolha destinatário e assunto claro (ex. «Pedido A-1234 — dúvida entrega»).</li><li>Mantenha um fio por assunto.</li><li>Verifique se recebe alertas por e-mail conforme o perfil.</li></ul>',
      },
    ],
  },
  panel__mensajes_institucion: {
    summary:
      'Canal institucional para comunicação formal entre sedes ou broadcast interno, distinto do chat pessoal.',
    roles:
      'Quem tem o módulo; muitas vezes administradores enviam e todos leem.',
    blocks: [
      {
        id: 'red',
        h: 'Mensagens e REDE',
        html: '<p>Em redes multi-sede, use para anúncios a utilizadores ligados ou comunicação oficial. Mensagens curtas com ligações a notícias ou repositório institucional.</p>',
      },
    ],
  },
  admin__comunicacion__noticias: {
    summary:
      'Publicação e manutenção de notícias do portal (avisos, encerramentos, convocatórias).',
    roles:
      'Comunicação institucional ou administração.',
    blocks: [
      {
        id: 'publicar',
        h: 'Publicar com critério',
        html: '<ul class="mb-0"><li>Datas de vigência visíveis para não confundir com avisos antigos.</li><li>Tom institucional e contacto para dúvidas.</li><li>Revise ortografia e ligações antes de publicar.</li></ul>',
      },
    ],
  },
  panel__noticias: {
    summary:
      'Leitura do mural de notícias para investigadores e pessoal.',
    roles:
      'Qualquer utilizador com acesso ao portal de notícias.',
    blocks: [
      {
        id: 'lectura',
        h: 'Como usar',
        html: '<p>Consulte periodicamente; alguns cortes de serviço ou convocatórias só são anunciados aqui. O e-mail pode não duplicar automaticamente.</p>',
      },
    ],
  },
  panel__perfil: {
    summary:
      'Dados pessoais, preferências (idioma, tema) e por vezes senha ou foto.',
    roles:
      'Todos os utilizadores autenticados.',
    blocks: [
      {
        id: 'datos',
        h: 'Dados e preferências',
        html: '<ul class="mb-0"><li>Mantenha <strong>e-mail</strong> e <strong>telefone</strong> atualizados para notificações e recuperação de acesso.</li><li>O <strong>idioma</strong> afeta etiquetas da interface e pode alinhar-se com a preferência no servidor.</li><li>O <strong>tema</strong> claro/escuro melhora leitura prolongada.</li></ul>',
      },
    ],
  },
  panel__soporte: {
    summary:
      'Bilhetes para a equipa de suporte do produto (Gecko): um turno de conversa por bilhete até nova resposta.',
    roles:
      'Perfis com item de ajuda/bilhete ativo.',
    blocks: [
      {
        id: 'buenas',
        h: 'Como abrir um bilhete útil',
        html: '<ul class="mb-0"><li>Assunto curto identificando o módulo (ex. «Reservas — erro ao guardar»).</li><li>Primeira mensagem: passos para reproduzir, captura se possível, navegador e perfil.</li><li>Um bilhete por incidência distinta—não misture assuntos.</li></ul>',
      },
      {
        id: 'turnos',
        h: 'Turnos e fecho',
        html: '<p>Quando o suporte responde, pode enviar na sua vez ou fechar se ficou resolvido. Cada envio notifica o suporte por e-mail.</p>',
      },
    ],
  },
  panel__ventas: {
    summary:
      'Contacto comercial com a GROBO: um único envio por e-mail à equipa comercial (não é bilhete de suporte técnico).',
    roles:
      'Utilizadores com Ajuda → Vendas. É necessário e-mail válido em Meu perfil.',
    blocks: [
      {
        id: 'proposito',
        h: 'Para que serve este ecrã',
        html: '<p>Serve para <strong>orçamentos</strong>, dúvidas de contratação ou feedback positivo. A mensagem vai para <strong>ventas@groboapp.com</strong> com categoria <strong>venda</strong>.</p><ul class="mb-0"><li>Não use para erros do sistema: use <strong>Ajuda → Bilhete/Contacto</strong> (suporte Gecko).</li><li>Pode mencionar prazos, módulos ou <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
      },
      {
        id: 'lista_ui',
        h: 'O que vê no ecrã (lista de elementos)',
        html: '<ul class="mb-0"><li><strong>Texto introdutório:</strong> contexto e benefícios.</li><li><strong>“Responderemos a”:</strong> mostra o e-mail do perfil; vendas responde a esse endereço.</li><li><strong>Área de mensagem:</strong> um campo de texto (mínimo 10 caracteres).</li><li><strong>Botão Enviar:</strong> chama a API; o botão pode mostrar carregamento.</li></ul>',
      },
      {
        id: 'popup',
        h: 'Janela emergente de confirmação',
        html: '<p>Após envio bem-sucedido, costuma abrir-se um <strong>diálogo</strong> (SweetAlert) com sucesso, o destino e a indicação de resposta ao seu e-mail de utilizador.</p><ul class="mb-0"><li>Falta de e-mail no perfil ou texto curto mostra aviso.</li><li>Falha do servidor: mensagem genérica; tente mais tarde.</li></ul>',
      },
    ],
  },
  panel__capacitacion: {
    summary:
      'Esta biblioteca: manual organizado pelas mesmas rotas do seu menu lateral.',
    roles:
      'Quem tem Ajuda → Capacitação.',
    blocks: [
      {
        id: 'como',
        h: 'Como tirar partido',
        html: '<ul class="mb-0"><li>Use a lista à esquerda—só vê temas dos módulos que o seu perfil pode abrir.</li><li>Cada tema pode ter <strong>secções em acordeão</strong>: leia em ordem na primeira vez.</li><li>A barra inferior noutros ecrãs abre diretamente o tema desse ecrã.</li><li>A pesquisa do navegador (Ctrl+F) ajuda em temas longos.</li></ul>',
      },
      {
        id: 'roles',
        h: 'Porque faltam alguns temas',
        html: '<p>Se falta uma secção, a instituição não atribuiu esse módulo ou item de menu. Peça à administração da sede acesso ou um utilizador com mais âmbito.</p>',
      },
    ],
  },
  capacitacion__tema__red: {
    summary:
      'Guia conceptual para instituições que operam em REDE: várias sedes sob a mesma dependência ou contrato, com fluxos partilhados ou derivados.',
    roles:
      'Todos os perfis; a aplicação prática depende da configuração de sedes, módulos e permissões.',
    blocks: [
      {
        id: 'concepto',
        h: 'O que é a REDE no GROBO',
        html: '<p>Não é uma «rede social»: é um <strong>modelo organizativo</strong> em que várias sedes partilham enquadramento (marca, contrato, políticas) mas podem ter biotérios, listas de preços e administradores próprios.</p><ul class="mb-0"><li>Cada utilizador continua a pertencer a uma <strong>instituição/sede</strong> concreta para dados e menu.</li><li>Alguns fluxos permitem <strong>derivar</strong> pedidos ou mensagens entre sedes se a configuração e permissões o permitirem.</li></ul>',
      },
      {
        id: 'formularios',
        h: 'Formulários e pedidos entre sedes',
        html: '<p>O investigador normalmente faz pedidos contra protocolos e regras da <strong>sua</strong> sede. Se a execução deve ser noutra sede da rede, siga o procedimento interno (mensagem institucional, campo específico ou derivação administrativa). Não assuma envio físico para outra cidade sem validação humana.</p>',
      },
      {
        id: 'mensajes',
        h: 'Mensagens pessoais vs institucionais',
        html: '<ul class="mb-0"><li><strong>Mensagens:</strong> coordenação entre pessoas.</li><li><strong>Mensagens institucionais:</strong> avisos oficiais; na REDE podem comunicar prioridades transversais.</li></ul>',
      },
      {
        id: 'noticias',
        h: 'Notícias locais e alcance',
        html: '<p>As notícias podem ser para todo o portal ou segmentadas—verifique se afeta só uma sede.</p>',
      },
      {
        id: 'protocolos',
        h: 'Protocolos na REDE',
        html: '<p>Um protocolo pode estar limitado a uma sede ou ter anexos que autorizem colaboração. Os pedidos de alta/alteração seguem o comité correspondente; a REDE não substitui aprovações éticas.</p>',
      },
      {
        id: 'facturacion',
        h: 'Faturação e rastreabilidade',
        html: '<p>Os relatórios contabilísticos costumam filtrar por sede ou departamento. Na REDE, evite duplicar custos entre sedes para o mesmo projeto.</p>',
      },
      {
        id: 'buenas',
        h: 'Boas práticas',
        html: '<ul class="mb-0"><li>Identifique sempre <strong>sede</strong> e <strong>código interno</strong> em mensagens e pedidos.</li><li>Documente acordos entre sedes fora do software quando necessário.</li><li>Em dúvida de permissão, pergunte primeiro ao seu administrador local.</li></ul>',
      },
    ],
  },
};
