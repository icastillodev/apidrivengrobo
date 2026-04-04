import { API } from '../api.js';
import { Auth } from '../auth.js';
import { loadCapacitacionTourPrefs } from './capacitacionTourPrefs.js';

const FAB_HIDDEN_KEY = 'gecko_hide_capacitacion_fab';

let _debounceTimer = null;

function buildSnapshotBody() {
  const p = loadCapacitacionTourPrefs();
  let noticiasIso = '';
  try {
    noticiasIso = localStorage.getItem('grobo_noticias_vista_hasta') || '';
  } catch {
    /* ignore */
  }
  const capToursStateJson = JSON.stringify({
    welcomeDone: !!p.welcomeDone,
    routesSeen: p.routesSeen && typeof p.routesSeen === 'object' ? p.routesSeen : {},
  });
  return {
    setupWizardDone: p.setupWizardDone ? 1 : 0,
    capAutoTourOff: p.autoAllOff ? 1 : 0,
    capHelpFabHidden: localStorage.getItem(FAB_HIDDEN_KEY) === '1' ? 1 : 0,
    ...(noticiasIso.trim() !== '' ? { noticiasVistaHasta: noticiasIso } : {}),
    capToursStateJson,
  };
}

/**
 * Sincroniza personae: asistente inicial, tours, FAB ayuda, cursor noticias, estado tours (JSON).
 */
export function syncCapUiPrefsToBackend() {
  const userId = Auth.getVal('userId');
  if (!userId) return Promise.resolve();

  const body = buildSnapshotBody();
  return API.request('/user/config/update', 'POST', body).catch((e) => {
    console.warn('syncCapUiPrefsToBackend:', e);
    return { status: 'error' };
  });
}

/** Evita martillar POST en cada paso del tour; unifica en un snapshot. */
export function scheduleCapUiPrefsToBackend(delayMs = 450) {
  const userId = Auth.getVal('userId');
  if (!userId) return;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    syncCapUiPrefsToBackend().catch(() => {});
  }, delayMs);
}

/**
 * Tras GET /user/config/get: si en BD hay cursor de noticias más reciente que localStorage, lo aplica.
 */
export function mergeNoticiasVistaFromServer(db) {
  if (!db || typeof db !== 'object') return;
  const raw = db.noticias_vista_hasta;
  if (raw == null || String(raw).trim() === '') return;
  const dbMs = new Date(String(raw).replace(' ', 'T')).getTime();
  if (Number.isNaN(dbMs)) return;
  let lsMs = 0;
  try {
    const prev = localStorage.getItem('grobo_noticias_vista_hasta');
    if (prev) {
      const t = new Date(prev).getTime();
      if (!Number.isNaN(t)) lsMs = t;
    }
  } catch {
    /* ignore */
  }
  if (dbMs > lsMs) {
    try {
      localStorage.setItem('grobo_noticias_vista_hasta', new Date(dbMs).toISOString());
    } catch {
      /* ignore */
    }
  }
}
