import { API } from '../api.js';
import { isSetupWizardDone } from './capacitacionTourPrefs.js';

/**
 * Una sola vez por usuario e institución: elegir idioma de la interfaz antes del resto del onboarding en el panel.
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
 * Muestra el selector de idioma (Swal) si aún no se completó para este usuario/sede.
 * Debe ejecutarse después de Auth.checkAccess y antes del modal de seguridad y de initMenu.
 * @param {(code: string|null) => Promise<boolean|void>} loadLanguage
 * @param {() => void} [translatePage]
 */
export async function ensureFirstRunLanguagePick(loadLanguage, translatePage) {
  /** El asistente inicial (banderas + tema + letra) ya pide idioma; no duplicar con este Swal. */
  if (!isSetupWizardDone()) return;

  if (hasCompletedFirstRunLanguagePick()) return;

  const uid = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  if (!uid) {
    markFirstRunLanguageDone();
    return;
  }

  if (typeof Swal === 'undefined') {
    markFirstRunLanguageDone();
    return;
  }

  const chosen = await new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Swal.fire({
      title: 'GROBO',
      html: `
        <p class="text-muted small mb-1" style="line-height:1.4;">
          Elegí el idioma de la aplicación
          <span class="text-body-secondary">· Choose your language · Escolha o idioma</span>
        </p>
        <p class="small text-body-secondary mb-3">
          Solo esta vez en el ingreso; después podés cambiarlo con la bandera del menú.
          <br><em>Once on first entry; later use the menu language flag.</em>
        </p>
        <div class="d-grid gap-2 px-1">
          <button type="button" class="btn btn-success gecko-pick-lang" data-lang="es">Español</button>
          <button type="button" class="btn btn-outline-success gecko-pick-lang" data-lang="en">English</button>
          <button type="button" class="btn btn-outline-success gecko-pick-lang" data-lang="pt">Português</button>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (popup) => {
        const root =
          popup && typeof popup.querySelectorAll === 'function'
            ? popup
            : typeof Swal.getPopup === 'function'
              ? Swal.getPopup()
              : null;
        if (!root) {
          try {
            Swal.close();
          } catch {
            /* ignore */
          }
          finish(null);
          return;
        }
        root.querySelectorAll('.gecko-pick-lang').forEach((btn) => {
          btn.addEventListener(
            'click',
            () => {
              const lang = btn.getAttribute('data-lang');
              if (['es', 'en', 'pt'].includes(lang)) {
                Swal.close();
                finish(lang);
              }
            },
            { once: true }
          );
        });
      },
    })
      .then(() => {
        if (!settled) finish(null);
      })
      .catch(() => {
        if (!settled) finish(null);
      });
  });

  if (!chosen || !['es', 'en', 'pt'].includes(chosen)) {
    markFirstRunLanguageDone();
    return;
  }

  localStorage.setItem('lang', chosen);
  localStorage.setItem('idioma', chosen);
  try {
    await API.request('/user/config/update', 'POST', { lang: chosen });
  } catch (e) {
    console.warn('firstRunLanguageOnboarding: no se pudo persistir idioma en BD', e);
  }

  markFirstRunLanguageDone();

  if (typeof loadLanguage === 'function') {
    await loadLanguage(chosen);
  }
  if (typeof translatePage === 'function') {
    translatePage();
  }
}
