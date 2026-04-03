import { API } from '../../api.js';
import { filterMenuIdsByModulos, ensureInstModulesLoaded } from '../../modulesAccess.js';
import {
  CAPACITACION_PATH_ORDER,
  collectMenuPathsFromIds,
} from '../../utils/capacitacionMenuPaths.js';
import { menuPathToSlug, slugToMenuPath } from '../../utils/capacitacionPaths.js';
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

/** Etiqueta legible por ruta de menú (reutiliza i18n existente cuando existe). */
function labelForMenuPath(path) {
  const map = {
    'admin/dashboard': 'titulos_pagina.dashboard_admin',
    'panel/dashboard': 'titulos_pagina.dashboard_usuario',
    'admin/usuarios': 'menu.users',
    'admin/protocolos': 'menu.protocols',
    'admin/solicitud_protocolo': 'titulos_pagina.solicitud_protocolo',
    'admin/animales': 'menu.animals',
    'admin/reactivos': 'menu.reagents',
    'admin/insumos': 'menu.supplies',
    'admin/reservas': 'menu.reservations',
    'admin/alojamientos': 'menu.accommodations',
    'admin/estadisticas': 'menu.stats',
    'admin/configuracion/config': 'menu.admin_config',
    'panel/formularios': 'menu.forms',
    'panel/misformularios': 'menu.my_forms',
    'panel/misalojamientos': 'menu.my_accommodations',
    'panel/misreservas': 'menu.my_reservations',
    'panel/misprotocolos': 'menu.my_protocols',
    'admin/precios': 'menu.prices',
    'admin/facturacion/index': 'menu.billing',
    'admin/historialcontable': 'menu.historialpagos',
    'panel/mensajes': 'menu.messages_personal',
    'panel/mensajes_institucion': 'menu.messages_institucional',
    'admin/comunicacion/noticias': 'menu.news_admin',
    'panel/noticias': 'menu.news_portal',
    'panel/perfil': 'menu.config',
    'panel/soporte': 'menu.help_ticket',
    'panel/ventas': 'menu.help_ventas',
    'panel/capacitacion': 'menu.help_capacitacion',
    'capacitacion/tema/red': 'capacitacion.red_menu_label',
  };
  const key = map[path];
  if (key) {
    const v = t(key, '');
    if (v) return v;
  }
  return path;
}

function topicHtml(slug, menuPath, title) {
  const pack = getManualPack();
  const chapter = pack[slug];

  if (chapter && Array.isArray(chapter.blocks) && chapter.blocks.length > 0) {
    const accId = `cap-acc-${String(slug).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const rolesLabel = escapeHtml(t('capacitacion.roles_label', 'Rol y alcance'));
    const helpTitle = escapeHtml(t('capacitacion.content_help_title', 'Cómo usar este tutorial'));
    const helpBody = escapeHtml(
      t(
        'capacitacion.content_help_body',
        'Despliegue cada apartado del acordeón. Si algo no cuadra con su sede, confirme con administración local. Para fallos del sistema use Ayuda → Ticket/Contacto.'
      )
    );

    let html = '<div class="manual-topic">';
    html += `<div class="alert alert-success border-success-subtle py-2 px-3 small mb-3" role="status">
      <div class="fw-bold text-success-emphasis mb-1"><i class="bi bi-lightbulb me-1"></i>${helpTitle}</div>
      <div class="mb-0 text-body-secondary">${helpBody}</div>
    </div>`;

    if (chapter.summary) {
      html += `<p class="lead small mb-2">${escapeHtml(chapter.summary)}</p>`;
    }
    if (chapter.roles) {
      html += `<p class="small border-start border-success border-3 ps-2 mb-3 text-body-secondary"><span class="text-dark fw-semibold">${rolesLabel}:</span> ${escapeHtml(chapter.roles)}</p>`;
    }

    html += `<div class="accordion accordion-flush manual-accordion" id="${accId}">`;
    chapter.blocks.forEach((b, i) => {
      const hId = `${accId}-h-${i}`;
      const cId = `${accId}-c-${i}`;
      const open = i === 0;
      html += `<div class="accordion-item border rounded mb-2 overflow-hidden">
        <h3 class="accordion-header m-0" id="${hId}">
          <button class="accordion-button fw-semibold small ${open ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${cId}" aria-expanded="${open}" aria-controls="${cId}">
            ${escapeHtml(b.h)}
          </button>
        </h3>
        <div id="${cId}" class="accordion-collapse collapse ${open ? 'show' : ''}" aria-labelledby="${hId}" data-bs-parent="#${accId}">
          <div class="accordion-body small">${b.html}</div>
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
    '<p class="mb-0">En <strong>{title}</strong> (<code>{path}</code>) encontrará las herramientas asociadas a su rol. Use el menú lateral y los botones de la pantalla. Para incidencias, abra un ticket en Ayuda → Ticket/Contacto.</p>'
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

  const ordered = CAPACITACION_PATH_ORDER.filter((p) => allowed.has(p));
  const rest = [...allowed].filter((p) => !ordered.includes(p)).sort();
  const paths = [...ordered, ...rest];

  const listEl = document.getElementById('cap-list');
  const titleEl = document.getElementById('cap-content-title');
  const bodyEl = document.getElementById('cap-content-body');

  if (!listEl || !titleEl || !bodyEl) return;

  if (paths.length === 0) {
    listEl.innerHTML = `<div class="list-group-item small text-muted">${escapeHtml(t('capacitacion.no_topics', 'No hay secciones disponibles.'))}</div>`;
    titleEl.textContent = '';
    bodyEl.innerHTML = '';
    return;
  }

  function showTopicBySlug(slug) {
    const menuPath = slugToMenuPath(slug);
    if (!menuPath || !allowed.has(menuPath)) return false;
    const title = labelForMenuPath(menuPath);
    titleEl.textContent = title;
    bodyEl.innerHTML = topicHtml(slug, menuPath, title);
    listEl.querySelectorAll('[data-cap-slug]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-cap-slug') === slug);
    });
    setHashTopic(slug);
    return true;
  }

  listEl.innerHTML = paths
    .map((path) => {
      const slug = menuPathToSlug(path);
      const label = labelForMenuPath(path);
      return `<button type="button" class="list-group-item list-group-item-action text-start py-2 small fw-semibold" data-cap-slug="${escapeHtml(slug)}">${escapeHtml(label)}</button>`;
    })
    .join('');

  listEl.querySelectorAll('[data-cap-slug]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.getAttribute('data-cap-slug');
      if (slug) showTopicBySlug(slug);
    });
  });

  let initial = parseHashTopic();
  if (!initial || !showTopicBySlug(initial)) {
    const firstSlug = menuPathToSlug(paths[0]);
    showTopicBySlug(firstSlug);
  }

  window.addEventListener('hashchange', () => {
    const slug = parseHashTopic();
    if (slug) showTopicBySlug(slug);
  });
}
