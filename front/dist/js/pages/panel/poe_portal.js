import { API } from '../../api.js?v=20260703';
import { buildPanelPoePublicUrl, printPoeQrSheet, showPoeQrSwal } from '../../utils/poeQrPrint.js?v=20260703';
import { escapePoeHtml, formatPoeFecha, paintPoeDetail, poeCleanText } from '../../utils/poeDetailUi.js?v=20260703';
import { exposePoeAssetVersion } from '../../assetVersion.js?v=20260703';

/** @see assetVersion.js POE_ASSET_VERSION */
export const POE_PORTAL_VERSION = '20260521';

export async function initPortalPoe() {
    exposePoeAssetVersion();
    const t = window.txt?.comunicacion || {};
    const grid = document.getElementById('poe-portal-grid');
    const modalEl = document.getElementById('modal-poe-portal-detalle');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    const elTitulo = document.getElementById('poe-detalle-titulo');
    const elResena = document.getElementById('poe-detalle-resena');
    const elCuerpo = document.getElementById('poe-detalle-cuerpo');
    const elCuerpoLabel = document.getElementById('poe-detalle-cuerpo-label');
    const elAdjuntos = document.getElementById('poe-detalle-adjuntos');
    const elMeta = document.getElementById('poe-detalle-meta');
    const btnQr = document.getElementById('btn-poe-detalle-qr');
    const btnPrintQr = document.getElementById('btn-poe-detalle-print-qr');

    let currentDetail = { id: 0, titulo: '', url: '' };

    async function cargarLista() {
        if (!grid) return;
        const loadingMsg = escapePoeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></div>`;

        const res = await API.request('/comunicacion/poe', 'GET');
        const rows = res?.data?.rows;
        if (res.status !== 'success' || !Array.isArray(rows)) {
            grid.innerHTML = `<div class="col-12 text-danger small py-4">${escapePoeHtml(res.message || t.err_generico || '')}</div>`;
            return;
        }

        if (!rows.length) {
            grid.innerHTML = `<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-muted text-center py-5">${escapePoeHtml(t.poe_empty || '')}</div></div></div>`;
            return;
        }

        grid.innerHTML = rows
            .map((r) => {
                const id = parseInt(r.IdPoe, 10) || 0;
                const fe = r.FechaActualizacion || r.FechaCreacion || '';
                const resena = poeCleanText(r.Resena);
                const extracto = escapePoeHtml(resena || '—');
                const btnVer = escapePoeHtml(t.poe_btn_ver_detalle || t.portal_leer_mas || '');
                const btnQrLbl = escapePoeHtml(t.poe_btn_qr || '');
                const metaLbl = escapePoeHtml(t.poe_meta_actualizado || '');
                return `
            <div class="col d-flex">
                <article class="card shadow-sm border poe-portal-card w-100 h-100">
                    <div class="card-body d-flex flex-column p-4">
                        <div class="small text-muted text-uppercase mb-2" style="font-size:11px;letter-spacing:.04em">${metaLbl}: ${escapePoeHtml(formatPoeFecha(fe))}</div>
                        <h2 class="h5 fw-bold mb-2">${escapePoeHtml(r.Titulo || '—')}</h2>
                        <p class="small text-muted mb-3 flex-grow-1" style="display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45">${extracto}</p>
                        <div class="d-flex flex-wrap gap-2 mt-auto">
                            <button type="button" class="btn btn-outline-success btn-sm fw-bold" data-poe-ver="${id}">${btnVer} <i class="bi bi-arrow-right ms-1"></i></button>
                            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-poe-qr="${id}" data-poe-title="${escapePoeHtml(r.Titulo || '')}">
                                <i class="bi bi-qr-code me-1"></i>${btnQrLbl}
                            </button>
                        </div>
                    </div>
                </article>
            </div>`;
            })
            .join('');

        grid.querySelectorAll('[data-poe-ver]').forEach((b) => {
            b.addEventListener('click', () => abrirDetalle(parseInt(b.getAttribute('data-poe-ver'), 10)));
        });
        grid.querySelectorAll('[data-poe-qr]').forEach((b) => {
            b.addEventListener('click', () => {
                const id = parseInt(b.getAttribute('data-poe-qr'), 10);
                const title = b.getAttribute('data-poe-title') || '';
                const url = buildPanelPoePublicUrl(id);
                showPoeQrSwal(t, title, url);
            });
        });
    }

    function pintarDetalle(d) {
        currentDetail = paintPoeDetail(d, {
            titulo: elTitulo,
            resena: elResena,
            cuerpo: elCuerpo,
            cuerpoLabel: elCuerpoLabel,
            adjuntos: elAdjuntos,
            meta: elMeta,
        }, t);
    }

    async function abrirDetalle(id) {
        if (!id) return;
        const res = await API.request(`/comunicacion/poe/${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || t.err_generico || '' });
            return;
        }
        pintarDetalle(res.data);
        modal?.show();
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('id', String(id));
            window.history.replaceState({}, '', u.toString());
        } catch (e) {
            /* ignore */
        }
    }

    btnQr?.addEventListener('click', () => {
        if (!currentDetail.id) return;
        showPoeQrSwal(t, currentDetail.titulo, currentDetail.url);
    });

    btnPrintQr?.addEventListener('click', () => {
        if (!currentDetail.id) return;
        if (!printPoeQrSheet(currentDetail.titulo, currentDetail.url)) {
            window.Swal?.fire?.({ icon: 'warning', text: t.poe_print_blocked || '' });
        }
    });

    await cargarLista();

    try {
        const u = new URL(window.location.href);
        const idParam = parseInt(u.searchParams.get('id') || '0', 10);
        if (idParam > 0) await abrirDetalle(idParam);
    } catch (e) {
        /* ignore */
    }
}
