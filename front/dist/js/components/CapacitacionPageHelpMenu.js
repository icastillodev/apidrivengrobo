import { pathnameToMenuPath } from '../utils/capacitacionPaths.js?v=20260409';
import { menuPathToSlug } from '../utils/capacitacionPaths.js?v=20260409';
import { Auth } from '../auth.js';
import { startCapacitacionInteractiveTour } from './CapacitacionInteractiveTour.js?v=20260409';
import {
  isCapacitacionFabHidden,
  setCapacitacionFabHidden,
  refreshCapacitacionHelpFab,
} from './CapacitacionHelpFab.js?v=20260409';
import { clearRouteTourSeen } from '../utils/capacitacionTourPrefs.js';

const MENU_ID = 'gecko-cap-page-help-popover';

let pwaDeferredPrompt = null;
let pwaInstallListenerBound = false;

function ensurePwaInstallListener() {
  if (pwaInstallListenerBound) return;
  pwaInstallListenerBound = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaDeferredPrompt = e;
  });
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function showPwaShortcutModal() {
  ensurePwaInstallListener();
  const title = t('pwa.shortcut_title', 'Crear acceso directo');
  const intro = t('pwa.shortcut_intro', 'Agregue GROBO como acceso directo con el logo en su dispositivo.');

  let body = '';
  if (isIOS()) {
    body = `
      <p class="small text-muted mb-2">${t('pwa.ios_intro', 'En iPhone/iPad (Safari):')}</p>
      <ol class="small text-start mb-0">
        <li>${t('pwa.ios_step_1', 'Toque “Compartir”.')}</li>
        <li>${t('pwa.ios_step_2', 'Elija “Agregar a inicio”.')}</li>
      </ol>
    `;
  } else if (pwaDeferredPrompt) {
    body = `
      <p class="small text-muted mb-3">${t(
        'pwa.install_supported',
        'Su navegador permite instalar la app. Así se crea el acceso con el logo de GROBO.'
      )}</p>
      <button type="button" id="gecko-pwa-install-btn" class="btn btn-success w-100">
        ${t('pwa.install_btn', 'Instalar / Crear acceso directo')}
      </button>
    `;
  } else if (isAndroid()) {
    body = `
      <p class="small text-muted mb-2">${t('pwa.android_intro', 'En Android:')}</p>
      <ol class="small text-start mb-0">
        <li>${t('pwa.android_step_1', 'Abra el menú del navegador (⋮).')}</li>
        <li>${t('pwa.android_step_2', 'Seleccione “Añadir a pantalla de inicio” o “Instalar app”.')}</li>
      </ol>
    `;
  } else {
    body = `
      <p class="small text-muted mb-2">${t('pwa.desktop_intro', 'En computadora:')}</p>
      <ol class="small text-start mb-0">
        <li>${t('pwa.desktop_step_1', 'En Chrome/Edge: menú (⋯) → “Instalar aplicación”.')}</li>
        <li>${t('pwa.desktop_step_2', 'Si no aparece, use Favoritos para un acceso rápido.')}</li>
      </ol>
    `;
  }

  if (typeof Swal === 'undefined') return;

  Swal.fire({
    title: `<div class="d-flex align-items-center gap-2 justify-content-center">
      <img src="dist/multimedia/imagenes/grobo/png logo sin fondo.png" alt="GROBO" style="width:28px;height:28px;object-fit:contain" />
      <span>${title}</span>
    </div>`,
    html: `<div class="text-start">
      <p class="small mb-3">${intro}</p>
      ${body}
    </div>`,
    showCloseButton: true,
    showConfirmButton: false,
  }).then(() => {});

  setTimeout(() => {
    const btn = document.getElementById('gecko-pwa-install-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!pwaDeferredPrompt) return;
      pwaDeferredPrompt.prompt();
      await pwaDeferredPrompt.userChoice.catch(() => null);
      pwaDeferredPrompt = null;
      Swal.close();
    });
  }, 0);
}

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function capacitacionHref(slug) {
  const base = Auth.getBasePath();
  const root = base.endsWith('/') ? base : `${base}/`;
  const hash = slug ? `#t=${encodeURIComponent(slug)}` : '';
  return `${root}paginas/panel/capacitacion.html${hash}`;
}

