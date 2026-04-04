/**
 * Asistente inicial (primera sesión): idioma (banderas), tema, tamaño de letra, menú arriba o lateral.
 * Al terminar recarga la página para aplicar el diseño del menú; luego el tour de bienvenida arranca solo.
 */
import { UserPreferences } from './menujs/MenuConfig.js';
import { markSetupWizardDone } from '../utils/capacitacionTourPrefs.js';
import { markFirstRunLanguageDone } from '../utils/firstRunLanguageOnboarding.js';

const ROOT_ID = 'gecko-cap-setup-wizard';

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function startCapacitacionSetupWizard() {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3';
  root.style.cssText =
    'z-index:1040;background:rgba(15,23,42,0.88);backdrop-filter:blur(6px);';

  root.innerHTML = `
    <div class="card shadow-lg border-0 w-100 gecko-setup-card" style="max-width:520px;max-height:min(92vh,640px);overflow:auto;">
      <div class="card-body p-3 p-md-4">
        <div class="text-success text-uppercase small fw-bold mb-1" id="gecko-setup-category"></div>
        <p class="text-body-secondary small mb-3" id="gecko-setup-hint"></p>
        <div id="gecko-setup-body" class="mb-3"></div>
        <p class="small text-muted mb-3 d-none" id="gecko-setup-menu-hint"></p>
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center pt-2 border-top">
          <button type="button" class="btn btn-outline-secondary btn-sm px-3" id="gecko-setup-back"></button>
          <button type="button" class="btn btn-success btn-sm px-4 fw-semibold" id="gecko-setup-next" disabled></button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(root);

  let step = 0;
  const done = { lang: false, theme: false, font: false, layout: false };

  const btnBack = root.querySelector('#gecko-setup-back');
  const btnNext = root.querySelector('#gecko-setup-next');
  const elCat = root.querySelector('#gecko-setup-category');
  const elHint = root.querySelector('#gecko-setup-hint');
  const elBody = root.querySelector('#gecko-setup-body');
  const elMenuHint = root.querySelector('#gecko-setup-menu-hint');

  const FLAG = {
    es: 'https://flagcdn.com/w80/es.png',
    en: 'https://flagcdn.com/w80/us.png',
    pt: 'https://flagcdn.com/w80/br.png',
  };

  function stepReady() {
    if (step === 0) return done.lang;
    if (step === 1) return done.theme;
    if (step === 2) return done.font;
    return done.layout;
  }

  function syncButtons() {
    btnBack.textContent = t('capacitacion.setup_back', 'Atrás');
    btnBack.classList.toggle('invisible', step === 0);
    btnBack.disabled = step === 0;
    const last = step === 3;
    btnNext.textContent = last
      ? t('capacitacion.setup_continue', 'Continuar')
      : t('capacitacion.setup_next', 'Siguiente');
    btnNext.disabled = !stepReady();
  }

  async function pickLang(code) {
    await UserPreferences.applyLanguageChoice(code);
    done.lang = true;
    render();
  }

  async function pickTheme(theme) {
    await UserPreferences.setThemeChoice(theme);
    done.theme = true;
    elMenuHint.textContent = t(
      'capacitacion.setup_theme_menu_hint',
      'Puede cambiar idioma, tema y tamaño cuando quiera desde la barra del menú (bandera, sol/luna, icono de letra).'
    );
    elMenuHint.classList.remove('d-none');
    render();
  }

  async function pickFont(size) {
    await UserPreferences.setFontSizeChoice(size);
    done.font = true;
    render();
  }

  async function pickLayout(layout) {
    await UserPreferences.setMenuLayoutChoice(layout);
    done.layout = true;
    elMenuHint.textContent = t(
      'capacitacion.setup_layout_reload_hint',
      'Pulse Continuar para guardar y recargar la página; verá el menú en la posición elegida.'
    );
    elMenuHint.classList.remove('d-none');
    render();
  }

  function render() {
    if (step === 2 || step === 3) {
      elMenuHint.textContent =
        step === 3
          ? t(
              'capacitacion.setup_layout_reload_hint',
              'Pulse Continuar para guardar y recargar la página; verá el menú en la posición elegida.'
            )
          : t(
              'capacitacion.setup_theme_menu_hint',
              'Puede cambiar idioma, tema, tamaño y menú (arriba o lateral) cuando quiera desde la barra del menú.'
            );
      elMenuHint.classList.remove('d-none');
    } else if (step !== 1 || !done.theme) {
      elMenuHint.classList.add('d-none');
    }

    if (step === 0) {
      elCat.textContent = t('capacitacion.setup_lang_category', 'Idioma');
      elHint.textContent = t(
        'capacitacion.setup_lang_hint',
        'Elija su idioma tocando una bandera. Podrá cambiarlo después con el botón circular de la bandera en el menú.'
      );
      elBody.innerHTML = `
        <div class="d-flex justify-content-center gap-3 flex-wrap" role="group" aria-label="${esc(t('capacitacion.setup_lang_category', 'Idioma'))}">
          <button type="button" class="btn btn-light border shadow-sm p-2 rounded-3 gecko-setup-flag-btn" data-lang="es" style="width:88px;height:72px;" title="Español">
            <img src="${FLAG.es}" alt="" width="64" height="48" class="rounded-1 shadow-sm" style="object-fit:cover"/>
          </button>
          <button type="button" class="btn btn-light border shadow-sm p-2 rounded-3 gecko-setup-flag-btn" data-lang="en" style="width:88px;height:72px;" title="English">
            <img src="${FLAG.en}" alt="" width="64" height="48" class="rounded-1 shadow-sm" style="object-fit:cover"/>
          </button>
          <button type="button" class="btn btn-light border shadow-sm p-2 rounded-3 gecko-setup-flag-btn" data-lang="pt" style="width:88px;height:72px;" title="Português">
            <img src="${FLAG.pt}" alt="" width="64" height="48" class="rounded-1 shadow-sm" style="object-fit:cover"/>
          </button>
        </div>`;
      elBody.querySelectorAll('.gecko-setup-flag-btn').forEach((b) => {
        b.addEventListener('click', () => pickLang(b.getAttribute('data-lang')));
      });
    } else if (step === 1) {
      elCat.textContent = t('capacitacion.setup_theme_category', 'Tema');
      elHint.textContent = t(
        'capacitacion.setup_theme_hint',
        'Pulse Claro u Oscuro y observe cómo cambian los colores de la interfaz. Luego pulse Siguiente.'
      );
      const curTheme = UserPreferences.config.theme === 'dark' ? 'dark' : 'light';
      const clsL = curTheme === 'light' ? 'btn-success' : 'btn-outline-secondary';
      const clsD = curTheme === 'dark' ? 'btn-success' : 'btn-outline-secondary';
      elBody.innerHTML = `
        <div class="row g-2">
          <div class="col-6">
            <button type="button" class="btn ${clsL} w-100 py-3 gecko-setup-theme-btn d-flex flex-column align-items-center gap-2" data-theme="light">
              <span class="fs-3 text-warning" aria-hidden="true">${UserPreferences.icons.sun}</span>
              <span class="fw-semibold small">${esc(t('capacitacion.setup_theme_light', 'Claro'))}</span>
            </button>
          </div>
          <div class="col-6">
            <button type="button" class="btn ${clsD} w-100 py-3 gecko-setup-theme-btn d-flex flex-column align-items-center gap-2" data-theme="dark">
              <span class="fs-3" aria-hidden="true">${UserPreferences.icons.moon}</span>
              <span class="fw-semibold small">${esc(t('capacitacion.setup_theme_dark', 'Oscuro'))}</span>
            </button>
          </div>
        </div>`;
      elBody.querySelectorAll('.gecko-setup-theme-btn').forEach((b) => {
        b.addEventListener('click', () => pickTheme(b.getAttribute('data-theme')));
      });
    } else if (step === 2) {
      elCat.textContent = t('capacitacion.setup_font_category', 'Tamaño de letra');
      elHint.textContent = t(
        'capacitacion.setup_font_hint',
        'Elija un tamaño y observe el texto de prueba.'
      );
      const curFont = ['chica', 'mediana', 'grande'].includes(UserPreferences.config.fontSize)
        ? UserPreferences.config.fontSize
        : 'chica';
      const bf = (s) => (curFont === s ? 'btn-success' : 'btn-outline-success');
      elBody.innerHTML = `
        <div class="border rounded-3 p-3 mb-3 bg-body-secondary bg-opacity-25" id="gecko-setup-font-sample-wrap">
          <p class="mb-0" id="gecko-setup-font-sample" style="line-height:1.5;">${esc(
            t(
              'capacitacion.setup_font_sample',
              'Texto de prueba: así verá listas, formularios y tablas con el tamaño elegido.'
            )
          )}</p>
        </div>
        <div class="d-flex flex-wrap gap-2 justify-content-center" role="group">
          <button type="button" class="btn ${bf('chica')} btn-sm fw-semibold gecko-setup-font-btn" data-size="chica">${esc(
            t('capacitacion.setup_font_chica', 'Chica')
          )}</button>
          <button type="button" class="btn ${bf('mediana')} btn-sm fw-semibold gecko-setup-font-btn" data-size="mediana">${esc(
            t('capacitacion.setup_font_mediana', 'Mediana')
          )}</button>
          <button type="button" class="btn ${bf('grande')} btn-sm fw-semibold gecko-setup-font-btn" data-size="grande">${esc(
            t('capacitacion.setup_font_grande', 'Grande')
          )}</button>
        </div>`;
      elBody.querySelectorAll('.gecko-setup-font-btn').forEach((b) => {
        b.addEventListener('click', () => pickFont(b.getAttribute('data-size')));
      });
    } else {
      elCat.textContent = t('capacitacion.setup_layout_category', 'Menú');
      elHint.textContent = t(
        'capacitacion.setup_layout_hint',
        'Elija si prefiere el menú en la parte superior o el panel lateral a la izquierda.'
      );
      const curMenu =
        UserPreferences.config.menu === 'menu_lateral' ? 'menu_lateral' : 'menu_top';
      const clsTop = curMenu === 'menu_top' ? 'btn-success' : 'btn-outline-secondary';
      const clsSide = curMenu === 'menu_lateral' ? 'btn-success' : 'btn-outline-secondary';
      elBody.innerHTML = `
        <div class="row g-2">
          <div class="col-6">
            <button type="button" class="btn ${clsTop} w-100 py-3 gecko-setup-layout-btn d-flex flex-column align-items-center gap-2" data-layout="menu_top">
              <i class="bi bi-layout-text-window fs-2" aria-hidden="true"></i>
              <span class="fw-semibold small text-center">${esc(t('capacitacion.setup_layout_top', 'Arriba'))}</span>
            </button>
          </div>
          <div class="col-6">
            <button type="button" class="btn ${clsSide} w-100 py-3 gecko-setup-layout-btn d-flex flex-column align-items-center gap-2" data-layout="menu_lateral">
              <i class="bi bi-layout-sidebar-inset-reverse fs-2" aria-hidden="true"></i>
              <span class="fw-semibold small text-center">${esc(t('capacitacion.setup_layout_side', 'A la izquierda'))}</span>
            </button>
          </div>
        </div>`;
      elBody.querySelectorAll('.gecko-setup-layout-btn').forEach((b) => {
        b.addEventListener('click', () => pickLayout(b.getAttribute('data-layout')));
      });
    }

    syncButtons();
  }

  btnBack.addEventListener('click', () => {
    if (step <= 0) return;
    step -= 1;
    render();
  });

  btnNext.addEventListener('click', () => {
    if (!stepReady()) return;
    if (step < 3) {
      step += 1;
      render();
      return;
    }
    root.remove();
    markFirstRunLanguageDone();
    markSetupWizardDone();
    window.location.reload();
  });

  render();
}
