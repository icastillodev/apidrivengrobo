import { API } from '../../api.js';
import {
  isCapacitacionFabHidden,
  setCapacitacionFabHidden,
  refreshCapacitacionHelpFab,
} from '../../components/CapacitacionHelpFab.js';
import { startCapacitacionInteractiveTour } from '../../components/CapacitacionInteractiveTour.js';
import { filterMenuIdsByModulos, ensureInstModulesLoaded } from '../../modulesAccess.js';
import {
  CAPACITACION_PATH_ORDER,
  collectMenuPathsFromIds,
  expandFacturacionPathsIfAllowed,
} from '../../utils/capacitacionMenuPaths.js';
import { menuPathToSlug, slugToMenuPath } from '../../utils/capacitacionPaths.js';
import { labelCapacitacionMenuPath } from '../../utils/capacitacionLabels.js';
import { CHAPTERS as CHAPTERS_ES } from '../../utils/capacitacionManual.es.js';
import { CHAPTERS as CHAPTERS_EN } from '../../utils/capacitacionManual.en.js';
import { CHAPTERS as CHAPTERS_PT } from '../../utils/capacitacionManual.pt.js';

const MANUAL_BY_LANG = { es: CHAPTERS_ES, en: CHAPTERS_EN, pt: CHAPTERS_PT };

function normalizeManualLang() {
  const raw = (localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('pt')) return 'pt';
  return 'es';
}

function getManualPack() {
  const lang = normalizeManualLang();
  return MANUAL_BY_LANG[lang] || MANUAL_BY_LANG.es;
}

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

/** Párrafos separados por línea en blanco (texto plano del manual). */
function renderOverviewPlain(text) {
  if (!text || typeof text !== 'string') return '';
  return String(text)
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => `<p class="mb-3">${escapeHtml(p)}</p>`)
    .join('');
}

/** Nombre de icono Bootstrap Icons (solo letras, números y guiones). */
function sanitizeBiIcon(name) {
  if (!name || typeof name !== 'string') return '';
  const n = name.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(n) ? n : '';
}

const MANUAL_CAT_ICONS = {
  navigation: 'compass',
  toolbar: 'wrench-adjustable',
  filters: 'funnel',
  table: 'table',
  row: 'hand-index',
  bulk: 'file-earmark-arrow-down',
  modals: 'window-stack',
  forms: 'ui-checks-grid',
  detail: 'card-heading',
  sidebar: 'layout-sidebar-inset',
  calendar: 'calendar3',
  comms: 'chat-dots',
  content: 'columns-gap',
  hub: 'gear-wide-connected',
  profile: 'person-badge',
  dashboard: 'speedometer2',
  links: 'link-45deg',
  help: 'question-circle',
};

function labelForMenuPath(path) {
  return labelCapacitacionMenuPath(path, t);
}

