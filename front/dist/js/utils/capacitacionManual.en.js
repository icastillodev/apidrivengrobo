/**
 * Training manual (EN): chapters by menu path slug.
 */
export const CHAPTERS = {
  admin__dashboard: {
    summary:
      'Admin home: quick view of activity, shortcuts to critical modules, and operational reminders.',
    roles:
      'Users with the administrative menu (typically master profile in institution context, site superadmin, site admin). Visible items depend on contracted modules and permissions.',
    blocks: [
      {
        id: 'proposito',
        h: 'Purpose of this dashboard',
        html: '<p>Aggregates indicators and shortcuts so you do not open every module to see pending work. It does not replace detailed queues (protocols, orders, reservations): it helps you <strong>prioritize</strong> and <strong>navigate</strong>.</p><ul class="mb-0"><li>Review cards or blocks showing counts or recent lists.</li><li>Use direct links to the module where action is needed.</li><li>If a figure looks wrong, refresh or open the source module—the dashboard may show a subset.</li></ul>',
      },
      {
        id: 'navegacion',
        h: 'Navigation and side menu',
        html: '<p>The side menu groups all admin areas enabled for your institution. Missing items are usually <strong>disabled by module</strong> or role.</p><ul class="mb-0"><li>Confirm you are on the correct site if you manage several.</li><li>The top bar may include notifications, theme toggle, or profile access.</li><li>Return to the dashboard from any screen via the menu item.</li></ul>',
      },
      {
        id: 'flujo',
        h: 'Recommended workflow',
        html: '<ul class="mb-0"><li><strong>Morning:</strong> check new requests (protocol, animals, supplies) and institutional messages.</li><li><strong>Ongoing:</strong> keep order and reservation statuses updated so researchers see progress in “My forms” / “My reservations”.</li><li><strong>Month-end:</strong> billing and accounting history if your site uses them.</li></ul>',
      },
      {
        id: 'ayuda',
        h: 'If something does not behave as expected',
        html: '<p>Use the bottom bar <strong>“Open tutorial in Training”</strong> on the specific screen, or <strong>Help → Training</strong> for the manual by section. For technical issues: <strong>Help → Ticket/Contact</strong>.</p>',
      },
    ],
  },
  panel__dashboard: {
    summary:
      'Researcher home: quick access to protocols, requests, and communications.',
    roles:
      'Researchers and site users operating as such (roles 3, 5, 6 or others per institution). You only see modules the administrator enabled.',
    blocks: [
      {
        id: 'proposito',
        h: 'What you will find',
        html: '<p>Summary of your activity in GROBO: links to <strong>My protocols</strong>, <strong>Request center</strong>, <strong>My forms</strong>, messages or news per contract.</p><ul class="mb-0"><li>Ensure active protocols are valid before placing orders.</li><li>Dashboard alerts do not replace institutional email—use them as quick guidance.</li></ul>',
      },
      {
        id: 'pedidos',
        h: 'Orders and forms',
        html: '<p>Animal, reagent, or supply orders start in the <strong>Request center</strong> and are tracked in <strong>My forms</strong>. Status is updated by administration.</p><ul class="mb-0"><li>Save drafts for long forms.</li><li>Attach required documents to avoid returns.</li></ul>',
      },
      {
        id: 'red',
        h: 'If your institution works as a NETWORK',
        html: '<p>Multiple sites under one umbrella may share flows (forms, institutional messages, news). See the dedicated topic <strong>“Working in a NETWORK”</strong> in the training library.</p>',
      },
    ],
  },
  admin__usuarios: {
    summary:
      'Site user directory: create, edit, department, roles, and links to protocols and forms.',
    roles:
      'Site administration (typically roles 2 and 4). Master profile (1) may act in superadmin context; actions depend on internal policy.',
    blocks: [
      {
        id: 'lista',
        h: 'List and search',
        html: '<p>The grid usually supports search by name, surname, or username and filters by role or department.</p><ul class="mb-0"><li>Row click opens the <strong>user profile</strong>.</li><li>Exports (Excel/PDF) support audits—comply with personal data rules.</li><li>Do not share full lists outside the institution without authorization.</li></ul>',
      },
      {
        id: 'ficha',
        h: 'User profile',
        html: '<p>From the profile you can fix contact data, assign <strong>department</strong>, and review linked <strong>protocols</strong> and <strong>forms</strong> as exposed by the system.</p><ul class="mb-0"><li>Role changes can immediately change the visible menu—confirm with the person.</li><li>Password reset: follow your institution’s flow (recovery email, etc.).</li></ul>',
      },
      {
        id: 'vinculos',
        h: 'Protocols and traceability',
        html: '<p>Before removing or heavily changing a user, check they are not the sole owner of active protocols or responsible for open orders.</p>',
      },
    ],
  },
  admin__protocolos: {
    summary:
      'Operational management of protocols already in the platform: status, study data, species, and links to orders and housing.',
    roles:
      'Animal facility / compliance / technical secretariat per site. Not the same as the “Protocol requests” queue for new submissions.',
    blocks: [
      {
        id: 'diferencia',
        h: 'Protocols vs protocol request',
        html: '<p><strong>This screen</strong> manages protocols as <strong>working entities</strong> (validity, participants, limits). <strong>Protocol request</strong> is the flow to <strong>submit or change</strong> a protocol for committee or admin review.</p><ul class="mb-0"><li>To process a new submission, go to <strong>Administration → Protocol requests</strong>.</li><li>Here you adjust operational metadata and consistency with existing orders.</li></ul>',
      },
      {
        id: 'bandeja',
        h: 'Queue and filters',
        html: '<p>Search by title, internal code, investigator, or status. States depend on your site’s protocol configuration.</p><ul class="mb-0"><li>Check validity dates before authorizing consumption.</li><li>Attachments or versions may live in protocol detail or the related request.</li></ul>',
      },
      {
        id: 'acciones',
        h: 'Common actions',
        html: '<ul class="mb-0"><li>Activate/deactivate or set states reflecting institutional approval.</li><li>Fix admin data (without replacing ethical review—that is outside the tool).</li><li>Link or review species and limits that constrain animal orders and housing.</li></ul>',
      },
      {
        id: 'integracion',
        h: 'Integration with other modules',
        html: '<p><strong>Animal orders</strong>, <strong>housing</strong>, and part of <strong>billing</strong> read the protocol as reference. An expired or misconfigured protocol causes downstream rejections.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
    summary:
      'Protocol submission queue: new applications, renewals, or amendments that researchers send and admin/committee process in GROBO.',
    roles:
      'Administrative and compliance staff. The researcher starts the request from their area when enabled; you manage the response here.',
    blocks: [
      {
        id: 'flujo',
        h: 'Typical flow',
        html: '<ol class="mb-0 small"><li>The researcher completes the request form and uploads documents.</li><li>The request appears here as pending or equivalent.</li><li>Admin checks completeness, may request fixes, or advances status.</li><li>Once approved, the protocol is available under <strong>Protocols</strong> for daily operations.</li></ol>',
      },
      {
        id: 'revision',
        h: 'What to check per item',
        html: '<ul class="mb-0"><li>PI and co-investigators identification.</li><li>Species, procedures, and dates aligned with official approval.</li><li>Required files (IACUC/Ethics PDF, annexes).</li><li>Consistency with internal rules (department, cost center if applicable).</li></ul>',
      },
      {
        id: 'estados',
        h: 'Status and communication',
        html: '<p>Exact state names vary by configuration. Document internally what “ready for animal facility” means vs “ethics only”.</p><ul class="mb-0"><li>Use clear comments visible to the researcher.</li><li>If email notifications exist, ensure the user profile email is current.</li></ul>',
      },
    ],
  },
  admin__animales: {
    summary:
      'Live animal orders: intake, preparation, delivery status, and communication with the researcher.',
    roles:
      'Animal facility / purchasing / logistics per org chart.',
    blocks: [
      {
        id: 'grilla',
        h: 'Order list',
        html: '<p>Filter by protocol, requester, dates, status, or species. Prioritize orders with near need-by dates.</p><ul class="mb-0"><li>Open detail for quantities, sex, strain, and form notes.</li><li>Always cross-check <strong>valid protocol</strong> and authorized quotas.</li></ul>',
      },
      {
        id: 'estados',
        h: 'Status updates',
        html: '<ul class="mb-0"><li>Record milestones: in prep, ready for pickup, delivered, cancelled, etc.</li><li>Internal notes are for handoffs; notes to researchers should be understandable without internal jargon.</li><li>Before “delivered”, confirm required pickup logs per site policy.</li></ul>',
      },
      {
        id: 'trazabilidad',
        h: 'Traceability and errors',
        html: '<p>If an order was created against the wrong protocol, coordinate with protocol administration before forcing changes that break audit trails.</p>',
      },
    ],
  },
  admin__reactivos: {
    summary:
      'Reagent requests (separate from the generic supplies flow when configured that way).',
    roles:
      'Lab or reagent store administration.',
    blocks: [
      {
        id: 'uso',
        h: 'Using this screen',
        html: '<p>Keep statuses current so researchers see progress in <strong>My forms</strong>. Check unit, quantity, and storage conditions in detail.</p>',
      },
      {
        id: 'prioridad',
        h: 'Prioritization',
        html: '<ul class="mb-0"><li>Mark urgency from declared experiment dates.</li><li>Resolve first orders that block other modules.</li></ul>',
      },
    ],
  },
  admin__insumos: {
    summary:
      'General supply orders: preparation, stock, delivery, and closure.',
    roles:
      'Warehouse / purchasing / experimental supplies admin.',
    blocks: [
      {
        id: 'operativa',
        h: 'Daily operations',
        html: '<ul class="mb-0"><li>Confirm availability or purchase lead time before promising dates.</li><li>If substitutable, record the criterion in notes.</li><li>On delivery, update status to close the notification loop.</li></ul>',
      },
      {
        id: 'config',
        h: 'Link to configuration',
        html: '<p>Supply catalogs often live under <strong>Settings → Experimental supplies</strong>. If an order fails for an uncatalogued item, fix the master data first.</p>',
      },
    ],
  },
  admin__reservas: {
    summary:
      'Calendar and administration of room, equipment, or shared slot reservations.',
    roles:
      'Infrastructure admin or whoever centralizes facility scheduling.',
    blocks: [
      {
        id: 'vista',
        h: 'Views and conflicts',
        html: '<p>Check time overlaps and cancellation rules. Some sites require explicit admin approval for certain spaces.</p>',
      },
      {
        id: 'acciones',
        h: 'Create, move, or cancel',
        html: '<ul class="mb-0"><li>Document reasons for admin-imposed changes.</li><li>Notify the researcher if you change a booking from back-office.</li></ul>',
      },
    ],
  },
  admin__alojamientos: {
    summary:
      'Animal housing stays: cages, location, responsible persons, and closing billable periods.',
    roles:
      'Housing staff with permissions.',
    blocks: [
      {
        id: 'grilla',
        h: 'Housing grid',
        html: '<p>Each record links protocol, species, quantity, and date window. Use filters to match physical inventory.</p>',
      },
      {
        id: 'finalizar',
        h: 'Finalize and billing',
        html: '<p><strong>Finalizing</strong> or reopening affects how consumption rolls into billing. Check with finance before undoing closed periods.</p><ul class="mb-0"><li>History may show messages from the housing responsible when implemented.</li><li>QR or technical sheets may expose read-only data for visits.</li></ul>',
      },
    ],
  },
  admin__estadisticas: {
    summary:
      'Aggregated reports and charts (per active modules).',
    roles:
      'Facility leadership, quality, or admin needing indicators.',
    blocks: [
      {
        id: 'interpretacion',
        h: 'How to read the data',
        html: '<p>Totals depend on daily data quality (closed orders, finalized housing). Use wide date ranges for trends and short ones for operations.</p>',
      },
      {
        id: 'export',
        h: 'Export and share',
        html: '<p>When presenting outside the institution, anonymize and respect project confidentiality.</p>',
      },
    ],
  },
  admin__configuracion__config: {
    summary:
      'Site parameter hub—not a flat page: subsections (institution, species, reservations, roles, protocols, supplies, housing, etc.).',
    roles:
      'Authorized configuration staff only; master data changes are high impact.',
    blocks: [
      {
        id: 'mapa',
        h: 'Subsection map',
        html: '<ul class="mb-0"><li><strong>Institution / departments:</strong> identity and org structure.</li><li><strong>Species and categories:</strong> base for orders and housing.</li><li><strong>Reservations and spaces:</strong> rooms, equipment, usage rules.</li><li><strong>Form types / supplies:</strong> what each profile can request.</li><li><strong>Protocols:</strong> templates, states, or local validations.</li><li><strong>Housing:</strong> physical locations, associated fees if any.</li><li><strong>Users and roles:</strong> sometimes linked to global user management.</li></ul>',
      },
      {
        id: 'riesgos',
        h: 'Risks when changing parameters',
        html: '<p>A change to species or form types can invalidate drafts. Plan maintenance windows and warn key users.</p>',
      },
      {
        id: 'documentar',
        h: 'Good practice',
        html: '<p>Keep an external log (internal wiki) of “what each state means” and who authorized critical changes for audits.</p>',
      },
    ],
  },
  panel__formularios: {
    summary:
      'Entry point to request forms (animals, reagents, supplies). May show sub-routes or cards per contract.',
    roles:
      'Researchers and users authorized to submit requests.',
    blocks: [
      {
        id: 'subsecciones',
        h: 'Typical subsections',
        html: '<ul class="mb-0"><li><strong>Animal request:</strong> pick valid protocol, species, quantities, dates; attachments may be required.</li><li><strong>Reagent request:</strong> catalogue or free text per configuration.</li><li><strong>Supply request:</strong> warehouse line items.</li></ul>',
      },
      {
        id: 'antes',
        h: 'Before submitting',
        html: '<ul class="mb-0"><li>Confirm the <strong>protocol</strong> is approved and valid under <strong>My protocols</strong>.</li><li>Check species/authorization limits.</li><li>Save a draft if you must consult the project lead.</li></ul>',
      },
      {
        id: 'despues',
        h: 'After submission',
        html: '<p>Track status in <strong>My forms</strong>: states, admin comments, and possible requests for fixes.</p>',
      },
    ],
  },
  panel__misformularios: {
    summary:
      'Unified history of all your requests with status and detail.',
    roles:
      'Any user who submitted forms.',
    blocks: [
      {
        id: 'filtros',
        h: 'Filters and reading statuses',
        html: '<p>Filter by type, dates, or text to find old orders. Status is the operational source of truth; if “pending” too long, contact the facility via <strong>Messages</strong> or the official channel.</p>',
      },
      {
        id: 'detalle',
        h: 'Detail and attachments',
        html: '<ul class="mb-0"><li>Open the item for lines, notes, and files.</li><li>Keep notification emails if your site uses them as proof.</li></ul>',
      },
    ],
  },
  panel__misalojamientos: {
    summary:
      'Housing you participate in as researcher: dates, protocol, status.',
    roles:
      'Researchers with housed animals or protocol-linked housing.',
    blocks: [
      {
        id: 'consulta',
        h: 'Consultation',
        html: '<p>Use this list to plan experiments and renewals. If data disagrees with the facility, open a message referencing the housing code.</p>',
      },
    ],
  },
  panel__misreservas: {
    summary:
      'Your room or equipment reservations: times, status, cancellation policy.',
    roles:
      'Users with reservation permission.',
    blocks: [
      {
        id: 'gestion',
        h: 'Management',
        html: '<ul class="mb-0"><li>Cancel early per site rules to free the slot.</li><li>For recurring series, check if the UI supports it or ask admin.</li></ul>',
      },
    ],
  },
  panel__misprotocolos: {
    summary:
      'Protocols where you are a member: validity, key data, and basis for new orders.',
    roles:
      'Researchers and collaborators per protocol assignment.',
    blocks: [
      {
        id: 'consulta',
        h: 'Always review',
        html: '<ul class="mb-0"><li>Authorization start and end dates.</li><li>Allowed species and procedures.</li><li>Roles (PI, co-investigator).</li></ul>',
      },
      {
        id: 'solicitud',
        h: 'Renewals and changes',
        html: '<p>To extend validity or change scope, the admin path is usually <strong>Protocol request</strong> (from your profile or a site-enabled link), not a standalone animal order.</p><ul class="mb-0"><li>While a submission is pending, new orders may be restricted—ask committee secretariat or facility.</li></ul>',
      },
      {
        id: 'vinculo',
        h: 'NETWORK link',
        html: '<p>In multi-site institutions, protocol scope is defined by administration. Place orders against the correct site per internal rules.</p>',
      },
    ],
  },
  admin__precios: {
    summary:
      'Maintenance of rates and price lists used in billing or service estimates.',
    roles:
      'Finance or facility per delegation.',
    blocks: [
      {
        id: 'cambios',
        h: 'Price changes',
        html: '<p>Versioning and effective dates: a wrong date can misalign already issued invoices. Coordinate with <strong>Accounting history</strong> and open reports.</p>',
      },
    ],
  },
  admin__facturacion__index: {
    summary:
      'Accounting module: reports by department, investigator, protocol, or organization per deployment.',
    roles:
      'Users with billing module enabled.',
    blocks: [
      {
        id: 'subvistas',
        h: 'Common subsections',
        html: '<ul class="mb-0"><li><strong>By department:</strong> charges grouped by academic or admin unit.</li><li><strong>By investigator:</strong> useful to allocate costs to groups or funds.</li><li><strong>By protocol:</strong> aligns spend with projects and grant compliance.</li><li><strong>Organization / summary:</strong> executive view when available.</li></ul>',
      },
      {
        id: 'pdf',
        h: 'PDF, adjustments, and closing',
        html: '<p>PDFs or exports are often by period. Manual adjustments should be justified in accounting history or notes per policy.</p>',
      },
    ],
  },
  admin__historialcontable: {
    summary:
      'Log of accounting movements and corrections linked to the facility.',
    roles:
      'Finance or admin with audit duties.',
    blocks: [
      {
        id: 'auditoria',
        h: 'Audit use',
        html: '<p>Filter by date, user, or movement type. Do not delete evidence outside approved procedures; prefer reversing entries if supported.</p>',
      },
    ],
  },
  panel__mensajes: {
    summary:
      'Personal messaging between platform users (1:1 or threaded).',
    roles:
      'All profiles with the messages module active.',
    blocks: [
      {
        id: 'hilo',
        h: 'Create and follow threads',
        html: '<ul class="mb-0"><li>Pick recipient and a clear subject (e.g. “Order A-1234 — delivery question”).</li><li>Keep one thread per topic.</li><li>Check whether you receive email alerts per profile settings.</li></ul>',
      },
    ],
  },
  panel__mensajes_institucion: {
    summary:
      'Institutional channel for formal communication between sites or internal broadcast, distinct from personal chat.',
    roles:
      'Those with the module; often admins send and everyone reads.',
    blocks: [
      {
        id: 'red',
        h: 'Messages and NETWORK',
        html: '<p>In multi-site networks, use it for announcements to linked users or official comms. Keep posts short with links to news or document repositories.</p>',
      },
    ],
  },
  admin__comunicacion__noticias: {
    summary:
      'Publish and maintain portal news (closures, calls, notices).',
    roles:
      'Communications or administration.',
    blocks: [
      {
        id: 'publicar',
        h: 'Publish carefully',
        html: '<ul class="mb-0"><li>Visible validity dates so old notices do not confuse.</li><li>Institutional tone and contact for questions.</li><li>Check spelling and links before publishing.</li></ul>',
      },
    ],
  },
  panel__noticias: {
    summary:
      'News board for researchers and staff.',
    roles:
      'Any user with portal news access.',
    blocks: [
      {
        id: 'lectura',
        h: 'How to use it',
        html: '<p>Check regularly; some service cuts or calls are announced only here. Email may not duplicate automatically.</p>',
      },
    ],
  },
  panel__perfil: {
    summary:
      'Personal data, preferences (language, theme), sometimes password or photo.',
    roles:
      'All authenticated users.',
    blocks: [
      {
        id: 'datos',
        h: 'Data and preferences',
        html: '<ul class="mb-0"><li>Keep <strong>email</strong> and <strong>phone</strong> current for notifications and recovery.</li><li><strong>Language</strong> affects UI labels and may sync with server preference.</li><li><strong>Theme</strong> light/dark improves long reading sessions.</li></ul>',
      },
    ],
  },
  panel__soporte: {
    summary:
      'Tickets to product support (Gecko): one conversation turn at a time until the next reply.',
    roles:
      'Profiles with help/ticket menu enabled.',
    blocks: [
      {
        id: 'buenas',
        h: 'How to open a useful ticket',
        html: '<ul class="mb-0"><li>Short subject naming the module (e.g. “Reservations — save error”).</li><li>First message: steps to reproduce, screenshot if possible, browser and role.</li><li>One ticket per distinct issue—do not mix topics.</li></ul>',
      },
      {
        id: 'turnos',
        h: 'Turns and closure',
        html: '<p>When support replies, you can send your turn or close if resolved. Each message notifies support by email.</p>',
      },
    ],
  },
  panel__ventas: {
    summary:
      'Commercial contact with GROBO: a single email to the sales team (not a technical support ticket).',
    roles:
      'Users with Help → Sales. A valid email on My profile is required.',
    blocks: [
      {
        id: 'proposito',
        h: 'What this screen is for',
        html: '<p>Use it for <strong>quotes</strong>, subscription questions, or positive feedback. The message goes to <strong>ventas@groboapp.com</strong> with category <strong>sales</strong> (venta).</p><ul class="mb-0"><li>Do not use it for system bugs: use <strong>Help → Ticket/Contact</strong> (Gecko support).</li><li>You may mention timelines, modules, or <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
      },
      {
        id: 'lista_ui',
        h: 'What you see on screen (UI checklist)',
        html: '<ul class="mb-0"><li><strong>Intro text:</strong> context and benefits.</li><li><strong>“We will reply to”:</strong> shows your profile email; sales replies there.</li><li><strong>Message area:</strong> one text field (minimum 10 characters).</li><li><strong>Send button:</strong> calls the API; the button may show a loading state.</li></ul>',
      },
      {
        id: 'popup',
        h: 'Success / error popup',
        html: '<p>After a successful send, a <strong>dialog</strong> (SweetAlert) usually confirms success, the destination address, and that the reply will go to your user email.</p><ul class="mb-0"><li>Missing profile email or short text triggers a warning.</li><li>Server errors show a generic message—retry later.</li></ul>',
      },
    ],
  },
  panel__capacitacion: {
    summary:
      'This library: manual structured like your side menu routes.',
    roles:
      'Whoever has Help → Training.',
    blocks: [
      {
        id: 'como',
        h: 'How to get the most from it',
        html: '<ul class="mb-0"><li>Use the left list—you only see topics for modules your role can open.</li><li>Each topic may use <strong>accordion sections</strong>: read in order the first time.</li><li>The bottom bar on other screens deep-links to that screen’s topic.</li><li>Browser find (Ctrl+F) helps inside long topics.</li></ul>',
      },
      {
        id: 'roles',
        h: 'Why some topics are missing',
        html: '<p>If a section is absent, your institution did not assign that module or menu item. Ask site admin for access or a broader user.</p>',
      },
    ],
  },
  capacitacion__tema__red: {
    summary:
      'Conceptual guide for institutions operating as a NETWORK: multiple sites under one umbrella with shared or routed flows.',
    roles:
      'All profiles; practical use depends on how sites, modules, and permissions are configured.',
    blocks: [
      {
        id: 'concepto',
        h: 'What the NETWORK means in GROBO',
        html: '<p>Not a “social network”: an <strong>organizational model</strong> where several sites share framework (brand, contract, policies) but may have their own facilities, price lists, and admins.</p><ul class="mb-0"><li>Each user still belongs to a concrete <strong>institution/site</strong> for data and menu.</li><li>Some flows allow <strong>routing</strong> orders or messages between sites when configuration and permissions allow.</li></ul>',
      },
      {
        id: 'formularios',
        h: 'Forms and orders across sites',
        html: '<p>Researchers usually place orders against protocols and rules of <strong>their</strong> site. If execution must happen at another network site, follow internal procedure (institutional message, specific field, or admin routing). Do not assume the system ships goods to another city without human validation.</p>',
      },
      {
        id: 'mensajes',
        h: 'Personal vs institutional messages',
        html: '<ul class="mb-0"><li><strong>Messages:</strong> person-to-person coordination.</li><li><strong>Institutional messaging:</strong> official notices; in a NETWORK may communicate cross-site priorities.</li></ul>',
      },
      {
        id: 'noticias',
        h: 'Local news and scope',
        html: '<p>News may be portal-wide or segmented—check whether it affects only one site.</p>',
      },
      {
        id: 'protocolos',
        h: 'Protocols in a NETWORK',
        html: '<p>A protocol may be limited to one site or have annexes authorizing collaboration. Submissions follow the relevant committee; the NETWORK does not replace ethics approval.</p>',
      },
      {
        id: 'facturacion',
        h: 'Billing and traceability',
        html: '<p>Accounting reports usually filter by site or department. In a NETWORK, ensure costs are not duplicated across sites for the same project.</p>',
      },
      {
        id: 'buenas',
        h: 'Good practices',
        html: '<ul class="mb-0"><li>Always state <strong>site</strong> and <strong>internal code</strong> in messages and orders.</li><li>Document cross-site agreements outside the software when required.</li><li>If unsure about permission to use another site’s data, ask your local admin first.</li></ul>',
      },
    ],
  },
};
