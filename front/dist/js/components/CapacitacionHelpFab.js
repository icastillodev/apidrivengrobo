import { Auth } from '../auth.js';
import { API } from '../api.js';
import { syncCapUiPrefsToBackend } from '../utils/userCapUiPrefsBackend.js';
import { filterMenuIdsByModulos, ensureInstModulesLoaded } from '../modulesAccess.js';
import { pathnameToMenuPath, menuPathToSlug } from '../utils/capacitacionPaths.js';
import { labelCapacitacionMenuPath } from '../utils/capacitacionLabels.js';
import { collectMenuPathsFromIds, expandFacturacionPathsIfAllowed } from '../utils/capacitacionMenuPaths.js';
import { startCapacitacionInteractiveTour } from './CapacitacionInteractiveTour.js';

export const FAB_HIDDEN_KEY = 'gecko_hide_capacitacion_fab';

const FAB_ID = 'gecko-capacitacion-fab';
const MODAL_HELP_ID = 'gecko-capacitacion-modal-help';

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

export function isCapacitacionFabHidden() {
  return localStorage.getItem(FAB_HIDDEN_KEY) === '1';
}

export function setCapacitacionFabHidden(hidden) {
  if (hidden) localStorage.setItem(FAB_HIDDEN_KEY, '1');
  else localStorage.removeItem(FAB_HIDDEN_KEY);
  syncCapUiPrefsToBackend();
}

function removeModalHelpStrip() {
  document.getElementById(MODAL_HELP_ID)?.remove();
}

function removeFab() {
  document.getElementById(FAB_ID)?.remove();
  removeModalHelpStrip();
  document.body.classList.remove('gecko-capacitacion-fab-pad');
  delete window.__geckoCapHelpCtx;
}

function capacitacionHref(slug) {
  const base = Auth.getBasePath();
  const root = base.endsWith('/') ? base : `${base}/`;
  const hash = slug ? `#t=${encodeURIComponent(slug)}` : '';
  return `${root}paginas/panel/capacitacion.html${hash}`;
}

function ensureFabStyles() {
  if (document.getElementById('gecko-capacitacion-fab-style')) return;
  const s = document.createElement('style');
  s.id = 'gecko-capacitacion-fab-style';
  s.textContent =
    'body.gecko-capacitacion-fab-pad{padding-bottom:88px!important;}' +
    '#gecko-capacitacion-fab .gecko-fab-actions{flex-wrap:wrap;}' +
    '#gecko-capacitacion-modal-help{position:fixed;left:0;right:0;bottom:0;z-index:1060;padding:8px 12px;' +
    'backdrop-filter:saturate(1.2) blur(6px);}' +
    '#gecko-capacitacion-modal-help .gecko-modal-help-actions{flex-wrap:wrap;}';
  document.head.appendChild(s);
}

let modalHelpDelegationBound = false;

/**
 * Botón de tour de ventanas emergentes en la barra y filas del menú Ayuda (?): solo visibles con `.modal.show`.
 */
export function syncModalsTourEntrypoints() {
  const open = !!document.querySelector('.modal.show');
  document.querySelectorAll('.gecko-help-modals-tour-item').forEach((li) => {
    li.classList.toggle('d-none', !open);
  });
  document.querySelectorAll('#gecko-capacitacion-fab .gecko-fab-tour-modals').forEach((btn) => {
    btn.classList.toggle('d-none', !open);
  });
}

/**
 * Misma preferencia que la barra inferior: si la barra está oculta, no se muestra esta franja sobre modales.
 */
export function initCapacitacionModalHelpDelegation() {
  if (modalHelpDelegationBound) return;
  modalHelpDelegationBound = true;

  document.addEventListener('shown.bs.modal', () => {
    if (isCapacitacionFabHidden()) return;
    if (!window.__geckoCapHelpCtx?.menuPath) return;
    if (!document.querySelector('.modal.show')) return;
    mountCapacitacionModalHelpStrip();
    syncModalsTourEntrypoints();
  });

  document.addEventListener('hidden.bs.modal', () => {
    if (!document.querySelector('.modal.show')) removeModalHelpStrip();
    syncModalsTourEntrypoints();
  });

  syncModalsTourEntrypoints();
}

