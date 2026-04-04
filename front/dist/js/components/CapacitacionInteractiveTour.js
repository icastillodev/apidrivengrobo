import { getTourStepsForMenuPath } from '../utils/capacitacionTours.js';
import { menuPathToSlug, pathnameToMenuPath } from '../utils/capacitacionPaths.js';
import { Auth } from '../auth.js';
import {
  markWelcomeTourDone,
  markRouteTourSeen,
  setAutoToursGloballyDisabled,
} from '../utils/capacitacionTourPrefs.js';

const OVERLAY_ID = 'gecko-cap-tour-overlay';
const TOOLTIP_ID = 'gecko-cap-tour-tooltip';
/** Valor reservado: si `t()` devuelve esto, no hay texto de ancla en i18n. */
const TOUR_ANCHOR_MISSING = '__tour_anchor_missing__';

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** SVGs pequeños para el tour (solo claves definidas aquí). */
const TOUR_INLINE_SVG = {
  click: `<svg class="gecko-tour-svg text-success align-middle" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><title></title><path d="M5 3l14 10-7 1-3 8-4-19z" fill="currentColor" opacity="0.2"/><path d="M5 3l14 10-5.5.8L9 22 5 3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/></svg>`,
  hand: `<svg class="gecko-tour-svg text-success align-middle" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 11V5.5a1.5 1.5 0 013 0V11m-3-3.5V4a1.5 1.5 0 113 0v3.5M8 11V7.5a1.5 1.5 0 113 0V11m-5 .5v-1A1.5 1.5 0 118 11v3a4 4 0 004 4h.5a4.5 4.5 0 004-4V12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function normalizeBiClass(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/^bi-/, '');
  if (!/^[a-z0-9-]+$/.test(n)) return '';
  return `bi-${n}`;
}

/**
 * Sustituye en texto plano (ya troceado):
 * - {{i:nombre}} o {{i:bi-nombre}} → icono Bootstrap Icons
 * - {{svg:click}} | {{svg:hand}} → SVG inline
 * El resto se escapa.
 */
function formatTourRichChunk(plain) {
  const re = /\{\{(i|svg):([^}]+)\}\}/g;
  let last = 0;
  const parts = [];
  let m;
  const s = String(plain);
  while ((m = re.exec(s)) !== null) {
    parts.push(escHtml(s.slice(last, m.index)));
    const kind = m[1];
    const key = String(m[2]).trim().toLowerCase();
    if (kind === 'i') {
      const cls = normalizeBiClass(key);
      if (cls) {
        parts.push(
          `<i class="bi ${cls} text-success align-middle mx-1" style="font-size:1.15em;vertical-align:-0.125em" aria-hidden="true"></i>`
        );
      }
    } else if (kind === 'svg' && TOUR_INLINE_SVG[key]) {
      parts.push(TOUR_INLINE_SVG[key]);
    }
    last = re.lastIndex;
  }
  parts.push(escHtml(s.slice(last)));
  return parts.join('');
}

/**
 * Párrafos separados por línea en blanco. Dentro de un bloque, líneas que empiezan por "- " o "• " forman lista.
 */
function formatBodyParagraphsRich(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  return raw
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trimEnd());
      const bulletRe = /^[-•]\s+/;
      const firstBullet = lines.findIndex((l) => l.trim() && bulletRe.test(l.trim()));

      if (firstBullet === -1) {
        return `<p class="small text-body-secondary mb-2 mb-md-0">${formatTourRichChunk(block.trim())}</p>`;
      }

      const headLines = firstBullet > 0 ? lines.slice(0, firstBullet) : [];
      const bulletLines = lines.slice(firstBullet).filter((l) => l.trim() && bulletRe.test(l.trim()));

      const headText = headLines
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      const headHtml = headText
        ? `<p class="small text-body-secondary mb-2">${formatTourRichChunk(headText)}</p>`
        : '';

      const lis = bulletLines
        .map((l) => l.trim().replace(bulletRe, ''))
        .filter(Boolean)
        .map((it) => `<li class="small text-body-secondary mb-1">${formatTourRichChunk(it)}</li>`)
        .join('');

      return `${headHtml}<ul class="gecko-tour-tip-list small text-body-secondary ps-3 mb-2 mb-md-0">${lis}</ul>`;
    })
    .join('');
}

function splitIntroDetail(bodyText, title) {
  const raw = String(bodyText || '').trim();
  const parts = raw.split(/\n\n+/);
  if (parts.length >= 2) {
    return {
      intro: parts[0].trim(),
      detail: parts.slice(1).join('\n\n').trim(),
    };
  }
  const tpl = t(
    'capacitacion.tour_step_intro_fallback',
    'El recuadro marca «{title}»: cumple un papel concreto en esta pantalla.'
  );
  return {
    intro: tpl.replace(/\{title\}/g, title),
    detail: raw || title,
  };
}

function capacitacionHref(slug) {
  const base = Auth.getBasePath();
  const root = base.endsWith('/') ? base : `${base}/`;
  const hash = slug ? `#t=${encodeURIComponent(slug)}` : '';
  return `${root}paginas/panel/capacitacion.html${hash}`;
}

