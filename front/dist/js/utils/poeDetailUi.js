/**
 * UI compartida para detalle de POE (portal y dashboard).
 */
import { API } from '../api.js';
import { buildPanelPoePublicUrl, printPoeQrSheet, showPoeQrSwal } from './poeQrPrint.js';

const DASH_MODAL_ID = 'grobo-modal-poe-dashboard';
let dashModalWired = false;
let dashPoeCurrent = { id: 0, titulo: '', url: '' };

export function escapePoeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatPoeFecha(ds) {
    if (!ds) return '—';
    const d = new Date(ds);
    return Number.isNaN(d.getTime()) ? String(ds).substring(0, 16) : d.toLocaleString();
}

/** Valores placeholder/default que no deben mostrarse (quedan del alta del POE). */
const POE_PLACEHOLDER_TEXTS = new Set(['texto', 'subtitulo', 'subtítulo', 'descripcion', 'descripción']);

/** Limpia un texto de POE: si es vacío o un placeholder default, devuelve ''. */
export function poeCleanText(s) {
    const v = String(s ?? '').trim();
    if (!v) return '';
    return POE_PLACEHOLDER_TEXTS.has(v.toLowerCase()) ? '' : v;
}

export function poeHasTextContent(d) {
    const resena = poeCleanText(d?.Resena);
    const cuerpo = poeCleanText(d?.Cuerpo);
    return !!(resena || cuerpo);
}

export function poeHasAdjuntos(d) {
    const adj = Array.isArray(d?.adjuntos) ? d.adjuntos : [];
    return adj.some((a) => {
        const url = String(a?.url ?? '').trim();
        return url !== '' || a?.origen === 'b2';
    });
}

/** HTML del cuerpo / aviso cuando solo hay enlace de documento. */
export function formatPoeCuerpoHtml(d, t) {
    const cuerpo = poeCleanText(d?.Cuerpo);
    const hasAdj = poeHasAdjuntos(d);
    if (!poeHasTextContent(d) && hasAdj) {
        return `<p class="small text-muted mb-0">${escapePoeHtml(t.poe_ver_doc_hint || '')}</p>`;
    }
    if (!cuerpo) {
        return `<p class="text-muted small mb-0">${escapePoeHtml(t.poe_sin_texto || '—')}</p>`;
    }
    return `<div class="poe-cuerpo-text small" style="white-space:pre-wrap;">${escapePoeHtml(cuerpo)}</div>`;
}

export async function openPoeAdjunto(idPoe, slot) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API.urlBase}/comunicacion/poe/${idPoe}/adjunto/${slot}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
}

/**
 * Pinta el detalle en refs del DOM (portal o dashboard).
 * @param {object} d — payload de /comunicacion/poe/:id
 * @param {{ titulo?, resena?, cuerpo?, cuerpoLabel?, adjuntos?, meta? }} refs
 * @param {object} t — window.txt.comunicacion
 */
export function paintPoeDetail(d, refs, t) {
    const id = parseInt(d.IdPoe, 10) || 0;
    const resena = poeCleanText(d.Resena);
    const cuerpo = poeCleanText(d.Cuerpo);
    const hasText = !!(resena || cuerpo);
    const hasAdj = poeHasAdjuntos(d);

    if (refs.titulo) refs.titulo.textContent = d.Titulo || '—';
    if (refs.resena) {
        refs.resena.textContent = resena;
        refs.resena.classList.toggle('d-none', !resena);
    }
    if (refs.cuerpoLabel) {
        const showLabel = hasText || (!hasText && !hasAdj);
        refs.cuerpoLabel.classList.toggle('d-none', !showLabel);
    }
    if (refs.cuerpo) refs.cuerpo.innerHTML = formatPoeCuerpoHtml(d, t);

    const fe = d.FechaActualizacion || d.FechaCreacion || '';
    if (refs.meta) {
        const lbl = t.poe_meta_actualizado || '';
        refs.meta.textContent = fe ? `${lbl}: ${formatPoeFecha(fe)}` : '';
    }

    const adj = Array.isArray(d.adjuntos) ? d.adjuntos : [];
    if (refs.adjuntos) {
        if (!adj.length) {
            refs.adjuntos.innerHTML = '';
            refs.adjuntos.classList.add('d-none');
        } else {
            refs.adjuntos.classList.remove('d-none');
            const lab = escapePoeHtml(t.poe_adjuntos || '');
            const btns = adj
                .map((a, idx) => {
                    const nom = escapePoeHtml(a.nombre || a.url || '—');
                    const slot = idx + 1;
                    if (a.origen === 'b2') {
                        return `<button type="button" class="btn btn-sm btn-outline-secondary" data-poe-adj="${id}" data-poe-slot="${slot}">${nom}</button>`;
                    }
                    const href = escapePoeHtml(a.url || '#');
                    return `<a class="btn btn-sm btn-outline-secondary" href="${href}" target="_blank" rel="noopener noreferrer">${nom}</a>`;
                })
                .join('');
            refs.adjuntos.innerHTML = `<div class="small text-muted text-uppercase mb-2 fw-semibold" style="font-size:11px;">${lab}</div><div class="d-flex flex-wrap gap-2">${btns}</div>`;
            refs.adjuntos.querySelectorAll('[data-poe-adj]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const pid = parseInt(btn.getAttribute('data-poe-adj'), 10);
                    const slot = parseInt(btn.getAttribute('data-poe-slot'), 10);
                    try {
                        await openPoeAdjunto(pid, slot);
                    } catch (_) {
                        await window.Swal?.fire?.({ icon: 'error', text: t.err_generico || '' });
                    }
                });
            });
        }
    }

    return { id, titulo: String(d.Titulo || ''), url: buildPanelPoePublicUrl(id) };
}

