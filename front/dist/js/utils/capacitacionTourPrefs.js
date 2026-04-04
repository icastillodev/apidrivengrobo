import { markFirstRunLanguageDone } from './firstRunLanguageOnboarding.js';

/**
 * Preferencias de tutorial automático (localStorage, por usuario e institución en sesión).
 * Sincronización con BD: setup_wizard_done, cap_auto_tour_off, cap_help_fab_hidden (ver userCapUiPrefsBackend).
 */
const STORAGE_VER = 'v2';

function sessionOrLocal(key) {
  return sessionStorage.getItem(key) || localStorage.getItem(key);
}

function prefsKey() {
  const uid = sessionOrLocal('userId') || 'anon';
  const inst = sessionOrLocal('instId') || '0';
  return `gecko_cap_tour_${STORAGE_VER}_${inst}_${uid}`;
}

function scheduleSyncCapUiPrefs() {
  import('./userCapUiPrefsBackend.js')
    .then((m) => m.scheduleCapUiPrefsToBackend())
    .catch(() => {});
}

const PREFS_DEFAULT = {
  welcomeDone: false,
  autoAllOff: false,
  routesSeen: {},
  setupWizardDone: false,
};

export function loadCapacitacionTourPrefs() {
  try {
    const raw = localStorage.getItem(prefsKey());
    if (!raw) return { ...PREFS_DEFAULT };
    const o = JSON.parse(raw);
    const welcomeDone = !!o.welcomeDone;
    /**
     * setupWizardDone solo es true si el usuario terminó el asistente inicial (clave guardada).
     * En producción antes de este flujo no existía la clave: se trata como false para que
     * usuarios ya dados de alta vean una vez la configuración inicial (idioma, tema, letra, menú).
     * No se infiere desde welcomeDone: quien ya hizo el tour de bienvenida igual debe pasar el asistente.
     */
    const setupWizardDone =
      typeof o.setupWizardDone === 'boolean' ? o.setupWizardDone : false;
    return {
      welcomeDone,
      autoAllOff: !!o.autoAllOff,
      routesSeen: o.routesSeen && typeof o.routesSeen === 'object' ? o.routesSeen : {},
      setupWizardDone,
    };
  } catch {
    return { ...PREFS_DEFAULT };
  }
}

function saveCapacitacionTourPrefs(prefs) {
  try {
    localStorage.setItem(prefsKey(), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function markWelcomeTourDone() {
  const p = loadCapacitacionTourPrefs();
  p.welcomeDone = true;
  saveCapacitacionTourPrefs(p);
  scheduleSyncCapUiPrefs();
}

export function isWelcomeTourDone() {
  return loadCapacitacionTourPrefs().welcomeDone;
}

export function markSetupWizardDone() {
  const p = loadCapacitacionTourPrefs();
  p.setupWizardDone = true;
  saveCapacitacionTourPrefs(p);
  /* sync a BD: CapacitacionSetupWizard hace await syncCapUiPrefsToBackend() antes del reload */
}

export function isSetupWizardDone() {
  return loadCapacitacionTourPrefs().setupWizardDone;
}

export function setAutoToursGloballyDisabled(off) {
  const p = loadCapacitacionTourPrefs();
  p.autoAllOff = !!off;
  saveCapacitacionTourPrefs(p);
  scheduleSyncCapUiPrefs();
}

export function isAutoToursGloballyDisabled() {
  return loadCapacitacionTourPrefs().autoAllOff;
}

export function markRouteTourSeen(menuPath) {
  if (!menuPath || menuPath === '__welcome__') return;
  const p = loadCapacitacionTourPrefs();
  if (!p.routesSeen) p.routesSeen = {};
  p.routesSeen[menuPath] = true;
  saveCapacitacionTourPrefs(p);
  scheduleSyncCapUiPrefs();
}

export function isRouteTourSeen(menuPath) {
  if (!menuPath || menuPath === '__welcome__') return false;
  return !!loadCapacitacionTourPrefs().routesSeen[menuPath];
}

export function clearRouteTourSeen(menuPath) {
  if (!menuPath || menuPath === '__welcome__') return;
  const p = loadCapacitacionTourPrefs();
  if (p.routesSeen && p.routesSeen[menuPath]) {
    delete p.routesSeen[menuPath];
    saveCapacitacionTourPrefs(p);
  }
}

/**
 * Tras GET /user/config/get: aplica flags de BD sobre localStorage (nuevo dispositivo / caché limpio).
 * Solo fuerza valores cuando el servidor marca 1: si la columna sigue en 0 tras migración, no pisamos
 * preferencias ya guardadas en este navegador.
 */
export function mergeCapacitacionPrefsFromServer(db) {
  if (!db || typeof db !== 'object') return;

  const p = loadCapacitacionTourPrefs();
  let changed = false;

  if (parseInt(String(db.setup_wizard_done), 10) === 1) {
    if (!p.setupWizardDone) {
      p.setupWizardDone = true;
      changed = true;
    }
    markFirstRunLanguageDone();
  }

  if (parseInt(String(db.cap_auto_tour_off), 10) === 1 && !p.autoAllOff) {
    p.autoAllOff = true;
    changed = true;
  }

  if (changed) saveCapacitacionTourPrefs(p);

  if (parseInt(String(db.cap_help_fab_hidden), 10) === 1) {
    localStorage.setItem('gecko_hide_capacitacion_fab', '1');
  }

  mergeCapToursStateFromServerJson(db.cap_tours_state_json);
}

/**
 * Une welcomeDone y routesSeen desde personae.cap_tours_state_json (otro dispositivo / caché limpio).
 */
function mergeCapToursStateFromServerJson(raw) {
  if (raw == null || String(raw).trim() === '') return;
  let o;
  try {
    o = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return;
  }
  if (!o || typeof o !== 'object') return;
  const p = loadCapacitacionTourPrefs();
  let changed = false;
  if (o.welcomeDone === true && !p.welcomeDone) {
    p.welcomeDone = true;
    changed = true;
  }
  const rs = o.routesSeen;
  if (rs && typeof rs === 'object') {
    if (!p.routesSeen) p.routesSeen = {};
    for (const [k, v] of Object.entries(rs)) {
      if (v && !p.routesSeen[k]) {
        p.routesSeen[k] = true;
        changed = true;
      }
    }
  }
  if (changed) saveCapacitacionTourPrefs(p);
}