function topicHtml(slug, menuPath, title) {
  const pack = getManualPack();
  const chapter = pack[slug];

  if (chapter && Array.isArray(chapter.blocks) && chapter.blocks.length > 0) {
    const accId = `cap-acc-${String(slug).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const rolesLabel = escapeHtml(t('capacitacion.roles_label', 'Rol y alcance'));
    const chapterAbout = escapeHtml(t('capacitacion.chapter_about_heading', 'Sobre esta sección'));
    const summaryLabel = escapeHtml(t('capacitacion.chapter_summary_label', 'En resumen'));
    const helpTitle = escapeHtml(t('capacitacion.content_help_title', 'Cómo usar este tutorial'));
    const helpBody = escapeHtml(
      t(
        'capacitacion.content_help_body',
        'Despliegue cada apartado del acordeón. Si algo no cuadra con su sede, confirme con administración local. Para fallos del sistema use Ayuda → Ticket/Contacto.'
      )
    );

    let html = '<div class="manual-topic">';
    const helpIcons = escapeHtml(t('capacitacion.content_help_icons', ''));
    html += `<div class="alert alert-success border-success-subtle py-3 px-3 mb-4 cap-help-strip" role="status">
      <div class="fw-bold text-success-emphasis mb-2"><i class="bi bi-lightbulb me-1"></i>${helpTitle}</div>
      <div class="mb-0 text-body-secondary">${helpBody}</div>
      ${
        helpIcons
          ? `<div class="mt-3 pt-2 border-top border-success-subtle text-muted mb-0"><i class="bi bi-info-circle me-1" aria-hidden="true"></i>${helpIcons}</div>`
          : ''
      }
    </div>`;

    const hasIntroHtml = chapter.introHtml && typeof chapter.introHtml === 'string';
    const hasOverview = chapter.overview && typeof chapter.overview === 'string';
    if (hasIntroHtml || hasOverview || chapter.summary) {
      html += `<div class="cap-chapter-intro mb-4"><div class="p-3 p-md-4">
        <h3 class="h5 fw-bold text-success mb-3">${chapterAbout}</h3>
        <div class="cap-chapter-intro-body">`;
      if (hasIntroHtml) {
        html += chapter.introHtml;
      } else if (hasOverview) {
        html += renderOverviewPlain(chapter.overview);
      } else if (chapter.summary) {
        html += `<p class="mb-0">${escapeHtml(chapter.summary)}</p>`;
      }
      html += `</div></div></div>`;
    }

    if (chapter.summary && (hasIntroHtml || hasOverview)) {
      html += `<p class="cap-summary-lead mb-3"><span class="text-success fw-bold text-uppercase small d-block mb-1">${summaryLabel}</span>${escapeHtml(chapter.summary)}</p>`;
    }
    if (chapter.roles) {
      html += `<p class="cap-roles-note border-start border-success border-3 ps-3 mb-4 text-body-secondary"><span class="text-body fw-semibold">${rolesLabel}:</span> ${escapeHtml(chapter.roles)}</p>`;
    }

    html += `<div class="accordion accordion-flush manual-accordion" id="${accId}">`;
    let prevCat = null;
    chapter.blocks.forEach((b, i) => {
      const catKey =
        b.cat && typeof b.cat === 'string' && /^[a-z_]+$/.test(b.cat) ? b.cat : null;
      if (catKey !== prevCat) {
        if (catKey) {
          const catLabel = t(`capacitacion.cat_${catKey}`, catKey);
          const catIc = sanitizeBiIcon(MANUAL_CAT_ICONS[catKey]) || 'bookmarks';
          html += `<div class="manual-cat-heading text-uppercase fw-bold text-success-emphasis mt-3 mb-2 pb-1 border-bottom border-success-subtle d-flex align-items-center gap-2" role="heading" aria-level="4">
            <i class="bi bi-${escapeHtml(catIc)} flex-shrink-0" aria-hidden="true"></i>
            <span>${escapeHtml(catLabel)}</span>
          </div>`;
        }
        prevCat = catKey;
      }

      const hId = `${accId}-h-${i}`;
      const cId = `${accId}-c-${i}`;
      const open = i === 0;
      const blockIc = sanitizeBiIcon(b.icon);
      const iconHtml = blockIc
        ? `<i class="bi bi-${escapeHtml(blockIc)} me-2 text-success flex-shrink-0" aria-hidden="true"></i>`
        : '';
      html += `<div class="accordion-item border rounded mb-2 overflow-hidden">
        <h3 class="accordion-header m-0" id="${hId}">
          <button class="accordion-button fw-semibold ${open ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${cId}" aria-expanded="${open}" aria-controls="${cId}">
            <span class="d-flex align-items-center text-start">${iconHtml}<span>${escapeHtml(b.h)}</span></span>
          </button>
        </h3>
        <div id="${cId}" class="accordion-collapse collapse ${open ? 'show' : ''}" aria-labelledby="${hId}" data-bs-parent="#${accId}">
          <div class="accordion-body">${b.html}</div>
        </div>
      </div>`;
    });
    html += '</div></div>';
    return html;
  }

  const bodies = window.txt?.capacitacion?.bodies || {};
  if (bodies[slug]) {
    return bodies[slug];
  }
  const tpl = t(
    'capacitacion.body_fallback',
    '<p class="mb-0">En <strong>{title}</strong> encontrará las herramientas habituales de esta parte del sistema, según su rol y lo que su institución tenga activo. Use el menú lateral y los botones de la pantalla. Si algo falla o necesita ayuda técnica, vaya a <strong>Ayuda → Ticket/Contacto</strong>.</p>'
  );
  return tpl.replace(/\{title\}/g, escapeHtml(title)).replace(/\{path\}/g, escapeHtml(menuPath));
}

function parseHashTopic() {
  const h = (window.location.hash || '').replace(/^#/, '');
  if (!h) return null;
  try {
    const params = new URLSearchParams(h);
    const slug = params.get('t');
    return slug ? decodeURIComponent(slug) : null;
  } catch {
    return null;
  }
}

function setHashTopic(slug) {
  const next = slug ? `#t=${encodeURIComponent(slug)}` : '';
  if (window.location.hash === next) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
}

export async function initCapacitacion() {
  const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
  const instId = parseInt(sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0', 10) || 0;

  await ensureInstModulesLoaded(API.request.bind(API));

  let menuIds = [];
  if (roleId === 1 || roleId === 2 || roleId === 4) {
    menuIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 55, 202, 204, 205, 206, 998, 999];
    menuIds = filterMenuIdsByModulos(menuIds, roleId, instId);
  } else {
    const resMenu = await API.request(`/menu?role=${roleId}&inst=${instId}`);
    if (resMenu?.status === 'success' && Array.isArray(resMenu.data)) {
      menuIds = resMenu.data.map((id) => Number(id));
    }
    menuIds = filterMenuIdsByModulos(menuIds, roleId, instId);
  }

  const allowed = collectMenuPathsFromIds(menuIds, roleId);
  if ([1, 2, 4].includes(roleId)) {
    allowed.add('admin/dashboard');
  } else {
    allowed.add('panel/dashboard');
  }
  if (!allowed.has('panel/capacitacion')) {
    allowed.add('panel/capacitacion');
  }
  allowed.add('capacitacion/tema/red');
  allowed.add('capacitacion/tema/modales');
  expandFacturacionPathsIfAllowed(allowed);

  const ordered = CAPACITACION_PATH_ORDER.filter((p) => allowed.has(p));
  const rest = [...allowed].filter((p) => !ordered.includes(p)).sort();
  const paths = [...ordered, ...rest];

  const listEl = document.getElementById('cap-list');
  const titleEl = document.getElementById('cap-content-title');
  const bodyEl = document.getElementById('cap-content-body');
  const hashAlertEl = document.getElementById('cap-hash-alert');
  const mainEl = document.getElementById('cap-main');

  if (!listEl || !titleEl || !bodyEl) return;

  if (mainEl) {
    mainEl.setAttribute(
      'aria-label',
      t('capacitacion.main_landmark', 'Manual de capacitación y biblioteca de temas')
    );
  }

  if (paths.length === 0) {
    listEl.innerHTML = `<div class="list-group-item text-muted">${escapeHtml(t('capacitacion.no_topics', 'No hay secciones disponibles.'))}</div>`;
    titleEl.textContent = '';
    bodyEl.innerHTML = '';
    return;
  }

  function hideHashUnavailable() {
    if (!hashAlertEl) return;
    hashAlertEl.classList.add('d-none');
    hashAlertEl.innerHTML = '';
    hashAlertEl.removeAttribute('role');
  }

  function showHashUnavailable() {
    if (!hashAlertEl) return;
    const dismissLabel = escapeHtml(t('capacitacion.dismiss_alert', 'Cerrar aviso'));
    const title = escapeHtml(t('capacitacion.hash_unavailable_title', 'Enlace no disponible para su perfil'));
    const body = escapeHtml(
      t(
        'capacitacion.hash_unavailable_body',
        'Ese tema no forma parte de su menú o módulos. Mostramos el primer tema de su biblioteca.'
      )
    );
    hashAlertEl.classList.remove('d-none');
    hashAlertEl.setAttribute('role', 'alert');
    hashAlertEl.innerHTML = `<div class="alert alert-warning alert-dismissible fade show mb-3 py-3 shadow-sm" role="alert">
      <div class="fw-semibold">${title}</div>
      <div class="mb-0 text-body-secondary">${body}</div>
      <button type="button" class="btn-close" aria-label="${dismissLabel}"></button>
    </div>`;
    hashAlertEl.querySelector('.btn-close')?.addEventListener('click', () => hideHashUnavailable());
  }

  function showTopicBySlug(slug, opts = {}) {
    const { skipClearHashAlert = false } = opts;
    const menuPath = slugToMenuPath(slug);
    if (!menuPath || !allowed.has(menuPath)) return false;
    if (!skipClearHashAlert) hideHashUnavailable();
    const title = labelForMenuPath(menuPath);
    titleEl.textContent = title;
    bodyEl.innerHTML = topicHtml(slug, menuPath, title);
    listEl.querySelectorAll('[data-cap-slug]').forEach((btn) => {
      const active = btn.getAttribute('data-cap-slug') === slug;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'true' : 'false');
    });
    setHashTopic(slug);
    return true;
  }

  listEl.setAttribute(
    'role',
    'navigation'
  );
  listEl.setAttribute(
    'aria-label',
    t('capacitacion.nav_library', 'Temas del manual por sección del menú')
  );

  const firstSlug = menuPathToSlug(paths[0]);
  listEl.innerHTML = paths
    .map((path) => {
      const slug = menuPathToSlug(path);
      const label = labelForMenuPath(path);
      const current = slug === firstSlug ? 'true' : 'false';
      return `<button type="button" class="list-group-item list-group-item-action text-start py-3 fw-semibold" data-cap-slug="${escapeHtml(
        slug
      )}" aria-current="${current}" aria-controls="cap-content-region">${escapeHtml(label)}</button>`;
    })
    .join('');

  listEl.querySelectorAll('[data-cap-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.getAttribute('data-cap-slug');
      if (slug) showTopicBySlug(slug);
    });
  });

  const initial = parseHashTopic();
  const initialMp = initial ? slugToMenuPath(initial) : null;
  const initialOk = Boolean(initialMp && allowed.has(initialMp));

  if (initial && !initialOk) {
    showTopicBySlug(firstSlug, { skipClearHashAlert: true });
    showHashUnavailable();
    setHashTopic(firstSlug);
  } else if (initialOk) {
    showTopicBySlug(initial);
  } else {
    showTopicBySlug(firstSlug);
  }

  window.addEventListener('hashchange', () => {
    const slug = parseHashTopic();
    if (!slug) return;
    const mp = slugToMenuPath(slug);
    if (!mp || !allowed.has(mp)) {
      showTopicBySlug(firstSlug, { skipClearHashAlert: true });
      showHashUnavailable();
      setHashTopic(firstSlug);
      return;
    }
    showTopicBySlug(slug);
  });

  const fabPref = document.getElementById('cap-pref-show-fab');
  if (fabPref) {
    fabPref.checked = !isCapacitacionFabHidden();
    fabPref.addEventListener('change', () => {
      setCapacitacionFabHidden(!fabPref.checked);
      refreshCapacitacionHelpFab().catch(() => {});
    });
  }

  document.getElementById('cap-start-library-tour')?.addEventListener('click', () => {
    startCapacitacionInteractiveTour('panel/capacitacion', {
      manual: true,
      hostMenuPath: 'panel/capacitacion',
    });
  });
}
