/**
 * Asistente inicial (primera sesión): idioma (banderas), tema, tamaño de letra, menú arriba o lateral.
 * Al terminar recarga la página para aplicar el diseño del menú; luego el tour de bienvenida arranca solo.
 */
import { UserPreferences } from './menujs/MenuConfig.js';
import { markSetupWizardDone } from '../utils/capacitacionTourPrefs.js';
import { syncCapUiPrefsToBackend } from '../utils/userCapUiPrefsBackend.js';
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
    'z-index:25000;background:rgba(15,23,42,0.88);backdrop-filter:blur(6px);touch-action:manipulation;';

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
  /** Solo elección explícita en este asistente (no refleja preferencias previas hasta que pulse). */
  const picked = { lang: null, theme: null, font: null, layout: null };

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
    if (step === 0) return picked.lang != null;
    if (step === 1) return picked.theme != null;
    if (step === 2) return picked.font != null;
    return picked.layout != null;
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
    picked.lang = code;
    render();
  }

  async function pickTheme(theme) {
    await UserPreferences.setThemeChoice(theme);
    picked.theme = theme;
    elMenuHint.textContent = t(
      'capacitacion.setup_theme_menu_hint',
      'Puede cambiar idioma, tema y tamaño cuando quiera desde la barra del menú (bandera, sol/luna, icono de letra).'
    );
    elMenuHint.classList.remove('d-none');
    render();
  }

  async function pickFont(size) {
    await UserPreferences.setFontSizeChoice(size);
    picked.font = size;
    render();
  }

  async function pickLayout(layout) {
    await UserPreferences.setMenuLayoutChoice(layout);
    picked.layout = layout;
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
    } else if (step !== 1 || picked.theme == null) {
      elMenuHint.classList.add('d-none');
    }

    if (step === 0) {
      elCat.textContent = t('capacitacion.setup_lang_category', 'Idioma');
      elHint.textContent = t(
        'capacitacion.setup_lang_hint',
        'Elija su idioma tocando una bandera. Podrá cambiarlo después con el botón circular de la bandera en el menú.'
      );
      const curLang = picked.lang;
      const flagBtnClass = (code) => {
        const on = curLang === code;
        return [
          'btn p-2 rounded-3 gecko-setup-flag-btn position-relative',
          on
            ? 'border border-success border-3 bg-success-subtle shadow'
            : 'btn-light border border-2 border-secondary-subtle shadow-sm',
        ].join(' ');
      };
      elBody.innerHTML = `
        <div class="d-flex justify-content-center gap-3 flex-wrap" role="group" aria-label="${esc(t('capacitacion.setup_lang_category', 'Idioma'))}" style="touch-action:manipulation;">
          <button type="button" class="${flagBtnClass('es')}" data-lang="es" aria-pressed="${curLang === 'es'}" style="width:92px;height:76px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;" title="Español">
            ${curLang === 'es' ? '<span class="position-absolute top-0 end-0 translate-middle-y badge rounded-pill bg-success pt-1 px-1 shadow-sm" style="margin-top:6px;" aria-hidden="true"><i class="bi bi-check-lg text-white small"></i></span>' : ''}
            <img src="${FLAG.es}" alt="" width="64" height="48" draggable="false" class="rounded-1 shadow-sm" style="object-fit:cover;pointer-events:none;user-select:none;-webkit-user-drag:none"/>
          </button>
          <button type="button" class="${flagBtnClass('en')}" data-lang="en" aria-pressed="${curLang === 'en'}" style="width:92px;height:76px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;" title="English">
            ${curLang === 'en' ? '<span class="position-absolute top-0 end-0 translate-middle-y badge rounded-pill bg-success pt-1 px-1 shadow-sm" style="margin-top:6px;" aria-hidden="true"><i class="bi bi-check-lg text-white small"></i></span>' : ''}
            <img src="${FLAG.en}" alt="" width="64" height="48" draggable="false" class="rounded-1 shadow-sm" style="object-fit:cover;pointer-events:none;user-select:none;-webkit-user-drag:none"/>
          </button>
          <button type="button" class="${flagBtnClass('pt')}" data-lang="pt" aria-pressed="${curLang === 'pt'}" style="width:92px;height:76px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;" title="Português">
            ${curLang === 'pt' ? '<span class="position-absolute top-0 end-0 translate-middle-y badge rounded-pill bg-success pt-1 px-1 shadow-sm" style="margin-top:6px;" aria-hidden="true"><i class="bi bi-check-lg text-white small"></i></span>' : ''}
            <img src="${FLAG.pt}" alt="" width="64" height="48" draggable="false" class="rounded-1 shadow-sm" style="object-fit:cover;pointer-events:none;user-select:none;-webkit-user-drag:none"/>
          </button>
        </div>`;
      let langTapLock = false;
      const bindLang = (b) => {
        const code = b.getAttribute('data-lang');
        const go = () => {
          if (langTapLock) return;
          langTapLock = true;
          pickLang(code).finally(() => {
            langTapLock = false;
          });
        };
        b.addEventListener('pointerup', (ev) => {
          if (ev.button !== 0 && ev.button !== -1) return;
          go();
        });
        b.addEventListener('click', (ev) => {
          ev.preventDefault();
          go();
        });
      };
      elBody.querySelectorAll('.gecko-setup-flag-btn').forEach(bindLang);
    } else if (step === 1) {
      elCat.textContent = t('capacitacion.setup_theme_category', 'Tema');
      elHint.textContent = t(
        'capacitacion.setup_theme_hint',
        'Pulse Claro u Oscuro y observe cómo cambian los colores de la interfaz. Luego pulse Siguiente.'
      );
      const curTheme = picked.theme;
      const wrap = (theme, inner) => {
        const on = curTheme === theme;
        return `<div class="col-6 p-1 rounded-3 ${on ? 'bg-success-subtle border border-success border-3 shadow-sm' : 'border border-2 border-transparent'}">${inner}</div>`;
      };
      const clsL = curTheme === 'light' ? 'btn-success' : 'btn-outline-secondary';
      const clsD = curTheme === 'dark' ? 'btn-success' : 'btn-outline-secondary';
      elBody.innerHTML = `
        <div class="row g-2">
          ${wrap(
            'light',
            `<button type="button" class="btn ${clsL} w-100 py-3 gecko-setup-theme-btn d-flex flex-column align-items-center gap-2 position-relative" data-theme="light" aria-pressed="${curTheme === 'light'}">
              ${curTheme === 'light' ? '<i class="bi bi-check-circle-fill position-absolute top-0 end-0 m-2 text-white" style="font-size:0.95rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));" aria-hidden="true"></i>' : ''}
              <span class="fs-3 text-warning" aria-hidden="true">${UserPreferences.icons.sun}</span>
              <span class="fw-semibold small">${esc(t('capacitacion.setup_theme_light', 'Claro'))}</span>
            </button>`
          )}
          ${wrap(
            'dark',
            `<button type="button" class="btn ${clsD} w-100 py-3 gecko-setup-theme-btn d-flex flex-column align-items-center gap-2 position-relative" data-theme="dark" aria-pressed="${curTheme === 'dark'}">
              ${curTheme === 'dark' ? '<i class="bi bi-check-circle-fill position-absolute top-0 end-0 m-2 text-white" style="font-size:0.95rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));" aria-hidden="true"></i>' : ''}
              <span class="fs-3" aria-hidden="true">${UserPreferences.icons.moon}</span>
              <span class="fw-semibold small">${esc(t('capacitacion.setup_theme_dark', 'Oscuro'))}</span>
            </button>`
          )}
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
      const curFont = picked.font;
      const fontBtn = (size, label) => {
        const on = curFont === size;
        const base = 'btn btn-sm fw-semibold gecko-setup-font-btn position-relative px-3';
        const cls = on
          ? 'btn-success border border-3 border-success shadow-sm'
          : 'btn-outline-secondary border border-2';
        const mark = on
          ? '<i class="bi bi-check-lg ms-1 align-middle" aria-hidden="true"></i>'
          : '';
        return `<button type="button" class="${base} ${cls}" data-size="${size}" aria-pressed="${on}">${esc(label)}${mark}</button>`;
      };
      const sampleBoxClass =
        picked.font == null
          ? 'rounded-3 p-3 mb-3 bg-body-secondary bg-opacity-25 border border-2 border-secondary-subtle'
          : 'rounded-3 p-3 mb-3 bg-body-secondary bg-opacity-25 border border-2 border-success shadow-sm';
      elBody.innerHTML = `
        <div class="${sampleBoxClass}" id="gecko-setup-font-sample-wrap">
          <p class="mb-0" id="gecko-setup-font-sample" style="line-height:1.5;">${esc(
            t(
              'capacitacion.setup_font_sample',
              'Texto de prueba: así verá listas, formularios y tablas con el tamaño elegido.'
            )
          )}</p>
        </div>
        <div class="d-flex flex-wrap gap-2 justify-content-center" role="group">
          ${fontBtn('chica', t('capacitacion.setup_font_chica', 'Chica'))}
          ${fontBtn('mediana', t('capacitacion.setup_font_mediana', 'Mediana'))}
          ${fontBtn('grande', t('capacitacion.setup_font_grande', 'Grande'))}
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
      const curMenu = picked.layout;
      const clsTop = curMenu === 'menu_top' ? 'btn-success' : 'btn-outline-secondary';
      const clsSide = curMenu === 'menu_lateral' ? 'btn-success' : 'btn-outline-secondary';
      const layWrap = (layout, inner) => {
        const on = curMenu === layout;
        return `<div class="col-6 p-1 rounded-3 ${on ? 'bg-success-subtle border border-success border-3 shadow-sm' : 'border border-2 border-transparent'}">${inner}</div>`;
      };
      elBody.innerHTML = `
        <div class="row g-2">
          ${layWrap(
            'menu_top',
            `<button type="button" class="btn ${clsTop} w-100 py-3 gecko-setup-layout-btn d-flex flex-column align-items-center gap-2 position-relative" data-layout="menu_top" aria-pressed="${curMenu === 'menu_top'}">
              ${curMenu === 'menu_top' ? '<i class="bi bi-check-circle-fill position-absolute top-0 end-0 m-2 text-white" style="font-size:0.95rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));" aria-hidden="true"></i>' : ''}
              <i class="bi bi-layout-text-window fs-2" aria-hidden="true"></i>
              <span class="fw-semibold small text-center">${esc(t('capacitacion.setup_layout_top', 'Arriba'))}</span>
            </button>`
          )}
          ${layWrap(
            'menu_lateral',
            `<button type="button" class="btn ${clsSide} w-100 py-3 gecko-setup-layout-btn d-flex flex-column align-items-center gap-2 position-relative" data-layout="menu_lateral" aria-pressed="${curMenu === 'menu_lateral'}">
              ${curMenu === 'menu_lateral' ? '<i class="bi bi-check-circle-fill position-absolute top-0 end-0 m-2 text-white" style="font-size:0.95rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));" aria-hidden="true"></i>' : ''}
              <i class="bi bi-layout-sidebar-inset-reverse fs-2" aria-hidden="true"></i>
              <span class="fw-semibold small text-center">${esc(t('capacitacion.setup_layout_side', 'A la izquierda'))}</span>
            </button>`
          )}
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

  btnNext.addEventListener('click', async () => {
    if (!stepReady()) return;
    if (step < 3) {
      step += 1;
      render();
      return;
    }
    root.remove();
    markFirstRunLanguageDone();
    markSetupWizardDone();
    try {
      await syncCapUiPrefsToBackend();
    } catch {
      /* ignore */
    }
    window.location.reload();
  });

  render();
}
