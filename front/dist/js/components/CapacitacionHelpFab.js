import { Auth } from '../auth.js';
import { API } from '../api.js';
import { filterMenuIdsByModulos, ensureInstModulesLoaded } from '../modulesAccess.js';
import { pathnameToMenuPath, menuPathToSlug } from '../utils/capacitacionPaths.js';
import { collectMenuPathsFromIds } from '../utils/capacitacionMenuPaths.js';

const FAB_ID = 'gecko-capacitacion-fab';

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function removeFab() {
  document.getElementById(FAB_ID)?.remove();
  document.body.classList.remove('gecko-capacitacion-fab-pad');
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
  s.textContent = 'body.gecko-capacitacion-fab-pad{padding-bottom:72px!important;}';
  document.head.appendChild(s);
}

/**
 * Barra fija inferior con enlace al manual de la pantalla actual (si aplica).
 */
export async function initCapacitacionHelpFab() {
  removeFab();
  ensureFabStyles();

  const pathname = window.location.pathname || '';
  if (!pathname.toLowerCase().includes('/paginas/')) return;
  if (pathname.toLowerCase().includes('capacitacion.html')) return;

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
  if (!allowed.has(menuPath)) {
    return;
  }

  const slug = menuPathToSlug(menuPath);
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
  bar.innerHTML = `
    <div class="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div class="d-flex align-items-start gap-2 min-w-0" style="flex:1 1 200px;">
        <span class="text-success fs-5 lh-1 flex-shrink-0" aria-hidden="true"><i class="bi bi-journal-richtext"></i></span>
        <div class="min-w-0">
          <div class="small fw-bold text-dark mb-0">${fabTitle}</div>
          <div class="small text-muted mb-0">${fabSub}</div>
        </div>
      </div>
      <a class="btn btn-success btn-sm fw-bold text-nowrap shadow-sm" href="${capacitacionHref(slug)}">
        <i class="bi bi-book-half me-1"></i>${t('capacitacion.fab_btn', 'Ver tutorial en capacitación')}
      </a>
    </div>
  `;

  document.body.appendChild(bar);
  document.body.classList.add('gecko-capacitacion-fab-pad');
}