function ensureTourStyles() {
  if (document.getElementById('gecko-cap-tour-style')) return;
  const s = document.createElement('style');
  s.id = 'gecko-cap-tour-style';
  s.textContent = `
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 10890; pointer-events: auto; }
    #${OVERLAY_ID} .gecko-cap-tour-spot {
      position: fixed; z-index: 10891; border-radius: 10px;
      box-shadow: 0 0 0 4px rgba(25, 135, 84, 0.95), 0 0 0 9999px rgba(15, 23, 42, 0.72);
      pointer-events: none; transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
    }
    #${TOOLTIP_ID} {
      position: fixed; z-index: 10892; max-width: min(480px, 94vw);
      max-height: min(70vh, 520px); overflow-y: auto;
      background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529);
      border: 1px solid rgba(25, 135, 84, 0.35); border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2); padding: 14px 16px;
    }
    [data-bs-theme="dark"] #${TOOLTIP_ID} { background: var(--bs-body-bg); border-color: rgba(25, 135, 84, 0.5); }
    #${TOOLTIP_ID} .gecko-tour-prev:focus-visible,
    #${TOOLTIP_ID} .gecko-tour-next:focus-visible,
    #${TOOLTIP_ID} .gecko-tour-finish:focus-visible {
      outline: 2px solid var(--bs-success, #198754);
      outline-offset: 2px;
    }
    #${TOOLTIP_ID} .gecko-tour-dismiss-actions .btn-link { text-align: left; white-space: normal; line-height: 1.35; }
    #${TOOLTIP_ID} .gecko-tour-finish,
    #${TOOLTIP_ID} .gecko-tour-next { min-height: 44px; padding-top: 0.5rem; padding-bottom: 0.5rem; }
    #${TOOLTIP_ID} .gecko-tour-prev { min-height: 44px; }
    #${TOOLTIP_ID} .gecko-tour-tip-list { list-style-type: disc; }
    #${TOOLTIP_ID} .gecko-tour-tip-list li::marker { color: var(--bs-success, #198754); }
    #${TOOLTIP_ID} .gecko-tour-svg { display: inline-block; vertical-align: -0.2em; }
  `;
  document.head.appendChild(s);
}

function removeTour() {
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(TOOLTIP_ID)?.remove();
  document.body.style.overflow = '';
}

function queryTarget(selector) {
  if (!selector) return null;
  try {
    return document.querySelector(selector.trim());
  } catch {
    return null;
  }
}

function placeSpotlight(spot, el, pad = 8) {
  if (!el || !spot) return;
  const r = el.getBoundingClientRect();
  spot.style.top = `${r.top - pad}px`;
  spot.style.left = `${r.left - pad}px`;
  spot.style.width = `${r.width + pad * 2}px`;
  spot.style.height = `${r.height + pad * 2}px`;
}

