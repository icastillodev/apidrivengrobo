/**
 * Preferencias de onboarding / tours / barra de ayuda en localStorage.
 * No deben borrarse con localStorage.clear() en login o expulsión, o el asistente
 * (idioma, tema, letra, menú) se repite en cada ingreso.
 */
export function snapshotGroboPersistentUiPrefs() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('gecko_cap_tour_') ||
        k.startsWith('gecko_first_ui_lang_') ||
        k === 'gecko_hide_capacitacion_fab'
      ) {
        out[k] = localStorage.getItem(k);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function restoreGroboPersistentUiPrefs(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  try {
    Object.entries(snapshot).forEach(([k, v]) => {
      if (v != null && k) localStorage.setItem(k, v);
    });
  } catch {
    /* ignore */
  }
}