function ensureDashboardPoeModal(t) {
    if (document.getElementById(DASH_MODAL_ID)) return;
    const cerrar = escapePoeHtml(t.modal_cerrar || t.admin_cancelar || '');
    const lblQr = escapePoeHtml(t.poe_btn_qr || '');
    const lblPrint = escapePoeHtml(t.poe_btn_imprimir_qr || '');
    const lblCuerpo = escapePoeHtml(t.pp_lbl_cuerpo || '');
    document.body.insertAdjacentHTML(
        'beforeend',
        `<div class="modal fade" id="${DASH_MODAL_ID}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <div class="w-100">
                            <p class="small text-muted mb-1" id="dash-poe-detalle-meta"></p>
                            <h5 class="modal-title fw-black" id="dash-poe-detalle-titulo"></h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-2">
                        <p class="small text-muted mb-3" id="dash-poe-detalle-resena"></p>
                        <p class="small fw-bold text-uppercase text-muted mb-2" id="dash-poe-detalle-cuerpo-label">${lblCuerpo}</p>
                        <div id="dash-poe-detalle-cuerpo" class="mb-4"></div>
                        <div id="dash-poe-detalle-adjuntos" class="mb-2"></div>
                    </div>
                    <div class="modal-footer flex-wrap gap-2">
                        <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" id="btn-dash-poe-qr">
                            <i class="bi bi-qr-code me-1"></i>${lblQr}
                        </button>
                        <button type="button" class="btn btn-success btn-sm fw-bold" id="btn-dash-poe-print-qr">
                            <i class="bi bi-printer me-1"></i>${lblPrint}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm fw-bold" data-bs-dismiss="modal">${cerrar}</button>
                    </div>
                </div>
            </div>
        </div>`
    );
}

function wireDashboardPoeModal(t) {
    if (dashModalWired) return;
    dashModalWired = true;

    document.getElementById('btn-dash-poe-qr')?.addEventListener('click', () => {
        if (!dashPoeCurrent.id) return;
        showPoeQrSwal(t, dashPoeCurrent.titulo, dashPoeCurrent.url);
    });
    document.getElementById('btn-dash-poe-print-qr')?.addEventListener('click', () => {
        if (!dashPoeCurrent.id) return;
        if (!printPoeQrSheet(dashPoeCurrent.titulo, dashPoeCurrent.url)) {
            window.Swal?.fire?.({ icon: 'warning', text: t.poe_print_blocked || '' });
        }
    });
}

/** Abre el POE en un popup en el dashboard (sin navegar a la sección POEs). */
export async function openPoeDashboardModal(idPoe) {
    const t = window.txt?.comunicacion || {};
    const id = parseInt(idPoe, 10) || 0;
    if (!id) return;

    ensureDashboardPoeModal(t);
    wireDashboardPoeModal(t);

    const res = await API.request(`/comunicacion/poe/${id}`, 'GET');
    if (res.status !== 'success' || !res.data) {
        await window.Swal?.fire?.({ icon: 'error', text: res.message || t.err_generico || '' });
        return;
    }

    dashPoeCurrent = paintPoeDetail(res.data, {
        titulo: document.getElementById('dash-poe-detalle-titulo'),
        resena: document.getElementById('dash-poe-detalle-resena'),
        cuerpo: document.getElementById('dash-poe-detalle-cuerpo'),
        cuerpoLabel: document.getElementById('dash-poe-detalle-cuerpo-label'),
        adjuntos: document.getElementById('dash-poe-detalle-adjuntos'),
        meta: document.getElementById('dash-poe-detalle-meta'),
    }, t);

    const modalEl = document.getElementById(DASH_MODAL_ID);
    if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}