function placeTooltip(tooltip, el) {
  if (!tooltip || !el) return;
  const r = el.getBoundingClientRect();
  const tw = 460;
  const th = tooltip.offsetHeight || 220;
  let top = r.bottom + 12;
  let left = Math.min(window.innerWidth - tw - 16, Math.max(16, r.left));
  if (top + th > window.innerHeight - 16) {
    top = Math.max(16, r.top - th - 12);
  }
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

/** Ruta de menú de la pantalla donde se mostró el tour (evita otro auto-tutorial encima tras la bienvenida). */
function resolveHostRouteKey(hostMenuPath) {
  const h = String(hostMenuPath || '').trim();
  if (h && h !== '__welcome__') return h;
  return pathnameToMenuPath(window.location.pathname || '') || null;
}

/**
 * Cierra el tour de bienvenida (5 pasos): no repetir bienvenida y dar por vista la ruta actual
 * (p. ej. panel/dashboard) para que no arranque enseguida el tutorial específico de esa pantalla.
 */
function finishWelcomeTourPersist(hostMenuPath) {
  markWelcomeTourDone();
  try {
    sessionStorage.setItem('gecko_skip_next_route_tour', '1');
  } catch {
    /* ignore */
  }
  const routeKey = resolveHostRouteKey(hostMenuPath);
  if (routeKey) markRouteTourSeen(routeKey);
}

function applyTourEndState(menuPath, hostMenuPath) {
  if (menuPath === '__welcome__') {
    finishWelcomeTourPersist(hostMenuPath);
    return;
  }
  if (menuPath === '__modals__') return;
  const key = menuPath || hostMenuPath;
  if (key) markRouteTourSeen(key);
}

/**
 * @param {string} menuPath ej. admin/usuarios o __welcome__
 * @param {{ manual?: boolean, hostMenuPath?: string }} opts
 */
export function startCapacitacionInteractiveTour(menuPath, opts = {}) {
  const { hostMenuPath: hostMenuPathOpt } = opts;
  const hostMenuPath = hostMenuPathOpt || pathnameToMenuPath(window.location.pathname || '') || menuPath;

  if (menuPath === '__modals__' && !document.querySelector('.modal.show')) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'info',
        title: t('capacitacion.tour_modals_need_open_title', 'Abra un detalle en ventana emergente'),
        text: t(
          'capacitacion.tour_modals_need_open_body',
          'El tutorial de ventanas emergentes solo está disponible mientras tenga abierto un formulario o vista en ventana emergente. Ábralo desde la tabla o el botón correspondiente y use de nuevo el botón de ayuda o la franja sobre la ventana.'
        ),
      });
    }
    return;
  }

  removeTour();
  const def = getTourStepsForMenuPath(menuPath);
  const slug =
    menuPath === '__welcome__'
      ? menuPathToSlug('panel/capacitacion')
      : menuPath === '__modals__'
        ? menuPathToSlug(hostMenuPath || 'panel/capacitacion')
        : menuPathToSlug(menuPath);

  if (!def || def.length === 0) {
    const title = t('capacitacion.tour_no_steps_title', 'Tutorial interactivo');
    const body = t(
      'capacitacion.tour_no_steps_body',
      'Aún no hay pasos guiados para esta pantalla. Use el manual en Capacitación.'
    );
    const btn = t('capacitacion.tour_open_manual', 'Abrir manual');
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'info',
        title,
        html: `<p class="small mb-0">${escHtml(body)}</p>`,
        showCancelButton: true,
        confirmButtonText: btn,
        cancelButtonText: t('capacitacion.tour_close', 'Cerrar'),
      }).then((r) => {
        if (r.isConfirmed) window.location.href = capacitacionHref(slug);
      });
    } else {
      if (window.confirm(`${title}\n\n${body}`)) window.location.href = capacitacionHref(slug);
    }
    return;
  }

  ensureTourStyles();
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'presentation');

  const spot = document.createElement('div');
  spot.className = 'gecko-cap-tour-spot';
  overlay.appendChild(spot);

  const tooltip = document.createElement('div');
  tooltip.id = TOOLTIP_ID;
  tooltip.setAttribute('role', 'dialog');
  tooltip.setAttribute('aria-modal', 'true');

  document.body.appendChild(overlay);
  document.body.appendChild(tooltip);

  let index = 0;
  let finished = false;

  const introLabel = t('capacitacion.tour_intro_label', 'Introducción a esta parte');
  const detailLabel = t('capacitacion.tour_detail_label', 'Qué hace y cómo usarla');
  const isWelcome = menuPath === '__welcome__';

  const finishTour = (abortedEarly) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey);
    removeTour();
    if (abortedEarly && typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'info',
        title: t('capacitacion.tour_skipped_title', 'Tour finalizado'),
        text: t('capacitacion.tour_skipped_body', 'Algunos pasos no tenían elementos visibles en pantalla.'),
        timer: 2600,
        showConfirmButton: false,
      });
    }
  };

  const completeTour = () => {
    applyTourEndState(menuPath, hostMenuPath);
    finishTour(false);
  };

  const bindDismissActions = () => {
    const offThis = tooltip.querySelector('.gecko-tour-off-this');
    const offAll = tooltip.querySelector('.gecko-tour-off-all');
    offThis?.addEventListener('click', () => {
      if (isWelcome) {
        finishWelcomeTourPersist(hostMenuPath);
      } else if (hostMenuPath) {
        markRouteTourSeen(hostMenuPath);
      }
      finishTour(false);
    });
    offAll?.addEventListener('click', () => {
      setAutoToursGloballyDisabled(true);
      if (isWelcome) finishWelcomeTourPersist(hostMenuPath);
      else if (hostMenuPath) markRouteTourSeen(hostMenuPath);
      finishTour(false);
    });
  };

  const renderStep = () => {
    const step = def[index];
    const el = queryTarget(step.selector);
    const title = t(`capacitacion.${step.titleKey}`, step.titleKey);
    const bodyRaw = t(`capacitacion.${step.bodyKey}`, step.bodyKey);
    const anchorPath = `capacitacion.${String(step.titleKey || '').replace(/_title$/, '_anchor')}`;
    const anchorRaw = t(anchorPath, TOUR_ANCHOR_MISSING);
    const hasAnchor = anchorRaw !== TOUR_ANCHOR_MISSING && anchorRaw !== anchorPath;
    const { intro, detail } = splitIntroDetail(bodyRaw, title);

    if (!el) {
      while (index < def.length && !queryTarget(def[index].selector)) {
        index += 1;
      }
      if (index >= def.length) {
        applyTourEndState(menuPath, hostMenuPath);
        finishTour(true);
        return;
      }
      return renderStep();
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      placeSpotlight(spot, el);
      const prev = t('capacitacion.tour_prev', 'Anterior');
      const next = t('capacitacion.tour_next', 'Siguiente');
      const end = t('capacitacion.tour_finish', 'Terminar');
      const stepLabel = t('capacitacion.tour_step_of', 'Paso {n} de {m}')
        .replace('{n}', String(index + 1))
        .replace('{m}', String(def.length));

      const dismissThisLabel = isWelcome
        ? t('capacitacion.tour_off_welcome', 'No volver a mostrar la bienvenida automática')
        : t('capacitacion.tour_off_this', 'No mostrar el tutorial automático en esta sección');
      const dismissAllLabel = t(
        'capacitacion.tour_off_all',
        'No mostrar tutoriales automáticos en ninguna sección'
      );

      const focusLabel = t(
        'capacitacion.tour_focus_label',
        'Lo que marca el recuadro verde'
      );
      const focusHtml = hasAnchor ? formatBodyParagraphsRich(anchorRaw) : '';
      const introHtml = formatBodyParagraphsRich(intro);
      const detailHtml = formatBodyParagraphsRich(detail);
      const isLast = index === def.length - 1;

      const midFooter = `
        <p class="text-muted mb-0 mt-2 small">${escHtml(
          t(
            'capacitacion.tour_mid_footer_hint',
            'Use «Terminar» o Esc para salir. Para desactivar los tutoriales que se abren solos al entrar en una pantalla, espere al último paso o cierre al final del recorrido.'
          )
        )}</p>`;

      const endFooter = `
        <div class="gecko-tour-dismiss-actions border-top pt-2 mt-1 small">
          <p class="text-body-secondary mb-2 small">${escHtml(
            t(
              'capacitacion.tour_end_where_hint',
              'Puede repetir este tutorial cuando quiera: barra inferior (si no la ocultó), botón Ayuda junto a Excel o menú Ayuda del encabezado. Si ocultó la barra, reactívela en Capacitación, en Ayuda → Mostrar barra inferior de ayuda o desde ese menú.'
            )
          )}</p>
          <button type="button" class="btn btn-link btn-sm text-muted text-decoration-none p-0 d-block gecko-tour-off-this">${escHtml(dismissThisLabel)}</button>
          <button type="button" class="btn btn-link btn-sm text-muted text-decoration-none p-0 d-block gecko-tour-off-all">${escHtml(dismissAllLabel)}</button>
          <p class="text-muted mb-0 mt-2 small">${escHtml(t('capacitacion.tour_esc_hint', 'Pulse Esc para terminar en cualquier momento.'))}</p>
        </div>`;

      tooltip.innerHTML = `
        <div class="small text-success fw-bold text-uppercase mb-1">${escHtml(stepLabel)}</div>
        <h3 class="h6 fw-bold mb-2">${escHtml(title)}</h3>
        ${
          hasAnchor
            ? `<div class="mb-2 gecko-tour-focus-callout border border-success border-opacity-50 rounded-2 p-2 bg-success bg-opacity-10">
          <div class="small fw-semibold text-success mb-1">${escHtml(focusLabel)}</div>
          <div class="tour-focus-block">${focusHtml}</div>
        </div>`
            : ''
        }
        <div class="mb-2">
          <div class="small fw-semibold text-body mb-1">${escHtml(introLabel)}</div>
          <div class="tour-intro-block">${introHtml}</div>
        </div>
        <div class="mb-3">
          <div class="small fw-semibold text-body mb-1">${escHtml(detailLabel)}</div>
          <div class="tour-detail-block">${detailHtml}</div>
        </div>
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
          <button type="button" class="btn btn-outline-secondary btn-sm gecko-tour-prev" ${index === 0 ? 'disabled' : ''}>${escHtml(prev)}</button>
          <div class="d-flex flex-wrap gap-2 justify-content-end">
            <button type="button" class="btn btn-outline-success btn-sm gecko-tour-finish">${escHtml(end)}</button>
            ${
              index < def.length - 1
                ? `<button type="button" class="btn btn-success btn-sm gecko-tour-next">${escHtml(next)}</button>`
                : ''
            }
          </div>
        </div>
        ${isLast ? endFooter : midFooter}
      `;

      tooltip.querySelector('.gecko-tour-prev')?.addEventListener('click', () => {
        index = Math.max(0, index - 1);
        renderStep();
      });
      tooltip.querySelector('.gecko-tour-finish')?.addEventListener('click', () => {
        completeTour();
      });
      tooltip.querySelector('.gecko-tour-next')?.addEventListener('click', () => {
        if (index < def.length - 1) {
          index += 1;
          renderStep();
        } else {
          completeTour();
        }
      });

      if (isLast) bindDismissActions();
      placeTooltip(tooltip, el);
    }, 280);
  };

  const onResize = () => {
    const step = def[index];
    const el = queryTarget(step.selector);
    if (el) {
      placeSpotlight(spot, el);
      placeTooltip(tooltip, el);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      completeTour();
    }
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKey);

  renderStep();
}