function mountCapacitacionModalHelpStrip() {
  if (isCapacitacionFabHidden()) return;
  const ctx = window.__geckoCapHelpCtx;
  if (!ctx?.menuPath || !ctx.slug) return;
  if (document.getElementById(MODAL_HELP_ID)) return;

  ensureFabStyles();

  const topicTitle = ctx.topicTitle || '';
  const linkAriaRaw = t('capacitacion.fab_open_topic_aria', 'Abrir en capacitación el documento de ayuda: {title}').replace(
    /\{title\}/g,
    topicTitle
  );
  const linkAria = linkAriaRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const modalTitle = t('capacitacion.modal_help_title', 'Ayuda con esta ventana');
  const modalSub = t(
    'capacitacion.modal_help_sub',
    'La barra inferior queda detrás del fondo oscuro; aquí puede abrir el manual o el tutorial sobre ventanas emergentes.'
  );
  const btnModalsTour = t('capacitacion.modal_help_tour_modals_btn', 'Tutorial: ventanas emergentes');
  const modalsTourAria = t(
    'capacitacion.modal_help_tour_modals_aria',
    'Iniciar tutorial sobre cómo funcionan las ventanas emergentes'
  ).replace(/"/g, '&quot;');
  const btnDismiss = t('capacitacion.fab_dismiss_bar', 'No mostrar más esta barra');
  const dismissAria = btnDismiss.replace(/"/g, '&quot;');

  const bar = document.createElement('div');
  bar.id = MODAL_HELP_ID;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', t('capacitacion.modal_help_region', 'Ayuda contextual en ventana emergente'));
  bar.className = 'border-top shadow-lg bg-white bg-opacity-95';

  bar.innerHTML = `
    <div class="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div class="d-flex align-items-start gap-2 min-w-0" style="flex:1 1 180px;">
        <span class="text-success fs-5 lh-1 flex-shrink-0" aria-hidden="true"><i class="bi bi-window-stack"></i></span>
        <div class="min-w-0">
          <div class="small fw-bold text-dark mb-0">${modalTitle}</div>
          <div class="small text-muted mb-0">${modalSub}</div>
        </div>
      </div>
      <div class="d-flex flex-wrap align-items-center gap-2 gecko-modal-help-actions">
        <a class="btn btn-success btn-sm fw-bold text-nowrap shadow-sm" href="${capacitacionHref(ctx.slug)}" aria-label="${linkAria}">
          <i class="bi bi-book-half me-1"></i>${t('capacitacion.fab_btn', 'Ver documento de ayuda')}
        </a>
        <button type="button" class="btn btn-outline-success btn-sm fw-bold text-nowrap shadow-sm gecko-modal-help-tour-modals" aria-label="${modalsTourAria}">
          <i class="bi bi-lightning-charge me-1"></i>${btnModalsTour}
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm gecko-modal-help-dismiss text-nowrap" aria-label="${dismissAria}">
          ${btnDismiss}
        </button>
      </div>
    </div>
  `;

  bar.querySelector('.gecko-modal-help-tour-modals')?.addEventListener('click', () => {
    startCapacitacionInteractiveTour('__modals__', { manual: true, hostMenuPath: ctx.menuPath });
  });

  bar.querySelector('.gecko-modal-help-dismiss')?.addEventListener('click', () => {
    setCapacitacionFabHidden(true);
    removeFab();
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: t('capacitacion.fab_dismiss_toast_title', 'Barra oculta'),
        html: `<p class="small mb-0">${t(
          'capacitacion.fab_dismiss_toast_body',
          'Puede volver a activarla en Ayuda → Capacitación o en el menú del botón Ayuda junto a Excel.'
        )}</p>`,
        timer: 4500,
        showConfirmButton: true,
        confirmButtonText: t('capacitacion.fab_dismiss_ok', 'Entendido'),
      });
    }
  });

  document.body.appendChild(bar);
}

/**
 * Vuelve a evaluar si debe mostrarse la barra (tras cambiar preferencia en Capacitación o menú contextual).
 */
export async function refreshCapacitacionHelpFab() {
  return initCapacitacionHelpFab();
}

/**
 * Barra fija inferior: manual en capacitación, tutorial interactivo, ocultar barra.
 */
