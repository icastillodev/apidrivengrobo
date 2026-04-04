/**
 * Una sola vez por usuario e institución: clave auxiliar (el asistente inicial marca el mismo hecho al terminar).
 */
export function firstRunLangStorageKey() {
  const uid = sessionStorage.getItem('userId') || localStorage.getItem('userId') || '';
  const inst = sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0';
  return `gecko_first_ui_lang_v1_${inst}_${uid}`;
}

export function hasCompletedFirstRunLanguagePick() {
  try {
    return localStorage.getItem(firstRunLangStorageKey()) === '1';
  } catch {
    return true;
  }
}

export function markFirstRunLanguageDone() {
  try {
    localStorage.setItem(firstRunLangStorageKey(), '1');
  } catch {
    /* ignore */
  }
}

/**
 * Antes: modal Swal “Elegí el idioma…” en dashboard. La guarda estaba invertida (`!isSetupWizardDone()`),
 * así que se mostraba cuando el asistente **ya** estaba hecho (idioma ya elegido en paso 0), en cada
 * visita al dashboard si `gecko_first_ui_lang_*` no persistía tras login igual que `gecko_cap_tour_*`.
 *
 * El idioma inicial lo cubre el asistente (banderas) y `GET /user/config/get` + `loadLanguage` en MenuConfig.
 * No duplicar con otro modal aquí.
 *
 * @param {(code: string|null) => Promise<boolean|void>} [_loadLanguage]
 * @param {() => void} [_translatePage]
 */
export async function ensureFirstRunLanguagePick(_loadLanguage, _translatePage) {
  return;
}
