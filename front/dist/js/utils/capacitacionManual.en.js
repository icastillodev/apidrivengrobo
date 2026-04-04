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
        html: '<p>On screens such as <strong>My forms</strong> or the <strong>Request center</strong>, the fixed bar offers <strong>View help document</strong> and, when available, <strong>Interactive tutorial</strong>.</p>',
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
        html: '<p>Manage <strong>who can sign in</strong> to GROBO, their <strong>role</strong>, <strong>department</strong>, and links to <strong>protocols</strong> and <strong>orders</strong>. Exact button labels may differ slightly by site.</p>',
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
        id: 'uso',
        h: 'Using this screen',
        html: '<p>Keep statuses current so researchers see progress in <strong>My forms</strong>. Check unit, quantity, and storage conditions in detail.</p>',
      },
      {
        id: 'prioridad',
        h: 'Prioritization',
        html: '<ul class="mb-0"><li>Mark urgency from declared experiment dates.</li><li>Resolve first orders that block other modules.</li></ul>',
      },
      {
        id: 'lista',
        h: 'List, columns, and confirmations',
        html: '<p>The grid lists orders with typical columns: dates, requester, protocol, status, and internal reference per site.</p><ul class="mb-0"><li>Use search and top <strong>filters</strong> to narrow the list.</li><li>Changing status or quantities may open a <strong>confirmation</strong> dialog—read it before accepting.</li><li>Validation messages usually point to the field to fix.</li></ul>',
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
        id: 'operativa',
        h: 'Daily operations',
        html: '<ul class="mb-0"><li>Confirm availability or purchase lead time before promising dates.</li><li>If substitutable, record the criterion in notes.</li><li>On delivery, update status to close the notification loop.</li></ul>',
      },
      {
        id: 'lista_detalle',
        h: 'List vs order detail',
        html: '<p>The <strong>list</strong> summarizes each request; opening a row shows <strong>detail</strong> with line items, researcher notes, and change history if available.</p><ul class="mb-0"><li>Filter by date or status for quick audits.</li><li>Before marking fully delivered, confirm in detail that quantities match physical pickup.</li></ul>',
      },
      {
        id: 'config',
        h: 'Link to configuration',
        html: '<p>Supply catalogs often live under <strong>Settings → Experimental supplies</strong>. If an order fails for an uncatalogued item, fix the master data first.</p>',
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
    overview:
      'Housing records where animals stay in the vivarium, usually tied to protocols and billing. From here you review occupancy, locations, statuses, and closing stays.\n\nActions that end or reopen periods may affect charges—align with finance before confirming. Columns and buttons depend on your site configuration.',
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
    overview:
      'Statistics gathers charts and totals about system and facility usage—orders, occupancy, trends—according to what your institution enabled.\n\nUse it for management insight; open the underlying module when you need individual cases. If a KPI looks odd, filters in the source queue often explain the difference.',
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
    overview:
      'Settings defines how GROBO behaves for your site: institution data, master lists, reservation rules, role permissions, protocol options, supplies, housing, and more per contract.\n\nIt is organized as a hub with submenus. Changes can affect every user, so they are usually limited to site administrators. Document major updates internally before applying them.',
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
        html: '<p>Lists <strong>all your requests</strong> in one place (animals, reagents, supplies). Each row is a submission; status is updated by facility or lab staff.</p>',
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
        id: 'consulta',
        h: 'Consultation',
        html: '<p>Use this list to plan experiments and renewals. If data disagrees with the facility, open a message referencing the housing code.</p>',
      },
      {
        id: 'lista_ficha',
        h: 'List and housing record',
        html: '<p>The table lists periods or cages linked to your user or protocol. A <strong>row click</strong> opens detail (dates, species, location, facility notes).</p><ul class="mb-0"><li>On narrow screens you may need horizontal scroll for all columns.</li><li>If status does not match the vivarium, use <strong>Messages</strong> citing the code or ID shown in the grid.</li></ul>',
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
        id: 'gestion',
        h: 'Management',
        html: '<ul class="mb-0"><li>Cancel early per site rules to free the slot.</li><li>For recurring series, check if the UI supports it or ask admin.</li></ul>',
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
    overview:
      'Maintain tariffs and price lists that feed billing or service estimates. Changes can ripple to reports and any researcher‑visible cost views.\n\nCoordinate with finance before restructuring prices. Exact screens depend on your deployment version.',
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
    overview:
      'Billing gathers reports to reconcile facility charges with departments, investigators, protocols, or other dimensions your site uses.\n\nIt complements—not replaces—your main accounting system. From this hub you pick a slice (cards); in the training library each slice also has its own topic in the left-hand list.',
    summary:
      'Billing hub: entry points for department, investigator, protocol, institution (network), and organization views.',
    roles:
      'Users with billing module enabled.',
    blocks: [
      {
        id: 'lista_manual',
        h: 'Manual topics (left list)',
        html: '<p>With billing access, <strong>Training</strong> lists separate entries for <strong>Billing by department / investigator / protocol / institution / organization</strong> in addition to this <strong>Billing centre</strong>. Open them when you work on that subpage or want to read only that flow.</p>',
      },
      {
        id: 'subvistas',
        h: 'What each hub card does',
        html: '<ul class="mb-0"><li><strong>By department:</strong> settlement tables grouped by unit.</li><li><strong>By investigator:</strong> balances and debt by person (payer vs requester as shown).</li><li><strong>By protocol:</strong> costs tied to each protocol.</li><li><strong>By institution:</strong> only if your site has NETWORK routing; cross-site balance usage.</li><li><strong>By organization:</strong> aggregate view by external organization when applicable.</li></ul>',
      },
      {
        id: 'pdf',
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
        h: 'Filters and query',
        html: '<ul class="mb-0"><li><strong>Scope / department:</strong> pick a department (and consumption-type filters) before loading; the app warns if something mandatory is missing.</li><li>Enable at least one axis (e.g. animals, housing, or supplies) for each run.</li></ul>',
      },
      {
        id: 'tabla_modal',
        h: 'Grid and clickable rows',
        html: '<p>After the query, each row is a billable line. Clicking the row (avoiding inputs) opens the matching <strong>modal</strong>—animal, reagent, supply, or housing—with amounts and payment actions so you can work without leaving the report.</p>',
      },
      {
        id: 'export',
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
        h: 'Selection and load',
        html: '<p>Choose an <strong>investigator</strong> from the list before running the query. Without it, no data loads.</p>',
      },
      {
        id: 'cobros',
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
        h: 'Query by protocol',
        html: '<p>Select a <strong>protocol</strong> and run the search. No protocol means no data.</p>',
      },
      {
        id: 'coherencia',
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
        h: 'Visibility and NETWORK',
        html: '<p>If the option is missing from the hub, your site has no configured routing to other sites—not necessarily a permission bug.</p>',
      },
      {
        id: 'pago',
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
        h: 'Filters',
        html: '<p>Keep at least one consumption type active (animals, housing, supplies) as in department billing; the app validates before querying.</p>',
      },
      {
        id: 'uso',
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
        id: 'auditoria',
        h: 'Audit use',
        html: '<p>Filter by date, user, or movement type. Do not delete evidence outside approved procedures; prefer reversing entries if supported.</p>',
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
        id: 'hilo',
        h: 'Create and follow threads',
        html: '<ul class="mb-0"><li>Pick recipient and a clear subject (e.g. “Order A-1234 — delivery question”).</li><li>Keep one thread per topic.</li><li>Check whether you receive email alerts per profile settings.</li></ul>',
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
        id: 'red',
        h: 'Messages and NETWORK',
        html: '<p>In multi-site networks, use it for announcements to linked users or official comms. Keep posts short with links to news or document repositories.</p>',
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
        id: 'publicar',
        h: 'Publish carefully',
        html: '<ul class="mb-0"><li>Visible validity dates so old notices do not confuse.</li><li>Institutional tone and contact for questions.</li><li>Check spelling and links before publishing.</li></ul>',
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
        id: 'lectura',
        h: 'How to use it',
        html: '<p>Check regularly; some service cuts or calls are announced only here. Email may not duplicate automatically.</p>',
      },
    ],
  },
  panel__perfil: {
    overview:
      'My profile is where you update personal data (name, email, phone) and your password. Email matters most—notifications and password recovery usually go there.\n\nDepending on your GROBO version you may also see interface preferences (font size, light/dark theme, language, accessibility). The detailed sections below walk through controls you might see; not every user has every feature enabled.',
    summary:
      'In-depth guide: what the My profile screen is versus the preference bar; each control explained on its own (voice, font, light/dark theme, language, shortcuts, top/side menu); how settings sync with the server; Gecko Search (pill, keyboard, text search, AI, and voice commands).',
    roles:
      'All authenticated users.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'person-badge',
        h: 'What the profile is and what global preferences mean',
        html: '<p class="mb-2"><strong>My profile</strong> (this menu route) is where you maintain the information that identifies you: email, phone, contact details, and often <strong>password</strong> and a <strong>photo</strong>. That is different from <strong>interface preferences</strong>—choices about <em>how the app looks and behaves</em> for you: language, colours (light or dark), font size, whether the menu is at the top or on the side, and whether you want to use the voice assistant.</p><p class="mb-2">Most of those preferences are <strong>not only</strong> on My profile: they sit in the <strong>round icon bar</strong> next to the main menu so you can change them from any page without opening profile.</p><p class="mb-2"><strong>Why the page sometimes reloads:</strong> when you change <strong>language</strong> or <strong>menu layout</strong> (top ↔ side), the app usually performs a <strong>full reload</strong>. That is expected so all labels, menu, and styles rebuild consistently.</p><p class="mb-0 small text-muted">When your session and institution allow it, preferences are saved on the server (<code>POST /user/config/update</code>) and read on sign-in (<code>GET /user/config/get</code>: theme, language, font size, preferred menu, microphone). If something does not “stick”, check you are signed in and not on a restricted master profile without an institution.</p>',
      },
      {
        id: 'barra_contexto',
        cat: 'toolbar',
        icon: 'layout-sidebar',
        h: 'Where the bar is and the usual order of buttons',
        html: '<p class="mb-2">The <strong>preference bar</strong> is part of the same <strong>menu component</strong> the app uses. You will see a row of <strong>circular icons</strong> (mic, font, sun/moon, flag, keyboard, layout) separated from module links by a subtle <strong>border or gap</strong>.</p><p class="mb-2"><strong>Top (horizontal) menu:</strong> icons usually align to the <strong>right</strong> of the top bar, after module links (Dashboard, Protocols, etc.). The <strong>Gecko search pill</strong> is often central or nearby; the round buttons cluster at the end.</p><p class="mb-2"><strong>Side menu:</strong> the same controls reflow—often in a <strong>row or block</strong> inside the side panel, sometimes <strong>larger</strong> for easier taps. The <strong>language flag</strong> dropdown may open upward or sideways depending on space.</p><p class="mb-2"><strong>Typical left-to-right order</strong> inside the icon group (may vary slightly by release): (1) microphone, (2) font size, (3) light/dark theme, (4) language flag, (5) keyboard shortcuts help, (6) menu layout switch.</p><p class="mb-0 small text-muted"><strong>Small screens:</strong> the <strong>shortcuts</strong> and <strong>layout</strong> buttons may be hidden on narrow phones. If missing, try a tablet/desktop width or use <kbd>Ctrl</kbd>+<kbd>G</kbd> for search when documented shortcuts apply.</p>',
      },
      {
        id: 'ctrl_microfono',
        cat: 'toolbar',
        icon: 'mic-fill',
        h: 'Microphone button (Gecko Voice): what it does and when to use it',
        html: '<p class="mb-2"><strong>What it is:</strong> the main switch for the browser’s <strong>speech recognition</strong>. The icon is a <strong>microphone</strong>. It does not email audio files—it enables the browser’s <strong>speech-to-text API</strong> when available.</p><p class="mb-2"><strong>First click:</strong> the browser shows a prompt asking for <strong>microphone permission</strong>. Accept if you want voice control. If you block it, voice will not work until you change site permissions.</p><p class="mb-2"><strong>Reading the state:</strong> when <strong>actively listening</strong>, styling is often <strong>green</strong> (<code>voice-status-1</code>). When <strong>off</strong>, it looks neutral or <strong>gray</strong> (<code>voice-status-2</code>). Turn it on only when you plan to use voice.</p><p class="mb-2"><strong>Link to “Gecko” and search:</strong> with voice on, the engine listens for the <strong>wake word</strong> (e.g. “Gecko”); when recognized it can open <strong>Gecko Search</strong> and enter command mode—see “Gecko: voice and AI”.</p><p class="mb-2"><strong>Browsers:</strong> <strong>Mozilla Firefox</strong> lacks the API the product uses—you will see an <strong>unsupported browser</strong> message. Use <strong>Chrome, Edge, or another Chromium-based browser</strong> for voice, or rely on keyboard and mouse.</p><p class="mb-0 small text-muted"><strong>Shortcut:</strong> <kbd>Alt</kbd>+<kbd>V</kbd> programmatically clicks this button when global shortcuts are active.</p>',
      },
      {
        id: 'ctrl_tamano_letra',
        cat: 'toolbar',
        icon: 'type',
        h: 'Font size button: the three levels and what changes on screen',
        html: '<p class="mb-2"><strong>What it is:</strong> a button with no dropdown—each press moves to the <strong>next font step</strong> in a three-step cycle. Use it for accessibility (larger text) or denser layouts (smaller text).</p><p class="mb-2"><strong>The three steps (cycle order):</strong> <strong>small</strong> → <strong>medium</strong> → <strong>large</strong> → back to small. The value is stored as <code>data-font-size</code> on the document root (<code>&lt;html&gt;</code>), and product CSS scales tables, forms, and headings.</p><p class="mb-2"><strong>What you will notice:</strong> typography changes <strong>uniformly</strong> across the session. This is <strong>not</strong> browser zoom (Ctrl+wheel)—only the app’s typographic scale.</p><p class="mb-2"><strong>Persistence:</strong> your choice can sync to the server with other preferences so the next login restores it.</p><p class="mb-0 small text-muted"><strong>Tip:</strong> if something clips, try <strong>light theme</strong> or widen the window; wide data grids may need horizontal scroll.</p>',
      },
      {
        id: 'ctrl_tema',
        cat: 'toolbar',
        icon: 'brightness-high',
        h: 'Theme button: light mode and dark mode',
        html: '<p class="mb-2"><strong>What “theme” means:</strong> the app’s <strong>global colour scheme</strong>. <strong>Light mode</strong> uses bright backgrounds and dark text (paper-like). <strong>Dark mode</strong> uses dark backgrounds and light text—easier in low light.</p><p class="mb-2"><strong>What the button does:</strong> toggles between modes. Technically it updates <code>data-bs-theme</code> on the document root, which <strong>Bootstrap 5</strong> uses for consistent colours on buttons, cards, menus, and modals.</p><p class="mb-2"><strong>Sun / moon icon:</strong> the glyph hints at the active or target mode; one control handles everything—no need to dig into profile if the bar is visible.</p><p class="mb-2"><strong>Who benefits:</strong> long sessions, bright screens, or accessibility policies favouring high contrast. You can combine dark theme with <strong>large font</strong>.</p><p class="mb-0 small text-muted">Theme can be stored as a user preference on the server so you do not reconfigure every device.</p>',
      },
      {
        id: 'ctrl_idioma',
        cat: 'toolbar',
        icon: 'flag',
        h: 'Language selector (flag): Spanish, English, and Portuguese',
        html: '<p class="mb-2"><strong>What it is:</strong> a circular button showing the <strong>current language flag</strong> (Spain, US, or Brazil depending on locale). Clicking opens a <strong>three-option list</strong> with flag and language name—it does not change language until you pick a row.</p><p class="mb-2"><strong>The three options:</strong> <strong>Español</strong>, <strong>English</strong>, <strong>Português</strong> (Brazilian Portuguese in this build). Speech recognition locale follows the choice (e.g. es-ES, en-US, pt-BR).</p><p class="mb-2"><strong>After you choose:</strong> <code>setAppLang</code> stores <code>es</code> / <code>en</code> / <code>pt</code> locally and on the server when applicable, then the page <strong>reloads</strong>. Until reload finishes, not every string updates.</p><p class="mb-2"><strong>Dropdown direction:</strong> with a top menu it often opens <strong>downward</strong>, right-aligned. With a side menu it may open <strong>upward</strong> to stay on screen.</p><p class="mb-0 small text-muted">On shared PCs, language is tied to your saved session/preferences, not only incognito local state.</p>',
      },
      {
        id: 'ctrl_atajos',
        cat: 'toolbar',
        icon: 'keyboard',
        h: 'Keyboard shortcuts button: what the list shows and each main shortcut',
        html: '<p class="mb-2"><strong>What it is:</strong> a <strong>keyboard</strong> icon that opens help listing <strong>shortcut chords</strong> shipped with the product.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd> — Toggle Gecko Search (AI):</strong> opens/closes the large search panel. It is <strong>global</strong>—handled even when focus is inside a text field.</p><p class="mb-2"><strong><kbd>Esc</kbd> — Close:</strong> closes Gecko Search if open, or other modals depending on focus order.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>K</kbd> — Shortcut help:</strong> same as clicking the keyboard button when visible and shortcuts are not blocked.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>D</kbd> — Dashboard:</strong> goes to the main dashboard for your role (admin vs researcher paths).</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>V</kbd> — Microphone:</strong> toggles the same mic switch as the round bar button.</p><p class="mb-2"><strong>Other <kbd>Alt</kbd> + letter shortcuts (actual code paths):</strong> <kbd>Alt</kbd>+<kbd>F</kbd> opens the <strong>forms</strong> route for your segment (panel vs admin); <kbd>Alt</kbd>+<kbd>Q</kbd> opens <strong>My forms</strong>; <kbd>Alt</kbd>+<kbd>P</kbd> → <strong>My protocols</strong>; <kbd>Alt</kbd>+<kbd>A</kbd> → <strong>My housing</strong>. Admins also have <kbd>Alt</kbd>+<kbd>X</kbd> then <kbd>P</kbd> or <kbd>A</kbd> to admin protocols and housing. The on-screen shortcut list may label one key differently in places; if a label disagrees, trust the route that actually opens when you press the key.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>Q</kbd> + <kbd>S</kbd> (sequence) — Sign out:</strong> logs out without using menus.</p><p class="mb-0 small text-muted">On viewports &lt; md the keyboard button may be hidden; shortcuts may still work if the hotkey manager initialized.</p>',
      },
      {
        id: 'ctrl_layout_menu',
        cat: 'toolbar',
        icon: 'layout-sidebar-reverse',
        h: 'Menu layout button: top bar versus side menu',
        html: '<p class="mb-2"><strong>What it does:</strong> switches between a <strong>horizontal top</strong> navigation strip and a <strong>side column</strong> navigation (classic app shell).</p><p class="mb-2"><strong>On click:</strong> the preference (<code>menu_top</code> vs side layout) is saved and the page <strong>reloads</strong>. After reload the chrome redraws; preference icons (mic, theme, etc.) reposition for the new layout.</p><p class="mb-2"><strong>When to pick which:</strong> top bars suit wide monitors with many modules visible. Side menus suit laptops or when you prefer vertical hierarchy and more central space for grids.</p><p class="mb-0 small text-muted">This button may be hidden on phones; use a wider window if you do not see it.</p>',
      },
      {
        id: 'prefs_servidor',
        cat: 'toolbar',
        icon: 'cloud-arrow-down',
        h: 'How preferences are saved and loaded from the server',
        html: '<p class="mb-2"><strong>Why it matters:</strong> browser-only storage would lose theme, language, font, etc. when you switch devices or clear data. The product tries to tie these options to <strong>your account</strong>.</p><p class="mb-2"><strong>On save:</strong> the front end may POST JSON to <code>/user/config/update</code> with fields such as <code>theme</code>, <code>lang</code>, font size, <code>menu_preferido</code>, microphone state. Not every control sends every field on every click.</p><p class="mb-2"><strong>On login:</strong> when applicable, <code>GET /user/config/get</code> runs and applies stored values (e.g. <code>idioma_preferido</code>) before you work.</p><p class="mb-2"><strong>Exceptions:</strong> certain master roles without an institution may follow a path where sync differs; then <strong>localStorage</strong> dominates.</p><p class="mb-0 small text-muted">Two tabs open at once may show stale UI until one reloads after changes in the other.</p>',
      },
      {
        id: 'gecko_buscar',
        cat: 'content',
        icon: 'search',
        h: 'Gecko Search: the pill, the panel, and typing to search',
        html: '<p class="mb-2"><strong>What Gecko Search is:</strong> the app’s <strong>unified search</strong>—one place to type queries the front-end search engine can answer, and to chain into <strong>AI</strong> when text is handled as a command (see voice &amp; AI).</p><p class="mb-2"><strong>The pill (trigger):</strong> an elongated rounded control with a magnifier and hint text like “Type a command or say Gecko…”. That is <code>gecko-search-trigger</code>. <strong>Click</strong> opens the large panel. With a side menu the pill may be a <strong>floating</strong> pill centered near the top; with a top menu it is usually <strong>static</strong> in the bar.</p><p class="mb-2"><strong>The overlay:</strong> a <strong>dimmed layer</strong> (<code>gecko-omni-overlay</code>) covers the page and a <strong>central box</strong> animates out from the pill. Background scroll locks so attention stays on search.</p><p class="mb-2"><strong>Header row:</strong> contains the main <strong>text field</strong> (<code>gecko-omni-input</code>) and the panel’s own <strong>mic</strong> button (<code>gecko-omni-voice-btn</code>). The placeholder reminds you that typing or voice both work.</p><p class="mb-2"><strong>Results area:</strong> <code>gecko-omni-results</code> fills as you type with incremental matches. Empty state shows a friendly centered message with a search icon.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd>:</strong> toggles this panel globally, even from inside another input.</p><p class="mb-2"><strong><kbd>Esc</kbd>:</strong> closes the overlay and animates back toward the pill.</p><p class="mb-2"><strong>Mic inside the panel:</strong> toggles listening without returning to the bar; wired to the same Gecko Voice subsystem.</p><p class="mb-2"><strong>Arrow keys in results:</strong> with focus in the search box, <kbd>↓</kbd>/<kbd>↑</kbd> move a highlight across result rows (default caret movement is prevented). The active row gets green styling and smooth <code>scrollIntoView</code>.</p><p class="mb-2"><strong><kbd>Enter</kbd>:</strong> if a row was highlighted, <kbd>Enter</kbd> acts like a <strong>click</strong> (follow link if present). If there is <strong>no</strong> list selection but the text box is <strong>non-empty</strong>, <kbd>Enter</kbd> sends the full string to the <strong>AI</strong> (same path as voice after a final utterance)—you will see a “Consulting GROBO AI…” style loader while the server responds.</p><p class="mb-0 small text-muted"><strong>AI text area:</strong> explanatory text may appear in <code>gecko-ai-message</code> in addition to result rows.</p>',
      },
      {
        id: 'gecko_voz_ia',
        cat: 'modals',
        icon: 'robot',
        h: 'Gecko: continuous listening, wake word, AI dispatch, and response types',
        html: '<p class="mb-2"><strong>Overview:</strong> voice has two layers: (1) the <strong>browser</strong> turns audio into text, (2) the <strong>server</strong> interprets that text (<code>POST /ia/procesar</code>) and returns a structured <strong>action</strong> (navigate, search, manipulate the page, speak).</p><p class="mb-2"><strong>Step 1 — Turn on the bar mic:</strong> press the microphone until active. Recognition runs in <strong>continuous</strong> mode (<code>continuous = true</code>), so it does not stop after one short phrase.</p><p class="mb-2"><strong>Step 2 — Wake word:</strong> the code scans transcripts for assistant name variants: <strong>gecko, geco, gueco, eco, jeco, yecko, gico, guco, gako, gicko, jecko, jeko, ghecko, getko, keko</strong>, etc. Pronunciation need not be perfect; the goal is to wake command mode.</p><p class="mb-2"><strong>Step 3 — Opening search:</strong> if <strong>no</strong> Bootstrap <strong>modal</strong> is open (<code>.modal.show</code>), detecting the wake word opens <strong>Gecko Search</strong> and sets “listening for command”. If a modal <strong>is</strong> open, the omnibox intentionally <strong>does not</strong> open so forms stay usable; voice may still run with different feedback.</p><p class="mb-2"><strong>Step 4 — Command phrase:</strong> keep talking after the wake word. Interim and final transcripts appear in the <strong>search field</strong> so you see what was understood. Wake tokens are <strong>stripped</strong> before sending the command.</p><p class="mb-2"><strong>Step 5 — End of utterance:</strong> when the engine marks a <strong>final</strong> result and text remains, listening <strong>stops</strong> and the AI dispatcher runs. Payload includes prompt text, institution id, user id, and role level so the backend can enforce permissions.</p><p class="mb-2"><strong>Possible <code>action_type</code> values:</strong></p><ul class="small mb-3"><li><strong>navegacion:</strong> after a short delay, navigate to an internal route (e.g. users or protocols). Base path adjusts for localhost vs production.</li><li><strong>busqueda:</strong> fill the panel with server-returned hits plus search term metadata.</li><li><strong>comando_dom:</strong> on the current page, set <strong>input values</strong> by HTML <code>id</code> and fire <code>input</code> events, and/or <strong>click</strong> a button by id—useful for form assistants.</li></ul><p class="mb-2"><strong>Spoken or on-screen message:</strong> if the response includes <code>mensaje_texto</code>, it can show in the search UI and be read via <strong><code>speechSynthesis</code></strong> in es/en/pt-appropriate locale.</p><p class="mb-2"><strong>Errors:</strong> failed API calls may show SweetAlert (if loaded) or clear the results area; network errors log to the console.</p><p class="mb-0 small text-muted"><strong>Privacy:</strong> audio is processed by the browser stack under the browser vendor’s policies. Do not enable the mic where confidentiality forbids it.</p>',
      },
      {
        id: 'form_perfil',
        cat: 'forms',
        icon: 'person-lines-fill',
        h: 'My profile screen: each form field and button',
        html: '<p class="mb-3">Typical <strong>My profile</strong> elements. Your institution may hide or add fields—use this as a mental map.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Identity and basic data</dt><dd><p class="mb-0">Often <strong>first and last name</strong> or a single full-name field—the human label others see in lists and messages.</p></dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Email</dt><dd><p class="mb-1"><strong>Purpose:</strong> destination for <strong>notifications</strong> (tickets, alerts, password recovery). Contact modules often rely on this address.</p><p class="mb-0"><strong>Action:</strong> keep it current; update it before support threads if your domain changes.</p></dd><dt><i class="bi bi-telephone text-success" aria-hidden="true"></i> Phone</dt><dd><p class="mb-1"><strong>Purpose:</strong> urgent contact, verification, or legal consent in some sites.</p><p class="mb-0"><strong>Format:</strong> include international prefix if required (+1, +34, …) to pass validation.</p></dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Current / new / confirm password</dt><dd><p class="mb-1"><strong>Typical flow:</strong> enter <strong>current</strong> password for safety, then <strong>new</strong> password twice.</p><p class="mb-0"><strong>Practice:</strong> adequate length and complexity; if compromised, sign out untrusted devices after changing.</p></dd><dt><i class="bi bi-image text-success" aria-hidden="true"></i> Photo or avatar</dt><dd><p class="mb-1"><strong>What:</strong> image shown on headers and lists.</p><p class="mb-0"><strong>How:</strong> browse/drag file; respect allowed <strong>formats</strong> and <strong>max size</strong> or save will fail.</p></dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institution or role (read-only)</dt><dd><p class="mb-0">Sometimes your <strong>center</strong> or <strong>role</strong> is display-only—admins change it. Confirms you are in the right account.</p></dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Save / Update profile</dt><dd><p class="mb-1"><strong>Action:</strong> submits changes to the backend; button may disable or show a spinner.</p><p class="mb-0"><strong>Important:</strong> wait for success/error before closing the tab or you may lose edits.</p></dd></dl>',
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
        h: 'What the ticket is for (and what it is not)',
        html: '<p><strong>Do use a ticket</strong> when something in the <strong>GROBO application</strong> fails or misbehaves: form submit errors, blank screens, system error messages, features that stop responding when permissions were not changed, etc.</p><p class="mb-0"><strong>Do not use it</strong> as the general channel for day-to-day operational questions to the vivarium (order timelines, protocol interpretation): use <strong>messaging</strong> or your site’s internal process. <strong>GROBO Sales</strong> is only for commercial topics (quotes, subscriptions).</p>',
      },
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
    overview:
      'GROBO Sales is for quotes, buying modules, or commercial questions. Your message emails the sales team; replies go to the address on your profile.\n\nDo not use it for technical failures—use Help → Ticket/Contact. Write enough detail (at least a short paragraph) so the team can help.',
    summary:
      'Commercial contact with GROBO: a single email to the sales team (not a technical support ticket).',
    roles:
      'Users with Help → Sales. A valid email on My profile is required.',
    blocks: [
      {
        id: 'proposito',
        h: 'What this screen is for',
        html: '<p>Use it for <strong>quotes</strong>, subscription questions, or positive feedback. The message goes to <strong>ventas@groboapp.com</strong> with category <strong>sales</strong> (venta).</p><ul class="mb-0"><li>Do not use it for application bugs: <strong>Help → Ticket/Contact</strong> (Gecko support) is for technical failures—usually available to <strong>administrative</strong> profiles; if you do not have it, ask your site admin to open a ticket.</li><li>You may mention timelines, modules, or <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
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
        html: '<ul class="mb-0"><li><strong>Left list:</strong> one button per topic, aligned with your menu (according to role and contracted modules).</li><li><strong>Right pane:</strong> starts with the long “About this section” text, a short summary, who it applies to, then collapsible chapters.</li><li><strong>Green category headings:</strong> group topics by type of screen area (menu, filters, main table, forms, etc.).</li><li><strong>Icon lists:</strong> each item describes a common control; the exact picture may differ, but the function is the one described.</li></ul>',
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
          '<p>The <strong>green bottom bar</strong> links to the manual for the current topic and the interactive tutorial for the <strong>main screen</strong> (list or page behind the dialog).</p><ul class="mb-0"><li><strong>While a dialog is open:</strong> a help strip appears above the backdrop, the bar shows an extra button, and <strong>Help</strong> includes a walkthrough for <em>that</em> dialog (header/body/footer). In the manual’s left list, <strong>Pop-up windows (modals and dialogs)</strong> explains which fields are editable and what each button does in common billing modals.</li><li><strong>Hide bar:</strong> “Don’t show this bar again” on the bar or the dialog strip; both hide together.</li><li><strong>Show again:</strong> switch on this Training page or <strong>Help → Show bottom help bar</strong>.</li><li><strong>Automatic tutorials:</strong> options to stop auto-start on entry appear at the <strong>end</strong> of a walkthrough, not at the first step.</li><li><strong>Authors:</strong> steps per route in <code>capacitacionTours.js</code>, copy <code>tour_*</code> in i18n ES/EN/PT; header Help (?): <code>MenuTemplates.js</code> + <code>CapacitacionPageHelpMenu.js</code>; bar <code>CapacitacionHelpFab.js</code>. Tracking doc: <code>docs/CHECKLIST-CAPACITACION.md</code> §13 and §13.6.</li></ul>',
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
  capacitacion__tema__modales: {
    overview:
      'Large dialogs (Bootstrap modals) focus one task without leaving the background page—in billing they show an order “card” and let you collect or adjust amounts. SweetAlert2 boxes are short prompts (notice, confirm, error).\n\nThis topic explains what is read-only, what you can edit, and what each button does in the usual billing modals. It complements the interactive “Pop-up windows” tour under Help.',
    summary:
      'Header/body/footer anatomy; informative vs editable fields; PAY/REMOVE; PDF; confirmation dialogs.',
    roles:
      'Anyone using billing or other modal detail screens; others can read the generic part.',
    blocks: [
      {
        id: 'anatomia',
        cat: 'modals',
        h: 'Common structure of a large modal',
        html: '<dl class="manual-glossary mb-0"><dt>Dark header</dt><dd>Title (type and order id), sometimes the <strong>holder’s available balance</strong> as a green badge, and <strong>X</strong> to close without confirming pending actions.</dd><dt>Body</dt><dd>Left: protocol, species, quantities, dates, reagent, etc.—usually <strong>read-only</strong> unless noted. Right: <strong>billing</strong> block (amounts and actions).</dd><dt>Footer</dt><dd>Often <strong>PDF</strong> (download) and <strong>CLOSE</strong>. Do not confuse closing with posting payment—payment uses the billing buttons and follow-up SweetAlerts.</dd></dl>',
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
        h: 'Small dialogs (SweetAlert)',
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