function removeMenu() {
  document.getElementById(MENU_ID)?.remove();
}

function openBootstrapModal(selector) {
  if (!selector || !window.bootstrap?.Modal) return;
  const el = document.querySelector(selector);
  if (!el) return;
  window.bootstrap.Modal.getOrCreateInstance(el).show();
}

/**
 * Menú flotante: manual, tour interactivo, ayuda modal de la página, reactivar barra inferior.
 */
export function showCapacitacionPageHelpMenu(anchorEl, menuPath, opts = {}) {
  removeMenu();
  const { modalSelector = null } = opts;
  const slug = menuPathToSlug(menuPath);

  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.setAttribute('role', 'menu');
  menu.className = 'border shadow-lg rounded-2 bg-body py-1';
  menu.style.cssText = `position:fixed;z-index:10900;min-width:260px;top:${rect.bottom + 6}px;left:${Math.min(
    window.innerWidth - 280,
    Math.max(8, rect.right - 260)
  )}px;`;

  const intro = document.createElement('div');
  intro.className = 'px-3 py-2 small text-muted border-bottom';
  intro.textContent = t(
    'capacitacion.page_help_intro',
    'Si ocultó la barra inferior, desde aquí puede seguir abriendo el manual, los tutoriales y volver a mostrar la barra.'
  );
  menu.appendChild(intro);

  const item = (icon, label, onClick, isLink = false) => {
    const b = document.createElement(isLink ? 'a' : 'button');
    b.type = isLink ? undefined : 'button';
    b.className =
      'd-flex align-items-center gap-2 w-100 text-start btn btn-sm btn-light text-body border-0 rounded-0 px-3 py-2';
    b.innerHTML = `<i class="bi ${icon} text-success"></i><span>${label}</span>`;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      removeMenu();
      onClick();
    });
    return b;
  };

  if (modalSelector) {
    menu.appendChild(
      item('bi-info-circle', t('capacitacion.page_help_screen', 'Ayuda de esta pantalla'), () =>
        openBootstrapModal(modalSelector)
      )
    );
  }

  const manualLabel = t('capacitacion.fab_btn', 'Ver documento de ayuda');
  const a = document.createElement('a');
  a.className =
    'd-flex align-items-center gap-2 w-100 text-start btn btn-sm btn-light text-body border-0 rounded-0 px-3 py-2 text-decoration-none';
  a.href = capacitacionHref(slug);
  a.innerHTML = `<i class="bi bi-book-half text-success"></i><span>${manualLabel}</span>`;
  a.addEventListener('click', () => {
    removeMenu();
  });
  menu.appendChild(a);

  menu.appendChild(
    item('bi-lightning-charge', t('capacitacion.fab_interactive_btn', 'Tutorial interactivo'), () =>
      startCapacitacionInteractiveTour(menuPath, { manual: true, hostMenuPath: menuPath })
    )
  );

  if (document.querySelector('.modal.show')) {
    menu.appendChild(
      item('bi-window-stack', t('capacitacion.modal_help_tour_modals_btn', 'Tutorial: ventanas emergentes'), () =>
        startCapacitacionInteractiveTour('__modals__', { manual: true, hostMenuPath: menuPath })
      )
    );
  }

  menu.appendChild(
    item('bi-arrow-counterclockwise', t('capacitacion.page_help_reset_auto_tour', 'Reactivar tutorial automático aquí'), () => {
      clearRouteTourSeen(menuPath);
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: t('capacitacion.page_help_reset_auto_ok_title', 'Listo'),
          text: t(
            'capacitacion.page_help_reset_auto_ok_body',
            'La próxima vez que abra esta pantalla podrá volver a ver el tutorial automático (si no desactivó los tutoriales globales).'
          ),
          timer: 3800,
          showConfirmButton: true,
          confirmButtonText: t('capacitacion.fab_dismiss_ok', 'Entendido'),
        });
      }
    })
  );

  if (isCapacitacionFabHidden()) {
    menu.appendChild(
      item('bi-layout-text-window-reverse', t('capacitacion.page_help_show_fab', 'Mostrar barra inferior de ayuda'), () => {
        setCapacitacionFabHidden(false);
        refreshCapacitacionHelpFab();
      })
    );
  }

  document.body.appendChild(menu);

  const onDoc = (e) => {
    if (!menu.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) {
      removeMenu();
      document.removeEventListener('click', onDoc, true);
    }
  };
  setTimeout(() => document.addEventListener('click', onDoc, true), 0);
}

