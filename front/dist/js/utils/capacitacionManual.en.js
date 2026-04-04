/**
 * Training manual (EN): chapters by menu path slug.
 * Block fields: id, h, html, optional icon (Bootstrap Icons name), optional cat (i18n capacitacion.cat_<cat>).
 */
export const CHAPTERS = {
  admin__dashboard: {
    overview:
      'This is usually the first screen administrators see after signing in to GROBO. It helps you see what needs attention and jump quickly to protocols, orders, reservations, messages, and other day‑to‑day areas.\n\nThink of it as a control panel, not the place where every task is finished: numbers and cards summarize work that continues in the dedicated modules. The sections below walk through the side menu, the top bar, and how to read dashboard tiles without confusing them with full queues.',
    summary:
      'Admin home: quick view of activity, shortcuts to critical modules, and operational reminders.',
    roles:
      'Users with the administrative menu (typically master profile in institution context, site superadmin, site admin). Visible items depend on contracted modules and permissions.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'info-circle',
        h: 'What this screen is',
        html: '<p>Your <strong>landing page</strong> after admin login: it summarizes what is urgent and gives quick links. It <strong>does not replace</strong> full queues for protocols, orders, or reservations—open those modules for detail and bulk work.</p>',
      },
      {
        id: 'nav_marco',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Side menu (each item)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-house-door text-success" aria-hidden="true"></i> Panel / Home / Dashboard</dt><dd>Returns to this dashboard view.</dd><dt><i class="bi bi-people text-success" aria-hidden="true"></i> Users</dt><dd>Opens the site account and role directory.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocols / Protocol requests</dt><dd>Operational management or submission queue depending on the exact menu label.</dd><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Animals, reagents, supplies</dt><dd>Order queues by type (if the module is contracted).</dd><dt><i class="bi bi-calendar-week text-success" aria-hidden="true"></i> Reservations / Housing</dt><dd>Scheduling and infrastructure or vivarium stays.</dd><dt><i class="bi bi-bar-chart-line text-success" aria-hidden="true"></i> Statistics</dt><dd>Indicators and aggregated reports.</dd><dt><i class="bi bi-gear text-success" aria-hidden="true"></i> Settings</dt><dd>Configuration hub (submenus).</dd><dt><i class="bi bi-currency-dollar text-success" aria-hidden="true"></i> Prices / Billing / Accounting history</dt><dd>Financial module when enabled.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> News (admin)</dt><dd>Publishes portal announcements.</dd><dt><i class="bi bi-question-circle text-success" aria-hidden="true"></i> Help (Training, Ticket, Sales)</dt><dd>Manual and tutorials for everyone; <strong>Ticket/Contact</strong> (Gecko Support) is usually for <strong>administrative</strong> profiles only, for application failures; <strong>Sales</strong> is commercial contact.</dd></dl><p class="small text-muted mt-2 mb-0">Items you <strong>do not see</strong> are usually hidden by <strong>module</strong> or <strong>role</strong>.</p>',
      },
      {
        id: 'nav_superior',
        cat: 'navigation',
        icon: 'window',
        h: 'Top bar (common icons)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Bell / Notifications</dt><dd>Opens or previews recent alerts (per your site).</dd><dt><i class="bi bi-brightness-high text-success" aria-hidden="true"></i> Light / dark theme</dt><dd>Toggles UI contrast when available.</dd><dt><i class="bi bi-globe2 text-success" aria-hidden="true"></i> Language</dt><dd>Changes interface language when a global selector exists.</dd><dt><i class="bi bi-person-circle text-success" aria-hidden="true"></i> Profile / user</dt><dd>Access to <strong>My profile</strong>, sign-out, or account data.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institution / site</dt><dd>If you manage multiple sites, pick context here when applicable.</dd></dl>',
      },
      {
        id: 'dash_bloques',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Dashboard blocks (cards, numbers, lists)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-graph-up-arrow text-success" aria-hidden="true"></i> Counters and KPIs</dt><dd>Numbers summarizing pending work (requests, orders, messages). A click usually opens the related module or filtered queue.</dd><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Quick-access cards</dt><dd>Visual shortcuts to a submodule—same destination as choosing it in the side menu.</dd><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> “Recent activity” lists</dt><dd>Show a subset; use <strong>View all</strong> or the side menu for the full list when available.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads dashboard data without a full page reload when a button exists.</dd></dl><p class="small text-muted mt-2 mb-0">If a figure looks wrong, open the source module and use its filters—the dashboard may be a summary only.</p>',
      },
      {
        id: 'flujo',
        cat: 'content',
        icon: 'diagram-3',
        h: 'Recommended daily flow',
        html: '<ol class="mb-0 small"><li><strong>Start:</strong> review protocol requests, orders, and institutional messages.</li><li><strong>Operations:</strong> process queues in the order agreed with your facility (e.g. protocols before releasing animal orders).</li><li><strong>Wrap-up:</strong> check conflicting reservations, housing to bill, and billing views if applicable.</li></ol>',
      },
      {
        id: 'fab_otras',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'On other screens: green bottom bar',
        html: '<p>Outside this dashboard, many pages show a <strong>fixed bottom bar</strong> with <strong>“View help document”</strong> (manual for that screen) and <strong>“Interactive tutorial”</strong> (spotlight walkthrough when defined for the route).</p><ul class="mb-0"><li>Technical issues: <strong>Help → Ticket/Contact</strong>.</li><li>Full manual by menu: <strong>Help → Training</strong>.</li></ul>',
      },
    ],
  },
  panel__dashboard: {
    overview:
      'If you use GROBO to place orders or follow protocols and messages, this is your welcome screen. It gathers shortcuts to what researchers and technicians use most often.\n\nThe side menu remains the full map of the system; here you get a faster visual path. If a module is missing, your site has not enabled it or your role cannot access it—that is expected, not a bug.',
    summary:
      'Researcher home: quick access to protocols, requests, and communications.',
    roles:
      'Researchers and site users operating as such (roles 3, 5, 6 or others per institution). You only see modules the administrator enabled.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'house-door',
        h: 'What the researcher panel is',
        html: '<p>Your <strong>entry view</strong> after login: shortcuts to what you use daily (orders, protocols, messages). The side menu only lists modules <strong>enabled</strong> for your user.</p>',
      },
      {
        id: 'nav_lateral',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Side menu (common items)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-ui-checks text-success" aria-hidden="true"></i> Request center / Forms</dt><dd>Starts new animal, reagent, or supply requests per contract.</dd><dt><i class="bi bi-card-list text-success" aria-hidden="true"></i> My forms</dt><dd>History and status of everything you submitted.</dd><dt><i class="bi bi-file-earmark-medical text-success" aria-hidden="true"></i> My protocols</dt><dd>Validity and study data that authorize your orders.</dd><dt><i class="bi bi-house-heart text-success" aria-hidden="true"></i> My housing / My reservations</dt><dd>Your stays or schedule.</dd><dt><i class="bi bi-chat-dots text-success" aria-hidden="true"></i> Messages / Institutional messaging</dt><dd>1:1 chat or official notices.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> News</dt><dd>Institution bulletin.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> My profile</dt><dd>Details, language, theme, and notification email.</dd></dl>',
      },
      {
        id: 'dash_tarjetas',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Dashboard cards and shortcuts',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Direct links (tiles)</dt><dd>Each card opens the listed module—same as picking it in the menu.</dd><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Reminders</dt><dd>May show protocol expiry or items needing correction.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads dashboard data when the button exists.</dd></dl>',
      },
      {
        id: 'pedidos',
        cat: 'content',
        icon: 'clipboard-check',
        h: 'Orders: where they start and where to track them',
        html: '<ul class="mb-0"><li><strong>Create:</strong> <em>Request center</em> → pick form type and complete required fields.</li><li><strong>Track:</strong> <em>My forms</em> → open the item for status, facility notes, and attachments.</li><li>Exact labels for <strong>Submit</strong> / <strong>Save draft</strong> may vary; use draft if you must consult your team first.</li></ul>',
      },
      {
        id: 'fab',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'Green bottom bar (on other screens)',
        html: '<p>On screens such as <strong>My forms</strong> or the <strong>Request center</strong>, the fixed bar offers <strong>View help document</strong> and, when available, <strong>Interactive tutorial</strong>.</p><figure class="manual-cap-figure my-3 border rounded overflow-hidden"><img src="../../dist/img/capacitacion/panel-barra-ayuda-inferior.svg" width="640" height="120" alt="Diagram: green strip fixed at the bottom of the window with help shortcuts." class="img-fluid d-block w-100" style="max-height:140px;object-fit:contain" loading="lazy" decoding="async" /><figcaption class="small text-body-secondary px-3 py-2 border-top">Schematic bottom bar only; no user data or real screenshot.</figcaption></figure>',
      },
      {
        id: 'red',
        cat: 'links',
        icon: 'share',
        h: 'NETWORK institutions',
        html: '<p>If your organization spans multiple sites, also read <strong>Working in a NETWORK</strong>. Menus and routing may differ by site.</p>',
      },
    ],
  },
  admin__usuarios: {
    overview:
      'Users and roles is where you manage who can sign in to GROBO, with which permissions, and in which department they appear. It is also the usual place to review contact details and reset access according to local policy.\n\nThis is an administration tool, not a social directory. Available actions depend on your role and institutional rules. Treat exports that contain personal data according to privacy regulations.',
    summary:
      'Site user directory: create, edit, department, roles, and links to protocols and forms.',
    roles:
      'Site administration (typically roles 2 and 4). Master profile (1) may act in superadmin context; actions depend on internal policy.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'people',
        h: 'Purpose of Users and roles',
        html: '<p class="mb-0">Manage <strong>who can sign in</strong> to GROBO, their <strong>role</strong>, <strong>department</strong>, and links to <strong>protocols</strong> and <strong>orders</strong>. Exact button labels may differ slightly by site.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-door-open text-success" aria-hidden="true"></i> Access and role</dt><dd>Who may log in at this site and at what permission level in the menu.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Department or unit</dt><dd>Where the person is listed for organization and grid filters.</dd><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Protocols and orders</dt><dd>How the account ties to ongoing procedures and forms; affects what they see and can request.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Typical top toolbar buttons',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> New user / Add / Invite</dt><dd>Opens the form or wizard to create an account or send an invitation.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh list</dt><dd>Reloads the grid from the server.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Export Excel / CSV</dt><dd>Downloads a tabular file for audits—follow data-protection rules.</dd><dt><i class="bi bi-file-earmark-pdf text-success" aria-hidden="true"></i> Export PDF / Print list</dt><dd>Generates PDF or print view per your template.</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Download / Template</dt><dd>Some sites provide a bulk user template here.</dd><dt><i class="bi bi-upload text-success" aria-hidden="true"></i> Import users</dt><dd>When enabled, uploads a validated file; <strong>confirmation dialogs</strong> often summarize valid rows and errors.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filters and search field',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Text search</dt><dd>Filters by name, surname, username, email, or ID as indexed by your site. Press <kbd>Enter</kbd> or the magnifier if shown.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Role filter</dt><dd>Shows only Admin, Researcher, Lab, etc.—useful for permission audits.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Department filter</dt><dd>Limits the list to one organizational unit.</dd><dt><i class="bi bi-toggle-on text-success" aria-hidden="true"></i> Active only / Include inactive</dt><dd>Some UIs expose disabled or historical accounts.</dd><dt><i class="bi bi-x-lg text-success" aria-hidden="true"></i> Clear filters</dt><dd>Resets criteria to the full list allowed for your role.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'User table (columns and sorting)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-down-up text-success" aria-hidden="true"></i> Sortable headers</dt><dd>Click a column to sort ascending/descending when an icon is shown.</dd><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Role column</dt><dd>Shows primary access level; multiple badges may appear for complex setups.</dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Email / contact</dt><dd>Keep it current—notifications and password reset depend on it.</dd><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Pencil icon on row</dt><dd>Shortcut to edit or open the profile without clicking the whole row.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Row click and action menu',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Row click</dt><dd>Opens the full <strong>user record</strong> with tabs or sections.</dd><dt><i class="bi bi-three-dots-vertical text-success" aria-hidden="true"></i> Context menu (⋮)</dt><dd>May include <strong>Edit</strong>, <strong>Reset password</strong>, <strong>Deactivate</strong>, <strong>View history</strong> per permissions.</dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Reset / send link</dt><dd>Triggers email or password flow—verify identity first.</dd><dt><i class="bi bi-person-x text-success" aria-hidden="true"></i> Deactivate / block</dt><dd>Stops new sign-ins; data is usually kept for traceability. May require a <strong>confirmation</strong> modal.</dd></dl>',
      },
      {
        id: 'ficha',
        cat: 'detail',
        icon: 'card-heading',
        h: 'Inside the user record',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Save / Apply</dt><dd>Persists personal data and assignments. Validation errors highlight fields or show inline messages.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Back / Close</dt><dd>Returns to the list; unsaved changes may warn before leaving.</dd><dt><i class="bi bi-diagram-3 text-success" aria-hidden="true"></i> Protocols / Forms tab</dt><dd>Shows operational links—check before deleting users or changing roles drastically.</dd></dl><p class="small text-muted mt-2 mb-0"><strong>Role</strong> changes may affect the menu <strong>on next login</strong> or immediately depending on configuration.</p>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Common pop-up dialogs',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Delete or deactivate confirmation</dt><dd>Explains impact (loss of access, historical data). Read before accepting.</dd><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Save success</dt><dd>Confirms persistence; may offer return to list.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Permission or conflict error</dt><dd>Your role cannot perform the action or another user changed the record—retry or escalate.</dd></dl>',
      },
      {
        id: 'vinculos',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Good practice and traceability',
        html: '<ul class="mb-0"><li>Before <strong>removing</strong> a user, confirm they are not the sole PI on active protocols.</li><li>Do not share exports with personal data outside the institution without legal basis.</li><li>Document sensitive role changes (e.g. promotion to Admin) per your procedure.</li></ul>',
      },
    ],
  },
  admin__protocolos: {
    overview:
      'This module is the working area for protocols that already exist in GROBO: validity, permitted species, participants, and states that control whether animal orders and other requests are allowed.\n\nIt is different from “Protocol requests”, which holds new submissions still under review. Changes here can affect orders and housing, so review carefully before confirming updates.',
    summary:
      'Operational management of protocols already in the platform: status, study data, species, and links to orders and housing.',
    roles:
      'Animal facility / compliance / technical secretariat per site. Not the same as the “Protocol requests” queue for new submissions.',
    blocks: [
      {
        id: 'diferencia',
        cat: 'navigation',
        icon: 'signpost-split',
        h: 'Protocols (this screen) vs Protocol requests',
        html: '<p><strong>Here</strong> you work on protocols already in the system: validity, species, participants, operational limits. <strong>Protocol requests</strong> is the <strong>submission queue</strong> for new applications or renewals still under review.</p><ul class="mb-0"><li>Side menu <strong>Protocol requests</strong> → incoming workflow items.</li><li>This grid → lifecycle maintenance after approval or activation.</li></ul>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Toolbar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> New protocol (manual)</dt><dd>Rare: only if your site allows direct creation outside the request flow.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads statuses from the server.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Export list</dt><dd>Downloads the filtered view for committees or audits.</dd><dt><i class="bi bi-printer text-success" aria-hidden="true"></i> Print / PDF</dt><dd>Printable grid or record per template.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Queue filters',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Global search</dt><dd>By title, internal code, or keywords.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Principal investigator</dt><dd>Protocols where they are responsible.</dd><dt><i class="bi bi-toggle2-on text-success" aria-hidden="true"></i> Operational state</dt><dd>Active, suspended, expired, under renewal, etc.</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Validity range</dt><dd>Find upcoming expiries.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Grid columns',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bookmark text-success" aria-hidden="true"></i> Code / reference</dt><dd>Unique ID to cross with orders and housing.</dd><dt><i class="bi bi-calendar-event text-success" aria-hidden="true"></i> Start and end validity</dt><dd>Determines whether researchers can order animals or housing days.</dd><dt><i class="bi bi-bug text-success" aria-hidden="true"></i> Authorized species</dt><dd>Summary or link to per-species limits.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Open protocol and record actions',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Edit admin data</dt><dd>Fix title, department, cost centers—does not replace external ethics approval.</dd><dt><i class="bi bi-pause-btn text-success" aria-hidden="true"></i> Suspend / reactivate</dt><dd>Blocks new orders while issues are resolved.</dd><dt><i class="bi bi-diagram-2 text-success" aria-hidden="true"></i> Participants</dt><dd>Add/remove co-investigators or authorized staff per rules.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Documentation</dt><dd>Supporting PDFs (IACUC, amendments).</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Common confirmations',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Validity change</dt><dd>May warn that open orders fall out of scope.</dd><dt><i class="bi bi-check-lg text-success" aria-hidden="true"></i> Save species / quotas</dt><dd>Validates quantities against internal policy.</dd></dl>',
      },
      {
        id: 'integracion',
        cat: 'content',
        icon: 'link-45deg',
        h: 'Impact on other modules',
        html: '<p><strong>Animal orders</strong> and <strong>housing</strong> check protocol validity live. <strong>Billing</strong> may roll up costs by protocol. Errors here propagate to those queues.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
    overview:
      'Here you handle protocol submissions that are still in progress: new studies, renewals, or changes that must be reviewed before they become active in the main Protocols area.\n\nIt helps committees and admin keep a clear pipeline. Exact state names depend on your configuration; the important distinction is “queue of submissions” versus “day‑to‑day maintenance of approved protocols”.',
    summary:
      'Protocol submission queue: new applications, renewals, or amendments that researchers send and admin/committee process in GROBO.',
    roles:
      'Administrative and compliance staff. The researcher starts the request from their area when enabled; you manage the response here.',
    blocks: [
      {
        id: 'flujo',
        cat: 'navigation',
        icon: 'diagram-3',
        h: 'Typical flow',
        html: '<ol class="mb-0 small"><li>The researcher completes the request form and uploads documents.</li><li>The request appears here as pending or equivalent.</li><li>Admin checks completeness, may request fixes, or advances status.</li><li>Once approved, the protocol is available under <strong>Protocols</strong> for daily operations.</li></ol>',
      },
      {
        id: 'revision',
        cat: 'forms',
        icon: 'file-earmark-medical',
        h: 'What to check per item',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> PI and team</dt><dd>Identification of PI and co-investigators.</dd><dt><i class="bi bi-heart-pulse text-success" aria-hidden="true"></i> Scientific scope</dt><dd>Species, procedures, and dates aligned with official approval.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Attachments</dt><dd>IACUC/ethics PDF, required annexes, allowed formats.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institutional data</dt><dd>Department, cost center, or local fields per policy.</dd></dl>',
      },
      {
        id: 'estados',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Status and communication',
        html: '<p>Exact <strong>status</strong> names vary by configuration. Document internally what “ready for animal facility” means vs “ethics only”.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Comments to researcher</dt><dd>Use plain language; usually visible in their tracking view.</dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Email</dt><dd>If automatic notifications exist, ensure profile email is current.</dd><dt><i class="bi bi-window-stack text-success" aria-hidden="true"></i> Return for fixes</dt><dd>Return with a concrete reason to avoid back-and-forth.</dd></dl>',
      },
    ],
  },
  admin__animales: {
    overview:
      'The animal orders queue tracks each live‑animal request from submission through preparation and delivery, including statuses and notes that researchers may see depending on settings.\n\nUse filters to find a protocol or investigator quickly. Opening a row shows the full case and the actions your role allows.',
    summary:
      'Live animal orders: intake, preparation, delivery status, and communication with the researcher.',
    roles:
      'Animal facility / purchasing / logistics per org chart.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'rabbit',
        h: 'Role of the animal orders queue',
        html: '<p>Runs the <strong>operational cycle</strong> of each live-animal order from intake to delivery or cancellation. This is the admin counterpart to what researchers see in <strong>My forms</strong>.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Top toolbar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads in-flight orders.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Export</dt><dd>Filtered list for logistics or purchasing.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Advanced filters</dt><dd>Some sites use a side panel or modal.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Typical filters',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Order number</dt><dd>Find a case cited by the researcher.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocol</dt><dd>Orders tied to that code only.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Requester</dt><dd>Filter by submitting user or PI.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Status</dt><dd>Pending, in prep, ready for pickup, delivered, cancelled, etc.</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Required date</dt><dd>Prioritize near experiment dates.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Order grid',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-gender-ambiguous text-success" aria-hidden="true"></i> Sex and strain</dt><dd>Must match protocol authorization.</dd><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Quantity</dt><dd>Cross-check quotas and vivarium capacity.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> View detail</dt><dd>Opens the full record with lines, notes, and attachments.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Actions inside an order',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Change status</dt><dd>Dropdown or step buttons advancing workflow.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Note to researcher</dt><dd>Visible on their detail view—use plain language.</dd><dt><i class="bi bi-lock text-success" aria-hidden="true"></i> Internal note</dt><dd>Staff-only for shift handoffs.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Reject / cancel</dt><dd>Usually requires reason and confirmation.</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Confirmation dialogs',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Mark delivered</dt><dd>May confirm quantity picked up and receiving person.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Protocol reassignment</dt><dd>If allowed, follow your audit procedure.</dd></dl>',
      },
      {
        id: 'trazabilidad',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Traceability and errors',
        html: '<p>If an order is tied to the <strong>wrong protocol</strong>, do not force fixes without coordinating with <strong>Protocols</strong>—billing and compliance may be affected.</p>',
      },
    ],
  },
  admin__reactivos: {
    overview:
      'Some sites keep reagent or biological material requests in a dedicated queue instead of the general supplies flow. If you see this module, manage those requests here.\n\nThe pattern matches other queues: filterable list, row detail, and role‑based actions. If everything was merged into “Supplies”, this menu item may be absent.',
    summary:
      'Reagent requests (separate from the generic supplies flow when configured that way).',
    roles:
      'Lab or reagent store administration.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'droplet-half',
        h: 'Role of the reagents queue',
        html: '<p>Handles <strong>reagent or biological material</strong> requests when your site splits them from general supplies. This is the admin counterpart to what researchers track in <strong>My forms</strong>. Keep statuses current and verify <strong>unit</strong>, <strong>quantity</strong>, and <strong>storage conditions</strong> in detail.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Top toolbar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads the list and in-flight statuses.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Export</dt><dd>Filtered list for store or purchasing (if available).</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Advanced filters</dt><dd>May live in a side panel or modal.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Typical filters',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Order number / reference</dt><dd>Find a case cited by the researcher.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocol</dt><dd>Orders tied to that code only.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Requester</dt><dd>Filter by who submitted the form.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Status</dt><dd>Pending, in prep, delivered, cancelled, etc.</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Required date</dt><dd>Prioritize declared experiment timelines.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Order grid',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-box-seam text-success" aria-hidden="true"></i> Item / catalog</dt><dd>Reagent name or code from your master data.</dd><dt><i class="bi bi-sort-numeric-down text-success" aria-hidden="true"></i> Quantity and unit</dt><dd>Must match approval and warehouse records.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> View detail</dt><dd>Opens lines, notes, and attachments from the form.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Actions in detail',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Change status</dt><dd>Advances workflow per your taxonomy.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Note to researcher</dt><dd>Visible on their detail view.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Reject / cancel</dt><dd>Often requires reason and confirmation dialog.</dd></dl>',
      },
      {
        id: 'prioridad',
        cat: 'content',
        icon: 'lightning-charge',
        h: 'Prioritization and consistency',
        html: '<ul class="mb-0"><li>Mark <strong>urgency</strong> from declared experiment dates.</li><li>Resolve first orders that <strong>block</strong> other modules (e.g. assay needing reagent before animals).</li><li>If your site merged reagents into <strong>Supplies</strong>, use that queue; this page applies only when both appear in the menu.</li></ul>',
      },
    ],
  },
  admin__insumos: {
    overview:
      'Supplies covers general laboratory consumable requests: preparing, delivering, updating status, and messaging when something must be clarified.\n\nEach row is usually one order; opening it shows detail and allowed actions. Keeping statuses accurate helps researchers see real progress in “My forms”.',
    summary:
      'General supply orders: preparation, stock, delivery, and closure.',
    roles:
      'Warehouse / purchasing / experimental supplies admin.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'box-seam',
        h: 'Role of the supplies queue',
        html: '<p>Handles <strong>consumables and warehouse</strong> requests submitted by researchers. Each row is usually one order; detail shows lines, notes, and allowed actions. Accurate statuses close the notification loop to <strong>My forms</strong>.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Top toolbar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads orders and statuses.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Export</dt><dd>Useful for warehouse or purchasing when available.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filters</dt><dd>Top fields or side panel per site design.</dd></dl>',
      },
      {
        id: 'operativa',
        cat: 'content',
        icon: 'clipboard-check',
        h: 'Daily operations',
        html: '<ul class="mb-0"><li>Confirm <strong>availability</strong> or purchase lead time before promising dates.</li><li>If an item is <strong>substitutable</strong>, record the rationale in notes visible to the team.</li><li>On <strong>delivery</strong>, update status to close notifications.</li></ul>',
      },
      {
        id: 'lista_detalle',
        cat: 'table',
        icon: 'table',
        h: 'List vs order detail',
        html: '<p>The <strong>list</strong> summarizes each request; opening a row shows <strong>detail</strong> with line items, notes, and history if available.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Search and filters</dt><dd>Narrow by dates, status, or requester.</dd><dt><i class="bi bi-check2-square text-success" aria-hidden="true"></i> Full delivery</dt><dd>Before marking it, confirm quantities match physical pickup in detail.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Common order actions',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Change status</dt><dd>In prep, ready, delivered, etc., per your site.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Notes</dt><dd>Message the researcher or internal note if available.</dd><dt><i class="bi bi-window-stack text-success" aria-hidden="true"></i> Confirmations</dt><dd>Quantity or closure changes often use a dialog.</dd></dl>',
      },
      {
        id: 'config',
        cat: 'links',
        icon: 'gear',
        h: 'Link to configuration',
        html: '<p>Catalogs and allowed lists usually live under <strong>Settings → Experimental supplies</strong>. If an order fails for an uncatalogued item, fix the <strong>master data</strong> before forcing the case through.</p>',
      },
    ],
  },
  admin__reservas: {
    overview:
      'Use this area to administer shared resources such as rooms, instruments, or time slots. You can review requests, spot conflicts, and—depending on policy—approve or adjust bookings.\n\nViews may include calendars and lists. If something is blocked, it is often due to local rules rather than a random software error.',
    summary:
      'Calendar and administration of room, equipment, or shared slot reservations.',
    roles:
      'Infrastructure admin or whoever centralizes facility scheduling.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'calendar-week',
        h: 'Role of reservations',
        html: '<p>Administers <strong>room, equipment, or slot</strong> bookings that are shared. Views may include calendar and lists; each booking follows <strong>local rules</strong> (cancellation, max duration, who may book).</p>',
      },
      {
        id: 'vista',
        cat: 'filters',
        icon: 'calendar3',
        h: 'Views, dates, and conflicts',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Date range</dt><dd>Limit the period before checking overlaps.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Overlaps</dt><dd>Review conflicts before approving.</dd><dt><i class="bi bi-shield-check text-success" aria-hidden="true"></i> Approval</dt><dd>Some sites require explicit admin approval for certain spaces.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'List and calendar',
        html: '<p>The <strong>grid or calendar</strong> summarizes bookings with requester, resource, and status. Clicking an event or row opens <strong>detail</strong> to adjust or cancel per permissions.</p>',
      },
      {
        id: 'acciones',
        cat: 'row',
        icon: 'pencil-square',
        h: 'Create, move, or cancel',
        html: '<ul class="mb-0"><li><strong>Document</strong> reasons for admin-imposed changes.</li><li><strong>Notify</strong> the researcher if you change a booking from back-office.</li><li><strong>Cancellation</strong> dialogs are often final—read before accepting.</li></ul>',
      },
    ],
  },
  admin__alojamientos: {
    overview:
      'Housing records where animals stay in the vivarium, usually tied to protocols and billing. From here you review occupancy, locations, statuses, and closing stays.\n\nActions that end or reopen periods may affect charges—align with finance before confirming. Columns and buttons depend on your site configuration.',
    summary:
      'Animal housing stays: cages, location, responsible persons, and closing billable periods.',
    roles:
      'Housing staff with permissions.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'house-heart',
        h: 'Role of the housing grid',
        html: '<p>Manages <strong>animal stays</strong> in the vivarium: location, capacity, responsible persons, and period closure. Each record links <strong>protocol</strong>, species, quantity, and dates. Use filters to match <strong>physical inventory</strong>.</p>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Typical filters',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocol</dt><dd>Filter by approved study.</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Dates</dt><dd>Active period or history as needed.</dd><dt><i class="bi bi-geo-alt text-success" aria-hidden="true"></i> Location / cage</dt><dd>If your site uses codes or rooms, filter for audits.</dd></dl>',
      },
      {
        id: 'grilla',
        cat: 'table',
        icon: 'table',
        h: 'Grid and detail',
        html: '<p>The table lists housing records; opening a row shows <strong>detail</strong>, facility notes, and allowed actions. Narrow screens may need horizontal scroll.</p>',
      },
      {
        id: 'finalizar',
        cat: 'modals',
        icon: 'cash-coin',
        h: 'Finalize, reopen, and billing',
        html: '<p><strong>Finalizing</strong> or <strong>reopening</strong> affects how consumption rolls into <strong>billing</strong>. Align with finance before undoing closed periods.</p><ul class="mb-0"><li>History may show messages from housing staff.</li><li><strong>QR</strong> or sheets may show read-only data for visits.</li></ul>',
      },
    ],
  },
  admin__estadisticas: {
    overview:
      'Statistics gathers charts and totals about system and facility usage—orders, occupancy, trends—according to what your institution enabled.\n\nUse it for management insight; open the underlying module when you need individual cases. If a KPI looks odd, filters in the source queue often explain the difference.',
    summary:
      'Aggregated reports and charts (per active modules).',
    roles:
      'Facility leadership, quality, or admin needing indicators.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'bar-chart-line',
        h: 'What the statistics module is',
        html: '<p>Aggregates <strong>charts and totals</strong> for facility or system usage per your contract. Useful for <strong>management reporting</strong> and demand peaks; it does not replace each operational queue.</p>',
      },
      {
        id: 'interpretacion',
        cat: 'dashboard',
        icon: 'graph-up-arrow',
        h: 'How to read the data',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Date range</dt><dd>Wide for trends; short for day-to-day ops.</dd><dt><i class="bi bi-database-check text-success" aria-hidden="true"></i> Data quality</dt><dd>Totals depend on timely closure of orders and housing.</dd><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Drill down</dt><dd>If a KPI stands out, open the source module for cases.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'download',
        h: 'Export and share',
        html: '<p>When exporting (<strong>PDF</strong>, <strong>Excel</strong>, etc.), <strong>anonymize</strong> for external audiences and respect project confidentiality. Buttons usually apply to the <strong>current filtered</strong> dataset.</p>',
      },
    ],
  },
  admin__configuracion__config: {
    overview:
      'Settings defines how GROBO behaves for your site: institution data, master lists, reservation rules, role permissions, protocol options, supplies, housing, and more per contract.\n\nIt is organized as a hub with submenus. Changes can affect every user, so they are usually limited to site administrators. Document major updates internally before applying them.',
    summary:
      'Site parameter hub—not a flat page: subsections (institution, species, reservations, roles, protocols, supplies, housing, etc.).',
    roles:
      'Authorized configuration staff only; master data changes are high impact.',
    blocks: [
      {
        id: 'intro',
        cat: 'hub',
        icon: 'gear-wide-connected',
        h: 'Hub vs sub-pages',
        html: '<p>This screen is the <strong>entry hub</strong>: you see a grid of cards; each card opens another URL with the specific form or table.</p><p>Do not confuse the <strong>card overview</strong> (this page) with the <strong>editable detail</strong> inside each module—there you will find fields, validation, tables, and sometimes pop-up confirmations.</p>',
      },
      {
        id: 'mapa',
        cat: 'hub',
        icon: 'diagram-3',
        h: 'Subsection map',
        html: '<ul class="mb-0"><li><strong>Institution / departments:</strong> identity and org structure.</li><li><strong>Species and categories:</strong> base for orders and housing.</li><li><strong>Reservations and spaces:</strong> rooms, equipment, usage rules.</li><li><strong>Form types / supplies:</strong> what each profile can request.</li><li><strong>Protocols:</strong> templates, states, or local validations.</li><li><strong>Housing:</strong> physical locations, associated fees if any.</li><li><strong>Users and roles:</strong> sometimes linked to global user management.</li></ul>',
      },
      {
        id: 'riesgos',
        cat: 'forms',
        icon: 'exclamation-triangle',
        h: 'Risks when changing parameters',
        html: '<p>A change to species or form types can invalidate drafts. Plan maintenance windows and warn key users.</p>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Pop-ups and save',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Save / OK</dt><dd>On sub-pages saves your changes to the system; wait for the success message before closing the tab.</dd><dt><i class="bi bi-x-circle text-success" aria-hidden="true"></i> Cancel</dt><dd>Drops unsaved edits on the current form.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Pop-up notice</dt><dd>Small centered box: often validation errors, permission denied, or conflicts. Read it carefully and fix what it asks before trying again.</dd><dt><i class="bi bi-layout-text-window-reverse text-success" aria-hidden="true"></i> Large edit window</dt><dd>Some screens let you edit one record in a window over the list; closing returns to the grid.</dd></dl>',
      },
      {
        id: 'documentar',
        cat: 'content',
        icon: 'journal-text',
        h: 'Good practice',
        html: '<p>Keep an external log (internal wiki) of “what each state means” and who authorized critical changes for audits.</p>',
      },
    ],
  },
  panel__formularios: {
    overview:
      'Start new requests your site enabled—animals, reagents, supplies, and similar. The screen usually shows cards or blocks; anything missing is not contracted or not allowed for your role.\n\nEach “Start” button opens the right wizard. This page creates new submissions; track them later under “My forms”.',
    summary:
      'Entry point to request forms (animals, reagents, supplies). May show sub-routes or cards per contract.',
    roles:
      'Researchers and users authorized to submit requests.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'ui-checks-grid',
        h: 'What the Request center is',
        html: '<p>Screen to <strong>choose the request type</strong>. Depending on modules you will see cards or links: live animals, reagents, supplies, etc. If you see only one option, your site enabled a subset.</p>',
      },
      {
        id: 'eleccion',
        cat: 'content',
        icon: 'grid-3x3-gap',
        h: 'Request type cards or buttons',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Animal request</dt><dd>Wizard: protocol, species, sex, quantity, dates, justification.</dd><dt><i class="bi bi-droplet-half text-success" aria-hidden="true"></i> Reagent request</dt><dd>Lab flow: catalogue or free text per configuration.</dd><dt><i class="bi bi-box-seam text-success" aria-hidden="true"></i> Supply request</dt><dd>Warehouse or consumables.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Back to panel</dt><dd>Returns without creating a draft if you opened this by mistake.</dd></dl>',
      },
      {
        id: 'form_pasos',
        cat: 'forms',
        icon: 'pencil-square',
        h: 'Inside the form (common buttons)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-right text-success" aria-hidden="true"></i> Next / Continue</dt><dd>Advances multi-step wizards.</dd><dt><i class="bi bi-chevron-left text-success" aria-hidden="true"></i> Previous</dt><dd>Goes back without losing validated data in memory.</dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Save draft</dt><dd>Stores incomplete work; resume later from <strong>My forms</strong>.</dd><dt><i class="bi bi-send text-success" aria-hidden="true"></i> Submit request</dt><dd>Validates required fields and attachments; success usually shows an internal order code.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Attach file</dt><dd>Uploads allowed formats within size limits.</dd><dt><i class="bi bi-trash text-success" aria-hidden="true"></i> Remove attachment / line</dt><dd>Deletes a file or detail line before submit.</dd></dl>',
      },
      {
        id: 'antes',
        cat: 'forms',
        icon: 'clipboard-check',
        h: 'Before clicking Submit',
        html: '<ul class="mb-0"><li><strong>Valid</strong> protocol selected in the dropdown.</li><li>Quantities within <strong>authorized limits</strong> when the system enforces quotas.</li><li>All required fields (often marked with *) completed.</li></ul>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Messages and confirmations',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-circle text-success" aria-hidden="true"></i> Validation</dt><dd>Lists missing fields or bad formats—fix and retry.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Success</dt><dd>Confirms the request was received; note any ID shown.</dd></dl>',
      },
      {
        id: 'despues',
        cat: 'links',
        icon: 'card-list',
        h: 'After submission',
        html: '<p>Open <strong>My forms</strong> to see the new item as pending or received. You will get <strong>admin notes</strong> and possible requests for corrections there.</p>',
      },
    ],
  },
  panel__misformularios: {
    overview:
      'My forms is the living archive of everything you submitted: one list with current status and access to each case.\n\nUse search and filters when the list grows. Opening a row shows messages, attachments, and facility notes when provided.',
    summary:
      'Unified history of all your requests with status and detail.',
    roles:
      'Any user who submitted forms.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'card-list',
        h: 'What My forms is',
        html: '<p class="mb-0">Lists <strong>all your requests</strong> in one place (animals, reagents, supplies). Each row is a submission; status is updated by facility or lab staff.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Unified list</dt><dd>One place to track every request type you submitted through the system.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Each row</dt><dd>One submission; open detail for lines, facility notes, and attachments.</dd><dt><i class="bi bi-toggle-on text-success" aria-hidden="true"></i> Status</dt><dd>Updated by facility or lab staff; if it changes, check detail before following up.</dd></dl>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Top toolbar',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refresh</dt><dd>Reloads the list.</dd><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> New request</dt><dd>Shortcut to the Request center when shown.</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Export</dt><dd>Excel/PDF of the visible list when permitted.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filters and search',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Search</dt><dd>Free text on code, protocol, notes.</dd><dt><i class="bi bi-tag text-success" aria-hidden="true"></i> Form type</dt><dd>Animals only, reagents only, supplies only.</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Date range</dt><dd>By submission or last update.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Status</dt><dd>Pending, in progress, delivered, returned, cancelled, etc.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Typical columns',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> ID / internal code</dt><dd>Use this when messaging the facility.</dd><dt><i class="bi bi-info-circle text-success" aria-hidden="true"></i> Status</dt><dd>Operational source of truth.</dd><dt><i class="bi bi-clock-history text-success" aria-hidden="true"></i> Date</dt><dd>Last change or submission time.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> View / Detail</dt><dd>Opens the full request.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Opening a request',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Line items</dt><dd>Quantities and items you entered.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Admin notes</dt><dd>Instructions or requests for correction.</dd><dt><i class="bi bi-file-earmark-arrow-down text-success" aria-hidden="true"></i> Download attachment</dt><dd>Gets PDFs or files from the flow.</dd><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Fix / resubmit</dt><dd>When status allows, edit and send again (label may vary).</dd></dl>',
      },
      {
        id: 'alerta',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'If a request stays pending too long',
        html: '<p>Contact the relevant team via <strong>Messages</strong> citing the <strong>order code</strong>. Do not assume a system failure before checking this list.</p>',
      },
    ],
  },
  panel__misalojamientos: {
    overview:
      'When your work includes vivarium stays, this view lists housing linked to your protocols: dates, status, and whatever detail your site exposes to researchers.\n\nIt reduces back‑and‑forth for basic questions. Cost or cage‑level detail may be limited by policy.',
    summary:
      'Housing you participate in as researcher: dates, protocol, status.',
    roles:
      'Researchers with housed animals or protocol-linked housing.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'house-heart',
        h: 'What this list is for',
        html: '<p>Review <strong>your stays</strong> linked to protocols: plan experiments and renewals without relying only on phone calls. Cost or exact cage detail depends on what your site shows researchers.</p>',
      },
      {
        id: 'consulta',
        cat: 'content',
        icon: 'calendar-check',
        h: 'Good consultation habits',
        html: '<p>If something <strong>disagrees</strong> with the facility, open a thread in <strong>Messages</strong> citing the <strong>housing code</strong> visible in the grid.</p>',
      },
      {
        id: 'lista_ficha',
        cat: 'table',
        icon: 'table',
        h: 'List and housing record',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-list text-success" aria-hidden="true"></i> Table</dt><dd>Lists periods or cages linked to your user or protocol.</dd><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Row click</dt><dd>Opens detail: dates, species, location, facility notes.</dd><dt><i class="bi bi-arrows-expand text-success" aria-hidden="true"></i> Horizontal scroll</dt><dd>On narrow screens you may need it for all columns.</dd></dl>',
      },
    ],
  },
  panel__misreservas: {
    overview:
      'Lists reservations tied to your user—rooms, equipment, or other shared resources. Check times, confirmation state, and your institution’s cancellation rules.\n\nChange or cancel here when the UI allows; sometimes the facility must approve adjustments.',
    summary:
      'Your room or equipment reservations: times, status, cancellation policy.',
    roles:
      'Users with reservation permission.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'calendar-week',
        h: 'Your reservations at a glance',
        html: '<p>Lists <strong>bookings under your name</strong>: rooms, equipment, or other resources per contract. Check times and status (confirmed, pending, cancelled) per your site rules.</p>',
      },
      {
        id: 'gestion',
        cat: 'row',
        icon: 'sliders',
        h: 'Management and cancellation',
        html: '<ul class="mb-0"><li><strong>Cancel early</strong> per site rules to free the slot.</li><li>For <strong>recurring</strong> series, check if the UI supports it or ask admin.</li><li><strong>Changes</strong> imposed from back-office may notify you by message or email per settings.</li></ul>',
      },
    ],
  },
  panel__misprotocolos: {
    overview:
      'Protocols you belong to: validity, essential data, and often tabs for “mine”, “site”, or “network” views.\n\nBefore ordering animals or similar, confirm the protocol is still valid and authorizes what you need. Brand‑new submissions may live under a different menu item.',
    summary:
      'Protocols where you are a member: validity, key data, and basis for new orders.',
    roles:
      'Researchers and collaborators per protocol assignment.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'file-earmark-medical',
        h: 'What My protocols is',
        html: '<p>Lists <strong>protocols you belong to</strong>: validity, key data, and often a view selector (yours, site, or network). Before a new order, confirm here the protocol is still <strong>valid</strong> and authorizes what you need.</p>',
      },
      {
        id: 'consulta',
        cat: 'detail',
        icon: 'clipboard-check',
        h: 'Always review',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Validity</dt><dd>Authorization start and end dates.</dd><dt><i class="bi bi-heart-pulse text-success" aria-hidden="true"></i> Scope</dt><dd>Allowed species and procedures.</dd><dt><i class="bi bi-people text-success" aria-hidden="true"></i> Roles</dt><dd>PI, co-investigator, or others per assignment.</dd></dl>',
      },
      {
        id: 'solicitud',
        cat: 'links',
        icon: 'arrow-right-circle',
        h: 'Renewals and changes',
        html: '<p>To <strong>extend validity</strong> or change scope, the path is usually <strong>Protocol request</strong> (profile or site-enabled link), not a standalone animal order.</p><ul class="mb-0"><li>While a submission is <strong>pending</strong>, new orders may be restricted—ask committee or facility.</li></ul>',
      },
      {
        id: 'vinculo',
        cat: 'comms',
        icon: 'share',
        h: 'NETWORK link',
        html: '<p>In <strong>multi-site</strong> institutions, protocol scope is set by administration. Place orders against the correct site per internal rules.</p>',
      },
    ],
  },
  admin__precios: {
    overview:
      'Maintain tariffs and price lists that feed billing or service estimates. Changes can ripple to reports and any researcher‑visible cost views.\n\nCoordinate with finance before restructuring prices. Exact screens depend on your deployment version.',
    summary:
      'Maintenance of rates and price lists used in billing or service estimates.',
    roles:
      'Finance or facility per delegation.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'currency-dollar',
        h: 'Role of the prices screen',
        html: '<p>Maintains <strong>rates and lists</strong> that feed billing and service estimates. Changes ripple to reports and any researcher-visible cost views. Coordinate with <strong>finance or leadership</strong> before major restructuring.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Typical grid controls',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Add / duplicate list</dt><dd>Per site: create item or copy current structure.</dd><dt><i class="bi bi-pencil text-success" aria-hidden="true"></i> Edit</dt><dd>Change amounts or validity; often requires explicit save.</dd><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Search</dt><dd>Find service or code in long lists.</dd></dl>',
      },
      {
        id: 'cambios',
        cat: 'content',
        icon: 'calendar-check',
        h: 'Price changes and effective dates',
        html: '<p><strong>Versioning</strong> and effective dates: a wrong date can misalign issued invoices. Coordinate with <strong>Accounting history</strong> and open reports before mass discounts or surcharges.</p>',
      },
    ],
  },
  admin__facturacion__index: {
    overview:
      'Billing gathers reports to reconcile facility charges with departments, investigators, protocols, or other dimensions your site uses.\n\nIt complements—not replaces—your main accounting system. From this hub you pick a slice (cards); in the training library each slice also has its own topic in the left-hand list.',
    summary:
      'Billing hub: entry points for department, investigator, protocol, institution (network), and organization views.',
    roles:
      'Users with billing module enabled.',
    blocks: [
      {
        id: 'lista_manual',
        cat: 'hub',
        icon: 'book',
        h: 'Manual topics (left list)',
        html: '<p>With billing access, <strong>Training</strong> lists separate entries for <strong>Billing by department / investigator / protocol / institution / organization</strong> in addition to this <strong>Billing centre</strong>. Open them when you work on that subpage or want to read only that flow.</p>',
      },
      {
        id: 'subvistas',
        cat: 'hub',
        icon: 'grid-3x3-gap',
        h: 'What each hub card does',
        html: '<ul class="mb-0"><li><strong>By department:</strong> settlement tables grouped by unit.</li><li><strong>By investigator:</strong> balances and debt by person (payer vs requester as shown).</li><li><strong>By protocol:</strong> costs tied to each protocol.</li><li><strong>By institution:</strong> only if your site has NETWORK routing; cross-site balance usage.</li><li><strong>By organization:</strong> aggregate view by external organization when applicable.</li></ul>',
      },
      {
        id: 'pdf',
        cat: 'toolbar',
        icon: 'file-earmark-pdf',
        h: 'PDF, Excel, and on-screen help',
        html: '<p>Subpages usually offer <strong>PDF</strong> and/or <strong>Excel</strong> and a local <strong>Help</strong> button opening a modal for that screen. Field-level detail for billing line modals (animal, reagent, supply, housing) is in the <strong>Pop-up windows (modals)</strong> topic.</p>',
      },
    ],
  },
  admin__facturacion__depto: {
    overview:
      'Department billing consolidates billable facility use filtered by the selected academic or administrative unit: animals, housing, supplies, and—depending on filters—reagents.\n\nUse it to report to deans or cost centres and to produce supporting documents before posting to the external ledger.',
    summary:
      'Department reports and master grid; scope filters; exports; rows that open detail and payment modals.',
    roles:
      'Users with billing access.',
    blocks: [
      {
        id: 'filtros',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filters and query',
        html: '<ul class="mb-0"><li><strong>Scope / department:</strong> pick a department (and consumption-type filters) before loading; the app warns if something mandatory is missing.</li><li>Enable at least one axis (e.g. animals, housing, or supplies) for each run.</li></ul>',
      },
      {
        id: 'tabla_modal',
        cat: 'table',
        icon: 'table',
        h: 'Grid and clickable rows',
        html: '<p>After the query, each row is a billable line. Clicking the row (avoiding inputs) opens the matching <strong>modal</strong>—animal, reagent, supply, or housing—with amounts and payment actions so you can work without leaving the report.</p>',
      },
      {
        id: 'export',
        cat: 'toolbar',
        icon: 'download',
        h: 'Global PDF and Excel',
        html: '<p>Top buttons export the <strong>loaded</strong> report. If nothing was queried, the app will say so. PDF for filing, Excel for spreadsheets.</p>',
      },
    ],
  },
  admin__facturacion__investigador: {
    overview:
      'Investigator billing organizes debt and consumption around the person—useful for loading balances, charging projects, or returning costs to funds tied to that investigator.\n\nThe protocol holder is usually the accounting “payer” in the modal even when someone else submitted the request.',
    summary:
      'Pick an investigator, load positions, same line modals and payment controls as other slices.',
    roles:
      'Billing or admin with module enabled.',
    blocks: [
      {
        id: 'seleccion',
        cat: 'filters',
        icon: 'person-lines-fill',
        h: 'Selection and load',
        html: '<p>Choose an <strong>investigator</strong> from the list before running the query. Without it, no data loads.</p>',
      },
      {
        id: 'cobros',
        cat: 'table',
        icon: 'credit-card',
        h: 'Collections from the grid',
        html: '<p>Like department billing, rows open modals with <strong>total cost</strong>, <strong>paid</strong>, <strong>holder balance</strong>, and <strong>PAY</strong> / <strong>REMOVE</strong>. The <strong>Pop-up windows</strong> topic describes each field.</p>',
      },
    ],
  },
  admin__facturacion__protocolo: {
    overview:
      'Protocol billing aligns spend with each approved project—useful for committee reports, grants, or audits where the protocol is the accounting axis.\n\nLine modals are the same types (animal, reagent, supply, housing); only the filter and layout change.',
    summary:
      'Select protocol, run report, open per-item modals, export.',
    roles:
      'Billing / admin with module on.',
    blocks: [
      {
        id: 'protocolo',
        cat: 'filters',
        icon: 'file-earmark-medical',
        h: 'Query by protocol',
        html: '<p>Select a <strong>protocol</strong> and run the search. No protocol means no data.</p>',
      },
      {
        id: 'coherencia',
        cat: 'content',
        icon: 'link-45deg',
        h: 'Consistency across views',
        html: '<p>The same order may appear under department, investigator, or protocol; amounts should match. If not, check date and scope filters before reporting a defect.</p>',
      },
    ],
  },
  admin__facturacion__institucion: {
    overview:
      'Institution billing appears when your site participates in a NETWORK with destination institutions: it consolidates or pays lines that involve cross-site routing.\n\nIt uses holder balance logic and may offer bulk selection with confirmation.',
    summary:
      'NETWORK institution report, balances, modals by type, payments with confirmation.',
    roles:
      'Billing profiles only; the hub card may be hidden if no network is configured.',
    blocks: [
      {
        id: 'red',
        cat: 'navigation',
        icon: 'share',
        h: 'Visibility and NETWORK',
        html: '<p>If the option is missing from the hub, your site has no configured routing to other sites—not necessarily a permission bug.</p>',
      },
      {
        id: 'pago',
        cat: 'modals',
        icon: 'cash-coin',
        h: 'Payments and investigator',
        html: '<p>Some bulk actions require each line to have an associated <strong>investigator</strong>. If warned, reload the report. Individual modals follow the same header/body/footer pattern as in the modals topic.</p>',
      },
    ],
  },
  admin__facturacion__org: {
    overview:
      'Organization billing aggregates consumption by linked organization (company, foundation, external unit, etc., per your master data).\n\nUseful for B2B billing or executive reports where the customer is an organization rather than an internal department.',
    summary:
      'Consumption filters, aggregated grid, same export tools and line modals.',
    roles:
      'Billing enabled.',
    blocks: [
      {
        id: 'filtros_org',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filters',
        html: '<p>Keep at least one consumption type active (animals, housing, supplies) as in department billing; the app validates before querying.</p>',
      },
      {
        id: 'uso',
        cat: 'toolbar',
        icon: 'file-earmark-spreadsheet',
        h: 'Typical use',
        html: '<p>Run the report, review totals by organization, use PDF/Excel per internal procedure for finance or the external client.</p>',
      },
    ],
  },
  admin__historialcontable: {
    overview:
      'Accounting history records movements and adjustments related to GROBO billing—useful for audits and understanding corrections over time.\n\nAccess levels vary by role. Combine with finance procedures when you need official statements.',
    summary:
      'Log of accounting movements and corrections linked to the facility.',
    roles:
      'Finance or admin with audit duties.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'journal-text',
        h: 'What accounting history is',
        html: '<p>Records <strong>movements and adjustments</strong> tied to GROBO billing—useful for audits and corrections over time. Visible detail depends on <strong>role</strong>.</p>',
      },
      {
        id: 'auditoria',
        cat: 'filters',
        icon: 'search',
        h: 'Audit use',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Date</dt><dd>Limit the period under review.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> User</dt><dd>Filter who registered the movement when available.</dd><dt><i class="bi bi-tag text-success" aria-hidden="true"></i> Type</dt><dd>Classification per your site.</dd></dl><p class="small text-muted mt-2 mb-0">Do not delete evidence outside approved procedures; prefer <strong>reversing entries</strong> if supported.</p>',
      },
    ],
  },
  panel__mensajes: {
    overview:
      'Messages is your inbox for talking to other people inside GROBO: each thread groups a subject and its replies, similar to internal email.\n\nUse it to coordinate order details or documentation. Restricted roles may only write to specific recipients (for example the site mailbox)—that is policy, not a defect.',
    summary:
      'Personal messaging between platform users (1:1 or threaded).',
    roles:
      'All profiles with the messages module active.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'chat-dots',
        h: 'Personal messages',
        html: '<p>Inbox for <strong>1:1</strong> or other direct threads inside GROBO. Use it to coordinate orders or documents; it does not replace <strong>institutional broadcast</strong> messaging.</p>',
      },
      {
        id: 'hilo',
        cat: 'comms',
        icon: 'envelope-open',
        h: 'Create and follow threads',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-person-plus text-success" aria-hidden="true"></i> Recipient</dt><dd>Pick an allowed user or mailbox per policy.</dd><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Subject</dt><dd>Clear and referenced (e.g. “Order A-1234 — delivery”).</dd><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Replies</dt><dd>One thread per topic to keep context.</dd><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Email</dt><dd>Check <strong>My profile</strong> for notification settings.</dd></dl>',
      },
    ],
  },
  panel__mensajes_institucion: {
    overview:
      'Institutional messaging is the official channel: notices that many people may read, queries to the institution’s mailbox, or management communications that are not private chats.\n\nOptions depend on your role. One‑to‑one conversations with individuals stay under “Messages”.',
    summary:
      'Institutional channel for formal communication between sites or internal broadcast, distinct from personal chat.',
    roles:
      'Those with the module; often admins send and everyone reads.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'megaphone',
        h: 'Institutional channel',
        html: '<p><strong>Official</strong> site communications: notices many people can read, queries to the institutional mailbox, or management posts that are not private chat. Conversations between two users stay under <strong>Messages</strong>.</p>',
      },
      {
        id: 'red',
        cat: 'comms',
        icon: 'share',
        h: 'Messages and NETWORK',
        html: '<p>In <strong>multi-site</strong> networks, use it for cross-site announcements or official comms. Keep text short with links to <strong>news</strong> or document repositories.</p>',
      },
    ],
  },
  admin__comunicacion__noticias: {
    overview:
      'From news administration you create the announcements that researchers and staff read on the portal: closures, calls, reminders, and similar.\n\nYou can scope items to your site or share them across sites in the same network, schedule publication, and keep drafts. This is not a substitute for internal messaging—it is content meant for broad reading.',
    summary:
      'Publish and maintain portal news (closures, calls, notices).',
    roles:
      'Communications or administration.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'newspaper',
        h: 'News authoring (admin)',
        html: '<p>Create and publish items for the <strong>news portal</strong>. You can set scope (site or network), dates, and drafts. Not a substitute for 1:1 messaging.</p>',
      },
      {
        id: 'publicar',
        cat: 'forms',
        icon: 'check2-circle',
        h: 'Publish carefully',
        html: '<ul class="mb-0"><li>Clear <strong>validity dates</strong> so old notices do not confuse.</li><li><strong>Institutional tone</strong> and contact for questions.</li><li>Check <strong>spelling</strong> and links before publishing.</li><li><strong>Edit modals</strong> follow the header/body/footer pattern in the modals topic.</li></ul>',
      },
    ],
  },
  panel__noticias: {
    overview:
      'The news portal is your institution’s bulletin: official notices, site updates, and—when enabled—items shared with partner sites in your network.\n\nFilter, search, and open cards to read the full text. For technical problems use Help → Ticket/Contact, not the news board.',
    summary:
      'News board for researchers and staff.',
    roles:
      'Any user with portal news access.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'newspaper',
        h: 'News portal (reading)',
        html: '<p><strong>Official</strong> bulletin: notices, updates, and—when enabled—items shared across sites. For application failures use <strong>Help → Ticket/Contact</strong> if your role has it, not this board.</p>',
      },
      {
        id: 'lectura',
        cat: 'filters',
        icon: 'funnel',
        h: 'How to use it',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Search</dt><dd>Filter by text when the field exists.</dd><dt><i class="bi bi-geo-alt text-success" aria-hidden="true"></i> Scope</dt><dd>Some sites allow local-only vs network-wide items.</dd><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Open item</dt><dd>Shows full body and attachments if any.</dd></dl><p class="small text-muted mt-2 mb-0">Check regularly; some announcements appear only here. Email may not duplicate automatically.</p>',
      },
    ],
  },
  panel__perfil: {
    overview:
      'My profile is where you update your personal details (name, email, phone) and your password. Email matters most: that is where notifications and account recovery usually arrive.\n\nIn the same part of the app you may see interface preferences (font size, light or dark theme, language, accessibility) depending on what your GROBO version includes. The detailed sections below walk through each control you might see on screen; not every user has the same features enabled.',
    summary:
      'In-depth guide: how the My profile screen differs from the preferences bar; each control explained on its own (voice, font size, light/dark theme, language, shortcuts, top vs side menu); how settings are saved on the server; and Gecko Search (pill, keyboard, text search, AI, and voice commands).',
    roles:
      'All authenticated users.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'person-badge',
        h: 'What the profile is and what global preferences mean',
        html: '<p class="mb-2"><strong>My profile</strong> (this menu item) is where you keep the information that identifies you: email, phone, contact details, and often your <strong>password</strong> and a <strong>photo</strong>. That helps the system know who to notify, how to recover access if you forget your password, and lets other areas (for example Sales or Support) use a valid email.</p><p class="mb-2"><strong>Interface preferences</strong> are different: they are choices about <em>how the program looks and behaves</em> for you—language, colours (light or dark), font size, whether the menu is at the top or on the side, and whether you want to use the voice assistant. Most of those controls are <strong>not only</strong> on My profile: they sit in the <strong>row of round icons</strong> next to the main menu, so you can change them from any screen without opening profile.</p><p class="mb-2"><strong>Why the page sometimes reloads on its own:</strong> when you change <strong>language</strong> or <strong>menu layout</strong> (top ↔ side), the application usually performs a <strong>full reload</strong>. That is not a fault—it is needed so all texts, the menu, and colours display consistently with your new choice.</p><p class="mb-0 small text-muted">When your session and institution allow it, those preferences are also saved on your <strong>account on the server</strong> and restored when you sign in (theme, language, font size, preferred menu, microphone). If something does not “remember” your choice, check that you signed in normally and that your user has an institution assigned.</p>',
      },
      {
        id: 'barra_contexto',
        cat: 'toolbar',
        icon: 'layout-sidebar',
        h: 'Where the bar is and the usual order of buttons',
        html: '<p class="mb-2">The <strong>preferences bar</strong> is a strip of controls that sits <strong>next to the main menu</strong>. You will recognise it as a <strong>row of round icons</strong> (microphone, font, sun/moon, flag, keyboard, layout) separated from the rest of the menu links by a subtle <strong>border or space</strong>.</p><p class="mb-2"><strong>Top (horizontal) menu:</strong> the icons usually align to the <strong>right</strong> of the top bar, after the module links (Dashboard, Protocols, etc.). The <strong>Gecko search</strong> (the elongated pill with a magnifier) is often in the centre area or nearby; the round buttons sit grouped at the end of that bar.</p><p class="mb-2"><strong>Side menu:</strong> the same controls reflow—often in a <strong>row or block</strong> inside the side panel, with slightly <strong>larger</strong> buttons for easier tapping. The <strong>language flag</strong> may open upward or sideways depending on space.</p><p class="mb-2"><strong>Usual order from left to right</strong> within the icon group (may vary slightly): (1) microphone, (2) font size, (3) light/dark theme, (4) language flag, (5) keyboard shortcuts help, (6) switch between top and side menu.</p><p class="mb-0 small text-muted"><strong>Small screens:</strong> on very narrow phones some buttons may be hidden to save space. If you do not see shortcuts or menu layout, try a tablet or desktop; search is still available with <kbd>Ctrl</kbd>+<kbd>G</kbd> on many computers.</p>',
      },
      {
        id: 'ctrl_microfono',
        cat: 'toolbar',
        icon: 'mic-fill',
        h: 'Microphone button (Gecko Voice): what it does and when to use it',
        html: '<p class="mb-2"><strong>What this button is:</strong> it turns the browser’s <strong>voice assistant</strong> on or off. The icon is a <strong>microphone</strong>. It does not record files to send by email—it only turns what you say into text inside the app, when the browser allows it.</p><p class="mb-2"><strong>The first time:</strong> the browser will ask for <strong>permission to use the microphone</strong>. Accept if you want to speak to the system. If you block it, voice will not work until you change the site permission in the browser settings.</p><p class="mb-2"><strong>How to tell if it is listening:</strong> when it is <strong>on</strong>, the button often looks more <strong>green</strong> or highlighted. When it is <strong>off</strong>, it looks neutral or grey. Turn it on only when you plan to use voice.</p><p class="mb-2"><strong>Wake word and search:</strong> with the mic on, you can say the assistant’s name (for example “Gecko”); when it recognises it, the <strong>search box</strong> often opens so you can continue speaking your request. More detail in the “Gecko: voice and AI” section.</p><p class="mb-2"><strong>Browsers:</strong> in <strong>Firefox</strong> built-in voice is sometimes unavailable and you may see a notice. For voice, <strong>Chrome or Edge</strong> usually work better; otherwise use keyboard and mouse.</p><p class="mb-0 small text-muted"><strong>Keyboard shortcut:</strong> <kbd>Alt</kbd>+<kbd>V</kbd> is the same as pressing this button on many computers, when you are not typing in a field that captures every key.</p>',
      },
      {
        id: 'ctrl_tamano_letra',
        cat: 'toolbar',
        icon: 'type',
        h: 'Font size button: the three levels and what changes on screen',
        html: '<p class="mb-2"><strong>What it is:</strong> a button that does not open menus: each time you press it, the app moves to the <strong>next font size</strong> in a three-step cycle. Use it if you need larger text (accessibility) or a denser view (more data on screen).</p><p class="mb-2"><strong>The three sizes (cycle order):</strong> <strong>small</strong> → <strong>medium</strong> → <strong>large</strong> → back to small. The app applies that size to titles, tables, forms, and menus <strong>evenly</strong> across the whole session.</p><p class="mb-2"><strong>What you will notice:</strong> all text grows or shrinks together. This is <strong>not</strong> the same as browser zoom (<kbd>Ctrl</kbd> + mouse wheel)—only how GROBO displays type.</p><p class="mb-2"><strong>Remembered between sessions:</strong> your choice may be saved with your user so it stays the same next time you sign in.</p><p class="mb-0 small text-muted"><strong>Tip:</strong> if something looks clipped, try <strong>light theme</strong> or widen the window; some tables need horizontal scrolling.</p>',
      },
      {
        id: 'ctrl_tema',
        cat: 'toolbar',
        icon: 'brightness-high',
        h: 'Theme button: light mode and dark mode',
        html: '<p class="mb-2"><strong>What “theme” means:</strong> the <strong>colour scheme</strong> for the whole app. <strong>Light mode</strong> uses light backgrounds and dark text, like paper. <strong>Dark mode</strong> uses dark backgrounds and light text, for low light and less eye strain.</p><p class="mb-2"><strong>What the button does:</strong> each press <strong>switches</strong> between light and dark. Buttons, menus, tables, and pop-up windows change colour consistently.</p><p class="mb-2"><strong>The sun / moon icon:</strong> shows which mode you can switch to or which is active depending on the version; the important point is that <strong>one button</strong> controls the change—no need to hunt inside My profile.</p><p class="mb-2"><strong>Who it helps:</strong> people who work long hours, very bright screens, or who prefer stronger contrast. You can combine dark theme with <strong>large font</strong>.</p><p class="mb-0 small text-muted">The theme may be saved on your account so you do not choose it again on every device.</p>',
      },
      {
        id: 'ctrl_idioma',
        cat: 'toolbar',
        icon: 'flag',
        h: 'Language selector (flag): Spanish, English, and Portuguese',
        html: '<p class="mb-2"><strong>What it is:</strong> a round button showing the <strong>flag of the current language</strong> (Spain, US, or Brazil). Pressing it opens a <strong>list of three languages</strong> with flag and name.</p><p class="mb-2"><strong>The three options:</strong> <strong>Español</strong>, <strong>English</strong>, and <strong>Português</strong> (Brazil). They change all menu labels, buttons, and system messages. The voice assistant also follows the language you choose.</p><p class="mb-2"><strong>What happens when you choose:</strong> the app <strong>saves</strong> your language and <strong>reloads the page</strong>. Wait until it finishes—you may see a mix of old and new text until then.</p><p class="mb-2"><strong>Where the menu opens:</strong> with a top menu it usually drops downward; with a side menu it may open upward so it stays on screen.</p><p class="mb-0 small text-muted">If you share a computer, language stays tied to your user and session, not only the browser’s private mode.</p>',
      },
      {
        id: 'ctrl_atajos',
        cat: 'toolbar',
        icon: 'keyboard',
        h: 'Keyboard shortcuts button: what the list shows and each main shortcut',
        html: '<p class="mb-2"><strong>What it is:</strong> a button with a <strong>keyboard</strong> icon that opens the app’s <strong>shortcut list</strong>—a cheat sheet so you do not have to memorise combinations.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd> — Gecko search:</strong> opens or closes the large search panel. It often works even when the cursor is in a text field. Use it to search quickly without moving the mouse to the pill.</p><p class="mb-2"><strong><kbd>Esc</kbd> — Close:</strong> closes the search panel if it is open, or other windows in front, depending on the case.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>K</kbd> — This help:</strong> same as pressing the keyboard button when it is visible.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>D</kbd> — Home dashboard:</strong> goes to the start dashboard for your role (administration or researcher).</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>V</kbd> — Microphone:</strong> turns the same control on or off as the round microphone button.</p><p class="mb-2"><strong>Other frequent <kbd>Alt</kbd> + letter shortcuts:</strong> for example <kbd>Alt</kbd>+<kbd>F</kbd> toward <strong>forms</strong>, <kbd>Alt</kbd>+<kbd>Q</kbd> to <strong>My forms</strong>, <kbd>Alt</kbd>+<kbd>P</kbd> to <strong>My protocols</strong>, <kbd>Alt</kbd>+<kbd>A</kbd> to <strong>My housing</strong>. Administrators may have extra shortcuts to management protocols and housing. The on-screen list is the reference: if a label does not match your menu, trust what happens when you press the key.</p><p class="mb-2"><strong><kbd>Alt</kbd>, then <kbd>Q</kbd>, then <kbd>S</kbd> — Sign out:</strong> ends the session without using menus (three-key sequence).</p><p class="mb-0 small text-muted">On phones the keyboard button may be hidden; shortcuts still work on desktop when the app enables them.</p>',
      },
      {
        id: 'ctrl_layout_menu',
        cat: 'toolbar',
        icon: 'layout-sidebar-reverse',
        h: 'Menu layout button: top bar versus side menu',
        html: '<p class="mb-2"><strong>What it is:</strong> switches between two ways to show the main menu. In one mode the menu is a <strong>horizontal strip</strong> at the top. In the other, the links sit in a <strong>column on the left</strong>.</p><p class="mb-2"><strong>What happens when you press:</strong> the app <strong>saves your preference</strong> and <strong>reloads the page</strong>. After reload you see the same sections but with the menu on top or on the side. The preference icons (microphone, theme, etc.) rearrange to fit the new layout.</p><p class="mb-2"><strong>When to use which:</strong> the top menu often suits wide screens. The side menu suits laptops or when you want more central space for tables.</p><p class="mb-0 small text-muted">On phones this button sometimes does not appear; use a wider screen if you need to change menu layout.</p>',
      },
      {
        id: 'prefs_servidor',
        cat: 'toolbar',
        icon: 'cloud-arrow-down',
        h: 'How preferences are saved and loaded from the server',
        html: '<p class="mb-2"><strong>Why it matters:</strong> if preferences lived only in the browser, you would lose theme, language, font size, and so on when you change computer or clear data. GROBO tries to <strong>save them on your account</strong> when possible.</p><p class="mb-2"><strong>When you change a setting:</strong> the app sends what is needed securely to the server (theme, language, font size, preferred menu, microphone…). Not everything is sent on every click—each control saves its own piece.</p><p class="mb-2"><strong>When you sign in:</strong> if your user type allows it, saved preferences are loaded and applied before you continue working.</p><p class="mb-2"><strong>Special cases:</strong> some users without an assigned institution may rely more on what is stored only in the browser.</p><p class="mb-0 small text-muted">If you have two tabs open and change something in one, the other may show old values until you reload it.</p>',
      },
      {
        id: 'gecko_buscar',
        cat: 'content',
        icon: 'search',
        h: 'Gecko Search: the pill, the panel, and typing to search',
        html: '<p class="mb-2"><strong>What Gecko Search is:</strong> GROBO’s <strong>central search</strong>: one box to search the system and, if your site has it enabled, ask the <strong>AI</strong> with full sentences (see also the voice and AI section).</p><p class="mb-2"><strong>The elongated bar with magnifier:</strong> usually shows hint text along the lines of “Type a command or say Gecko…”. <strong>Clicking</strong> opens the large panel. With a side menu the bar may appear <strong>floating</strong> at the top; with a top menu it is usually <strong>fixed</strong> in the menu strip.</p><p class="mb-2"><strong>When the panel opens:</strong> the rest of the page <strong>dims</strong> and a <strong>central box</strong> appears with animation. That keeps focus on search without losing the session behind it.</p><p class="mb-2"><strong>Inside the box:</strong> at the top is the <strong>field where you type</strong> and a <strong>microphone</strong> button to dictate without going back to the bar. Below, <strong>results</strong> appear as you type. If there are no matches, you see a clear message with a magnifier icon.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd>:</strong> opens or closes this panel from almost any screen (often even when typing in a field).</p><p class="mb-2"><strong><kbd>Esc</kbd>:</strong> closes the panel and returns to your work screen.</p><p class="mb-2"><strong>Microphone in the panel:</strong> turns dictation on or off using the same voice system as the round menu button.</p><p class="mb-2"><strong><kbd>↓</kbd> and <kbd>↑</kbd> keys:</strong> with the cursor in the search box you can move up and down the list of highlighted results in green.</p><p class="mb-2"><strong><kbd>Enter</kbd>:</strong> if a result is highlighted, confirms as if you clicked. If there is <strong>no</strong> row selected but there <strong>is</strong> text typed, it usually sends the phrase to the <strong>AI</strong> (same as finishing speaking): you will see a “Consulting GROBO AI…” style message while waiting.</p><p class="mb-0 small text-muted"><strong>AI answers:</strong> text may appear inside the search panel or in a dedicated block below, depending on the version.</p>',
      },
      {
        id: 'gecko_voz_ia',
        cat: 'modals',
        icon: 'robot',
        h: 'Gecko: continuous listening, wake word, AI dispatch, and response types',
        html: '<p class="mb-2"><strong>Overall:</strong> first the <strong>browser</strong> turns what you say into text; then the <strong>system</strong> interprets that text and may, depending on permissions, <strong>take you to another screen</strong>, <strong>show search results</strong>, <strong>help fill in a form</strong>, or <strong>read the answer aloud</strong>.</p><p class="mb-2"><strong>1. Microphone on the bar:</strong> turn it on until it is clearly active. It often keeps listening without turning off after a single short word.</p><p class="mb-2"><strong>2. Wake word:</strong> while listening, the app listens for a form of the assistant’s name (<strong>Gecko</strong> and similar sounds). Perfect pronunciation is not required.</p><p class="mb-2"><strong>3. Large form open:</strong> if a big form window is open on screen, search may <strong>not open by itself</strong> so it does not cover what you are filling in; use keyboard and mouse as usual in that case.</p><p class="mb-2"><strong>4. Your request:</strong> after the assistant’s name, say what you need. You will see the text in the <strong>search box</strong> to check it understood.</p><p class="mb-2"><strong>5. What the AI can do:</strong></p><ul class="small mb-3"><li><strong>Take you to another section</strong> of the portal (for example users or protocols).</li><li><strong>Fill the results list</strong> with what matches your query.</li><li><strong>Help on the current page</strong> by writing in fields or triggering actions the flow allows.</li></ul><p class="mb-2"><strong>Spoken response:</strong> sometimes the system <strong>reads the answer aloud</strong> using the browser’s voice, in the same language you selected in GROBO.</p><p class="mb-2"><strong>If something fails:</strong> you will see an error message on screen; if there is no connection, the results list may empty. Try again when the network is stable.</p><p class="mb-0 small text-muted"><strong>Privacy:</strong> audio is handled by your browser; do not use the microphone where confidentiality rules forbid it.</p>',
      },
      {
        id: 'form_perfil',
        cat: 'forms',
        icon: 'person-lines-fill',
        h: 'My profile screen: each form field and button',
        html: '<p class="mb-3">Typical <strong>My profile</strong> elements. Your institution may hide or add fields—use this as a mental map.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Identity and basic data</dt><dd><p class="mb-0">Often <strong>first and last name</strong> or a single full-name field—the human label others see in lists and messages.</p></dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Email</dt><dd><p class="mb-1"><strong>Purpose:</strong> destination for <strong>notifications</strong> (tickets, alerts, password recovery). Contact modules often rely on this address.</p><p class="mb-0"><strong>Action:</strong> keep it current; update it before support threads if your domain changes.</p></dd><dt><i class="bi bi-telephone text-success" aria-hidden="true"></i> Phone</dt><dd><p class="mb-1"><strong>Purpose:</strong> urgent contact, verification, or legal consent in some sites.</p><p class="mb-0"><strong>Format:</strong> include international prefix if required (+1, +34, …) to pass validation.</p></dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Current / new / confirm password</dt><dd><p class="mb-1"><strong>Typical flow:</strong> enter <strong>current</strong> password for safety, then <strong>new</strong> password twice.</p><p class="mb-0"><strong>Practice:</strong> adequate length and complexity; if compromised, sign out untrusted devices after changing.</p></dd><dt><i class="bi bi-image text-success" aria-hidden="true"></i> Photo or avatar</dt><dd><p class="mb-1"><strong>What:</strong> image shown on headers and lists.</p><p class="mb-0"><strong>How:</strong> browse or drag a file; respect allowed <strong>formats</strong> and <strong>max size</strong> or save will fail.</p></dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institution or role (read-only)</dt><dd><p class="mb-0">Sometimes your <strong>center</strong> or <strong>role</strong> is display-only—admins change it. Confirms you are in the right account.</p></dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Save / Update profile</dt><dd><p class="mb-1"><strong>Action:</strong> sends changes to the system; the button may disable or show a loading state.</p><p class="mb-0"><strong>Important:</strong> wait for success or error before closing the tab or you may lose edits.</p></dd></dl>',
      },
    ],
  },
  panel__soporte: {
    overview:
      'Gecko Support is the ticket channel to the team that maintains the GROBO software: application failures (screens that will not load, save errors, unexpected error messages, clearly abnormal program behaviour). It does not replace your ethics committee or answer scientific workflow questions inside your institution.\n\nIt works in turns—you write, support replies, then it is your turn again; it is not live chat. Each message often emails support. Use a clear subject and describe what you were doing when the issue happened.',
    summary:
      'Ticket to product technical support (Gecko) for bugs or abnormal app behaviour; usually only administrative profiles see this menu item.',
    roles:
      'Typically vivarium administration and other administrative site profiles. Researchers and portal users usually do not have Help → Ticket/Contact: they should notify local administration so staff can open or escalate a ticket when the problem is with the program.',
    blocks: [
      {
        id: 'para_que',
        cat: 'navigation',
        icon: 'ticket-perforated',
        h: 'What the ticket is for (and what it is not)',
        html: '<p><strong>Do use a ticket</strong> when something in the <strong>GROBO application</strong> fails or misbehaves: form submit errors, blank screens, system error messages, features that stop responding when permissions were not changed, etc.</p><p class="mb-0"><strong>Do not use it</strong> as the general channel for day-to-day operational questions to the vivarium (order timelines, protocol interpretation): use <strong>messaging</strong> or your site’s internal process. <strong>GROBO Sales</strong> is only for commercial topics (quotes, subscriptions).</p>',
      },
      {
        id: 'buenas',
        cat: 'forms',
        icon: 'clipboard-check',
        h: 'How to open a useful ticket',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Subject</dt><dd>Short, naming the module (e.g. “Reservations — save error”).</dd><dt><i class="bi bi-body-text text-success" aria-hidden="true"></i> First message</dt><dd>Steps to reproduce, screenshot if possible, browser and role.</dd><dt><i class="bi bi-1-circle text-success" aria-hidden="true"></i> One issue per ticket</dt><dd>Do not mix unrelated problems.</dd></dl>',
      },
      {
        id: 'turnos',
        cat: 'comms',
        icon: 'arrow-left-right',
        h: 'Turns and closure',
        html: '<p>When support replies, you can send your turn or close if resolved. Each message notifies support by email.</p>',
      },
    ],
  },
  panel__ventas: {
    overview:
      'GROBO Sales is for quotes, buying modules, or commercial questions. Your message emails the sales team; replies go to the address on your profile.\n\nDo not use it for technical failures—use Help → Ticket/Contact. Write enough detail (at least a short paragraph) so the team can help.',
    summary:
      'Commercial contact with GROBO: a single email to the sales team (not a technical support ticket).',
    roles:
      'Users with Help → Sales. A valid email on My profile is required.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'shop',
        h: 'What this screen is for',
        html: '<p>Use it for <strong>quotes</strong>, subscription questions, or positive feedback. The message goes to <strong>ventas@groboapp.com</strong> with category <strong>sales</strong> (venta).</p><ul class="mb-0"><li>Do not use it for application bugs: <strong>Help → Ticket/Contact</strong> (Gecko support) is for technical failures—usually available to <strong>administrative</strong> profiles; if you do not have it, ask your site admin to open a ticket.</li><li>You may mention timelines, modules, or <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
      },
      {
        id: 'lista_ui',
        cat: 'forms',
        icon: 'ui-checks',
        h: 'What you see on screen (UI checklist)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-text-paragraph text-success" aria-hidden="true"></i> Intro text</dt><dd>Context and benefits per offer.</dd><dt><i class="bi bi-envelope-at text-success" aria-hidden="true"></i> We will reply to</dt><dd>Shows your profile email; sales replies there.</dd><dt><i class="bi bi-textarea-resize text-success" aria-hidden="true"></i> Message</dt><dd>Where you type your enquiry (minimum 10 characters).</dd><dt><i class="bi bi-send text-success" aria-hidden="true"></i> Send</dt><dd>Sends the form to the sales team; the button may show a short “please wait” state.</dd></dl>',
      },
      {
        id: 'popup',
        cat: 'modals',
        icon: 'check-circle',
        h: 'Success / error popup',
        html: '<p>After a successful send, a <strong>confirmation message</strong> usually appears with success, the destination address, and that the reply will go to your user email.</p><ul class="mb-0"><li>Missing profile email or short text triggers a warning.</li><li>Connection or server problems show a generic message—try again later.</li></ul>',
      },
    ],
  },
  panel__capacitacion: {
    overview:
      'You are in the training library: a manual ordered like your side menu so help appears where you expect it.\n\nEach topic starts with a longer “About this section” introduction, a short summary, who it applies to, and collapsible chapters. The left list switches the right pane; bookmark or share the browser address after picking a topic to return directly. Icons are hints—actual buttons may look slightly different per site.',
    summary:
      'This library: manual structured like your side menu routes.',
    roles:
      'Whoever has Help → Training.',
    blocks: [
      {
        id: 'como',
        cat: 'navigation',
        icon: 'book',
        h: 'How this manual is organized',
        html: '<ul class="mb-0"><li><strong>Left list:</strong> one button per topic, aligned with your menu (according to role and contracted modules).</li><li><strong>Right pane:</strong> starts with the long “About this section” text, a short summary, who it applies to, then collapsible chapters.</li><li><strong>Green category headings:</strong> group topics by type of screen area (menu, filters, main table, forms, etc.).</li><li><strong>Icon lists:</strong> each item describes a common control; the exact picture may differ, but the function is the one described.</li></ul><figure class="manual-cap-figure my-3 border rounded overflow-hidden"><img src="../../dist/img/capacitacion/panel-capacitacion-biblioteca-layout.svg" width="640" height="280" alt="Diagram: left column with manual topics and right panel with content and accordion." class="img-fluid d-block w-100" style="max-height:280px;object-fit:contain" loading="lazy" decoding="async" /><figcaption class="small text-body-secondary px-3 py-2 border-top">Generic illustration without real data; appearance may vary by site and light or dark theme.</figcaption></figure>',
      },
      {
        id: 'iconos',
        cat: 'content',
        icon: 'palette',
        h: 'Icons in titles and body',
        html: '<p>Bootstrap icons (e.g. <i class="bi bi-lightbulb text-success"></i>) are <strong>visual hints</strong>; the real button on your site may use a different glyph or text only. Rely on <strong>position</strong> (top bar, grid, ⋮ menu) and the <strong>described action</strong>.</p>',
      },
      {
        id: 'lista',
        cat: 'sidebar',
        icon: 'list',
        h: 'Library list (left column)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Each topic button</dt><dd>Loads the guide on the right and updates the browser address so you can bookmark or share the link to that chapter.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Highlighted green item</dt><dd>Shows which chapter you are reading.</dd></dl>',
      },
      {
        id: 'acordeon',
        cat: 'content',
        icon: 'arrows-expand',
        h: 'Topic accordion (right)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-down text-success" aria-hidden="true"></i> Section header</dt><dd>Expands or collapses detailed content.</dd><dt><i class="bi bi-lightbulb text-success" aria-hidden="true"></i> Green banner at top</dt><dd>Reminds you how to read the tutorial and that wording may differ slightly by site.</dd></dl>',
      },
      {
        id: 'roles',
        cat: 'help',
        icon: 'person-lock',
        h: 'Why some topics are missing',
        html: '<p>If a section is absent from the list, your institution did not assign that module or menu item. Ask site admin for access.</p>',
      },
      {
        id: 'ticket_grobo',
        cat: 'help',
        icon: 'ticket-perforated',
        h: 'Gecko Support ticket: application failures (usually administrators only)',
        html: '<p><strong>Help → Ticket/Contact</strong> opens <strong>Gecko Support</strong>: use it to report <strong>technical failures of the program</strong> (errors, freezes, abnormal GROBO behaviour) to the product team.</p><ul class="mb-0"><li><strong>Who sees it:</strong> with the usual menu setup, <strong>administrative</strong> site profiles (vivarium staff, administration) have this entry. <strong>Researchers</strong> often <strong>do not</strong>—by design, to avoid duplicate channels.</li><li><strong>If you are a researcher</strong> and the app breaks, contact <strong>vivarium administration</strong> or the contact your site defines; they can open or escalate the ticket with the right details.</li><li>The <strong>Support / tickets</strong> topic in this library (if listed for you) explains turns, good practices, and the difference from <strong>Sales</strong>.</li></ul>',
      },
      {
        id: 'barra_ayuda',
        cat: 'help',
        icon: 'layout-text-window-reverse',
        h: 'Bottom bar, Help menu, and tutorials without the bar',
        html:
          '<p>The <strong>green bottom bar</strong> links to the manual for the current topic and the interactive tutorial for the <strong>screen you are on</strong> (main list or page).</p><ul class="mb-0"><li><strong>When a pop-up window is open:</strong> a help strip appears above the dimmed background, the bar gains an extra button, and <strong>Help</strong> offers a walkthrough for <em>that</em> window: title at the top, information and fields in the middle, action buttons at the bottom. In the manual, the chapter on <strong>pop-up windows</strong> explains in more detail what you can change and what each button does in typical billing tasks.</li><li><strong>Hide the bar:</strong> use “Don’t show this bar again” on the bar or on the strip when a window is open; both hide together.</li><li><strong>Show it again:</strong> use the switch on this Training page or <strong>Help → Show bottom help bar</strong>.</li><li><strong>Automatic tutorials:</strong> the option to stop them from opening when you enter a screen appears at the <strong>end</strong> of the walkthrough, not at the start.</li><li><strong>Want to run a tutorial again?</strong> Start it anytime from the green bar, from <strong>Help</strong> in the top menu, or from Training.</li></ul>',
      },
    ],
  },
  capacitacion__tema__red: {
    overview:
      'In GROBO, “NETWORK” means several sites or vivaria share a common framework—same umbrella, aligned policies, or grouped contract—while remaining separate institutions with their own data and menus.\n\nThis chapter explains how orders, messages, news, and billing may interact when your organization works that way. If you only run a single isolated site, read it as background or skip what does not apply.',
    summary:
      'Conceptual guide for institutions operating as a NETWORK: multiple sites under one umbrella with shared or routed flows.',
    roles:
      'All profiles; practical use depends on how sites, modules, and permissions are configured.',
    blocks: [
      {
        id: 'concepto',
        cat: 'navigation',
        icon: 'share',
        h: 'What the NETWORK means in GROBO',
        html: '<p>Not a “social network”: an <strong>organizational model</strong> where several sites share framework (brand, contract, policies) but may have their own facilities, price lists, and admins.</p><ul class="mb-0"><li>Each user still belongs to a concrete <strong>institution/site</strong> for data and menu.</li><li>Some flows allow <strong>routing</strong> orders or messages between sites when configuration and permissions allow.</li></ul>',
      },
      {
        id: 'formularios',
        cat: 'forms',
        icon: 'ui-checks',
        h: 'Forms and orders across sites',
        html: '<p>Researchers usually place orders against protocols and rules of <strong>their</strong> site. If execution must happen at another network site, follow internal procedure (institutional message, specific field, or admin routing). Do not assume the system ships goods to another city without human validation.</p>',
      },
      {
        id: 'mensajes',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Personal vs institutional messages',
        html: '<ul class="mb-0"><li><strong>Messages:</strong> person-to-person coordination.</li><li><strong>Institutional messaging:</strong> official notices; in a NETWORK may communicate cross-site priorities.</li></ul>',
      },
      {
        id: 'noticias',
        cat: 'content',
        icon: 'newspaper',
        h: 'Local news and scope',
        html: '<p>News may be portal-wide or segmented—check whether it affects only one site.</p>',
      },
      {
        id: 'protocolos',
        cat: 'links',
        icon: 'file-earmark-medical',
        h: 'Protocols in a NETWORK',
        html: '<p>A protocol may be limited to one site or have annexes authorizing collaboration. Submissions follow the relevant committee; the NETWORK does not replace ethics approval.</p>',
      },
      {
        id: 'facturacion',
        cat: 'content',
        icon: 'cash-coin',
        h: 'Billing and traceability',
        html: '<p>Accounting reports usually filter by site or department. In a NETWORK, ensure costs are not duplicated across sites for the same project.</p>',
      },
      {
        id: 'buenas',
        cat: 'help',
        icon: 'lightbulb',
        h: 'Good practices',
        html: '<ul class="mb-0"><li>Always state <strong>site</strong> and <strong>internal code</strong> in messages and orders.</li><li>Document cross-site agreements outside the software when required.</li><li>If unsure about permission to use another site’s data, ask your local admin first.</li></ul>',
      },
    ],
  },
  capacitacion__tema__modales: {
    overview:
      'Large pop-up windows focus on one task without leaving the page behind—in billing they show an order “card” and let you collect or adjust amounts. Small centred boxes handle short notices, yes/no questions, or errors.\n\nThis topic explains what is read-only, what you can edit, and what each button does in typical billing windows. It complements the interactive “Pop-up windows” tour under Help.',
    summary:
      'Header/body/footer anatomy; informative vs editable fields; PAY/REMOVE; PDF; confirmation dialogs.',
    roles:
      'Anyone using billing or other modal detail screens; others can read the generic part.',
    blocks: [
      {
        id: 'anatomia',
        cat: 'modals',
        h: 'Common structure of a large modal',
        html: '<dl class="manual-glossary mb-0"><dt>Dark header</dt><dd>Title (type and order id), sometimes the <strong>holder’s available balance</strong> as a green badge, and <strong>X</strong> to close without confirming pending actions.</dd><dt>Body</dt><dd>Left: protocol, species, quantities, dates, reagent, etc.—usually <strong>read-only</strong> unless noted. Right: <strong>billing</strong> block (amounts and actions).</dd><dt>Footer</dt><dd>Often <strong>PDF</strong> (download) and <strong>CLOSE</strong>. Do not confuse closing with posting payment—payment uses the billing buttons and any confirmation messages that appear afterwards.</dd></dl>',
      },
      {
        id: 'badges',
        cat: 'modals',
        h: 'Status badges',
        html: '<p><strong>EXEMPT</strong>, <strong>PAID IN FULL</strong>, <strong>PARTIAL</strong>, <strong>UNPAID</strong>, and discounts derive from totals, paid amounts, and exemption rules. They are informative—not edited directly.</p>',
      },
      {
        id: 'animal_campos',
        cat: 'modals',
        h: 'Animal order modal',
        html: '<ul class="mb-0"><li><strong>Read-only:</strong> protocol holder, requester, order type, protocol id/name, taxonomy, age/weight, sex counts, dates, <strong>admin note</strong>, <strong>currently paid</strong>.</li><li><strong>Total form cost:</strong> numeric field read-only by default; the <strong>pencil</strong> enables authorized corrections (server validates after save).</li><li><strong>Amount to move:</strong> how much to <strong>PAY</strong> (charge holder balance) or <strong>REMOVE</strong> (reverse part of a posted payment). Invalid amount or missing balance/debt shows a warning.</li><li><strong>PAY / REMOVE:</strong> trigger confirmation; on success the modal may refresh.</li><li><strong>PDF:</strong> downloadable voucher for the line.</li></ul>',
      },
      {
        id: 'reactivo_insumo',
        cat: 'modals',
        h: 'Reagent and supply modals',
        html: '<p><strong>Reagent:</strong> same pattern—payer and biological details read-only; <strong>admin note</strong>; <strong>total</strong> with pencil; <strong>paid</strong>; amount field and <strong>PAY</strong>/<strong>REMOVE</strong>; <strong>PDF</strong>.</p><p class="mb-0"><strong>Experimental supply:</strong> read-only line list; balance block, total with pencil, paid, same action buttons. Detail text comes from the server.</p>',
      },
      {
        id: 'alojamiento',
        cat: 'modals',
        h: 'Housing modal',
        html: '<p>Shows <strong>holder (pays)</strong> vs <strong>stay responsible</strong>, housing type, segments and computed days. The financial section summarizes <strong>historic cost</strong> and <strong>total paid</strong> with fields to apply payments or reversals per implementation. <strong>PDF</strong> and <strong>CLOSE</strong> in the footer.</p>',
      },
      {
        id: 'sweetalert',
        cat: 'modals',
        h: 'Small notices and confirmations',
        html: '<p>Not data forms: they report validation errors (“select a department”), payment success, or ask for <strong>confirmation</strong> before sensitive moves. Read the text and confirm or cancel; cancel leaves the server unchanged.</p>',
      },
      {
        id: 'ayuda_billing',
        cat: 'help',
        h: 'Billing “Help” modal',
        html: '<p>Each billing subpage’s help button opens a <strong>dedicated modal</strong> with static text for that view—independent of this manual. Use the training library topics to go deeper.</p>',
      },
    ],
  },
};