export async function initCapacitacionHelpFab() {
  removeFab();
  ensureFabStyles();

  const pathname = window.location.pathname || '';
  if (!pathname.toLowerCase().includes('/paginas/')) return;
  if (pathname.toLowerCase().includes('capacitacion.html')) return;
  if (isCapacitacionFabHidden()) return;

  const menuPath = pathnameToMenuPath(pathname);
  if (!menuPath) return;

  const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
  if (!roleId || Number.isNaN(roleId)) return;

  const instId = parseInt(sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0', 10) || 0;

  await ensureInstModulesLoaded(API.request.bind(API));

  let menuIds = [];
  try {
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
  } catch {
    return;
  }

  const allowed = collectMenuPathsFromIds(menuIds, roleId);
  if ([1, 2, 4].includes(roleId)) {
    allowed.add('admin/dashboard');
  } else {
    allowed.add('panel/dashboard');
  }
  allowed.add('capacitacion/tema/red');
  expandFacturacionPathsIfAllowed(allowed);
  if (!allowed.has(menuPath)) {
    return;
  }

  const slug = menuPathToSlug(menuPath);
  const topicTitle = labelCapacitacionMenuPath(menuPath, t);
  const linkAriaRaw = t('capacitacion.fab_open_topic_aria', 'Abrir en capacitación el documento de ayuda: {title}').replace(
    /\{title\}/g,
    topicTitle
  );
  const linkAria = linkAriaRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const bar = document.createElement('div');
  bar.id = FAB_ID;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', t('capacitacion.fab_region', 'Ayuda contextual'));
  bar.className = 'border-top shadow-lg bg-white bg-opacity-95';
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:1040;padding:10px 12px;' +
    'backdrop-filter:saturate(1.2) blur(6px);';

  const fabTitle = t('capacitacion.fab_hint_title', t('capacitacion.fab_hint', '¿Necesita ayuda con esta pantalla?'));
  const fabSub = t('capacitacion.fab_hint_sub', 'Abre el manual de esta sección con apartados detallados y rol.');
  const btnInteractive = t('capacitacion.fab_interactive_btn', 'Tutorial interactivo');
  const btnDismiss = t('capacitacion.fab_dismiss_bar', 'No mostrar más esta barra');
  const interactiveAria = t('capacitacion.fab_interactive_aria', 'Iniciar tutorial interactivo de esta pantalla').replace(
    /"/g,
    '&quot;'
  );
  const btnModalsTour = t('capacitacion.modal_help_tour_modals_btn', 'Tutorial: ventanas emergentes');
  const modalsTourFabAria = t(
    'capacitacion.fab_tour_modals_aria',
    'Iniciar tutorial sobre ventanas emergentes (con y sin ventana abierta)'
  ).replace(/"/g, '&quot;');

  bar.innerHTML = `
    <div class="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div class="d-flex align-items-start gap-2 min-w-0" style="flex:1 1 200px;">
        <span class="text-success fs-5 lh-1 flex-shrink-0" aria-hidden="true"><i class="bi bi-journal-richtext"></i></span>
        <div class="min-w-0">
          <div class="small fw-bold text-dark mb-0">${fabTitle}</div>
          <div class="small text-muted mb-0">${fabSub}</div>
        </div>
      </div>
      <div class="d-flex flex-wrap align-items-center gap-2 gecko-fab-actions">
        <a class="btn btn-success btn-sm fw-bold text-nowrap shadow-sm" href="${capacitacionHref(slug)}" aria-label="${linkAria}">
          <i class="bi bi-book-half me-1"></i>${t('capacitacion.fab_btn', 'Ver documento de ayuda')}
        </a>
        <button type="button" class="btn btn-outline-success btn-sm fw-bold text-nowrap shadow-sm gecko-fab-interactive" aria-label="${interactiveAria}">
          <i class="bi bi-lightning-charge me-1"></i>${btnInteractive}
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm fw-bold text-nowrap shadow-sm gecko-fab-tour-modals d-none" aria-label="${modalsTourFabAria}">
          <i class="bi bi-window-stack me-1"></i>${btnModalsTour}
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm gecko-fab-dismiss text-nowrap" aria-label="${btnDismiss.replace(/"/g, '&quot;')}">
          ${btnDismiss}
        </button>
      </div>
    </div>
  `;

  bar.querySelector('.gecko-fab-interactive')?.addEventListener('click', () => {
    startCapacitacionInteractiveTour(menuPath, { manual: true, hostMenuPath: menuPath });
  });

  bar.querySelector('.gecko-fab-tour-modals')?.addEventListener('click', () => {
    startCapacitacionInteractiveTour('__modals__', { manual: true, hostMenuPath: menuPath });
  });

  window.__geckoCapHelpCtx = { menuPath, slug, topicTitle };

  bar.querySelector('.gecko-fab-dismiss')?.addEventListener('click', () => {
    setCapacitacionFabHidden(true);
    removeFab();
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: t('capacitacion.fab_dismiss_toast_title', 'Barra oculta'),
        html: `<p class="small mb-0">${t(
          'capacitacion.fab_dismiss_toast_body',
          'Puede volver a activarla en Ayuda → Capacitación o en el menú del botón Ayuda junto a Excel.'
        )}</p>`,
        timer: 4500,
        showConfirmButton: true,
        confirmButtonText: t('capacitacion.fab_dismiss_ok', 'Entendido'),
      });
    }
  });

  document.body.appendChild(bar);
  document.body.classList.add('gecko-capacitacion-fab-pad');

  if (document.querySelector('.modal.show')) {
    mountCapacitacionModalHelpStrip();
  }
  syncModalsTourEntrypoints();
}