let delegationBound = false;
let helpMenuDropdownBound = false;

/**
 * Ayuda (menú principal ?): tutorial de la pantalla actual, modales, mostrar barra inferior.
 */
export function initGeckoHelpMenuDropdownActions() {
  if (helpMenuDropdownBound) return;
  helpMenuDropdownBound = true;
  ensurePwaInstallListener();
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a.gecko-help-menu-action');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const action = a.getAttribute('data-gecko-action');
      if (!action) return;

      document.querySelectorAll('.dropdown-menu-gecko').forEach((m) => m.classList.add('hidden'));
      document.querySelectorAll('.dropdown-toggle-gecko').forEach((b) => b.classList.remove('open'));
      document.querySelectorAll('.nav-item.expanded-grid').forEach((li) => li.classList.remove('expanded-grid'));

      const mp = pathnameToMenuPath(window.location.pathname || '');

      if (action === 'cap_interactive_tour') {
        if (!mp) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'info',
              title: t('capacitacion.help_menu_no_screen_tour_title', 'Tutorial de pantalla'),
              text: t(
                'capacitacion.help_menu_no_screen_tour_body',
                'Abra una sección del panel (por ejemplo desde el menú) para usar el tutorial alineado con esa pantalla. En Capacitación tiene el manual completo.'
              ),
            });
          }
          return;
        }
        startCapacitacionInteractiveTour(mp, { manual: true, hostMenuPath: mp });
        return;
      }

      if (action === 'pwa_shortcut') {
        showPwaShortcutModal();
        return;
      }

      if (action === 'cap_interactive_modals') {
        if (!document.querySelector('.modal.show')) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'info',
              title: t('capacitacion.tour_modals_need_open_title', 'Abra un detalle en ventana emergente'),
              text: t(
                'capacitacion.tour_modals_need_open_body',
                'El tutorial de ventanas emergentes solo está disponible mientras tenga abierto un formulario o vista en ventana emergente.'
              ),
            });
          }
          return;
        }
        startCapacitacionInteractiveTour('__modals__', {
          manual: true,
          hostMenuPath: mp || 'panel/dashboard',
        });
        return;
      }

      if (action === 'cap_show_fab') {
        if (!isCapacitacionFabHidden()) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'info',
              title: t('capacitacion.help_menu_bar_visible_title', 'La barra ya está visible'),
              html: `<p class="small mb-0 text-start">${t(
                'capacitacion.help_menu_bar_visible_body',
                'Para ocultarla use «No mostrar más esta barra» en la propia barra inferior (o el enlace equivalente sobre una ventana emergente). Puede volver a mostrarla desde aquí o desde el interruptor en la página de Capacitación.'
              )}</p>`,
            });
          }
          return;
        }
        setCapacitacionFabHidden(false);
        refreshCapacitacionHelpFab();
      }
    },
    true
  );
}

/**
 * Botones con data-gecko-cap-help="admin/usuarios" y opcional data-gecko-cap-modal="#modal-ayuda"
 */
export function initCapacitacionPageHelpDelegation() {
  if (delegationBound) return;
  delegationBound = true;
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-gecko-cap-help]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const mp = btn.getAttribute('data-gecko-cap-help') || pathnameToMenuPath(window.location.pathname || '');
      if (!mp) return;
      const modalSel = btn.getAttribute('data-gecko-cap-modal');
      showCapacitacionPageHelpMenu(btn, mp, { modalSelector: modalSel || null });
    },
    true
  );
}
