/**
 * Preferencias de tutorial automático (localStorage, por usuario e institución en sesión).
 */
const STORAGE_VER = 'v2';

function prefsKey() {
  const uid = sessionStorage.getItem('userId') || 'anon';
  const inst = sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0';
  return `gecko_cap_tour_${STORAGE_VER}_${inst}_${uid}`;
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
}

export function isWelcomeTourDone() {
  return loadCapacitacionTourPrefs().welcomeDone;
}

export function markSetupWizardDone() {
  const p = loadCapacitacionTourPrefs();
  p.setupWizardDone = true;
  saveCapacitacionTourPrefs(p);
}

export function isSetupWizardDone() {
  return loadCapacitacionTourPrefs().setupWizardDone;
}

export function setAutoToursGloballyDisabled(off) {
  const p = loadCapacitacionTourPrefs();
  p.autoAllOff = !!off;
  saveCapacitacionTourPrefs(p);
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
