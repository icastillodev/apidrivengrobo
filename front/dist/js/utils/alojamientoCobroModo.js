/**
 * Modo de cobro alojamiento (por alojamiento vs por sujeto/animal).
 * Requiere modulosactivosinst.Habilitado = 1 en IdModulosApp = 6 (trazabilidad).
 */
import { API } from '../api.js';
import {
    ID_MODULO_TRAZABILIDAD_ALOJAMIENTOS,
    isTrazabilidadAlojamientosInstActiva,
} from '../modulesAccess.js';

export { ID_MODULO_TRAZABILIDAD_ALOJAMIENTOS };

export function isTrazabilidadCobroInstActiva(apiFlag = false) {
    return !!apiFlag || isTrazabilidadAlojamientosInstActiva();
}

export function escapeCobroHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Switch compacto en la fila de tipo alojamiento (tarifario). */
export function htmlAlojCobroSwitchRow(idTipo, modo) {
    const txtP = window.txt?.precios || {};
    const isSujeto = modo === 'SUJETO';
    const swId = `aloj-cobro-sw-${idTipo}`;
    const lblAloj = escapeCobroHtml(txtP.switch_lbl_aloj_short || 'Caja');
    const lblSuj = escapeCobroHtml(txtP.switch_lbl_sujeto_short || 'Animal');
    const title = escapeCobroHtml(
        `${txtP.modo_cobro_contenido || ''} ↔ ${txtP.modo_cobro_sujeto || ''}`
    );
    return `
        <div class="d-flex flex-column align-items-center gap-0" title="${title}">
            <div class="form-check form-switch m-0">
                <input type="checkbox" class="form-check-input aloj-cobro-switch" role="switch"
                    id="${escapeCobroHtml(swId)}" ${isSujeto ? 'checked' : ''} style="cursor:pointer;"
                    onchange="window.__preciosSyncCobroLbl?.(this)">
            </div>
            <span class="aloj-cobro-lbl text-muted" style="font-size:9px;line-height:1.2;"
                data-lbl-aloj="${lblAloj}" data-lbl-suj="${lblSuj}">${isSujeto ? lblSuj : lblAloj}</span>
        </div>`;
}

/** HTML del switch global (legacy; ya no se usa en tarifario). */
export function htmlAlojamientoCobroSwitch(modo, switchId = 'aloj-cobro-modo-switch') {
    const txtP = window.txt?.precios || {};
    const isSujeto = modo === 'SUJETO';
    return `
        <label class="small fw-bold text-muted uppercase mb-1 d-block">${escapeCobroHtml(txtP.modo_cobro_title || '')}</label>
        <p class="small text-muted mb-2">${escapeCobroHtml(txtP.modo_cobro_help || '')}</p>
        <div class="d-flex align-items-center gap-3 flex-wrap py-1">
            <span class="small fw-semibold text-secondary">${escapeCobroHtml(txtP.modo_cobro_contenido || '')}</span>
            <div class="form-check form-switch m-0 fs-5">
                <input class="form-check-input" type="checkbox" role="switch" id="${escapeCobroHtml(switchId)}"
                    ${isSujeto ? 'checked' : ''} style="cursor:pointer;">
                <label class="form-check-label small fw-bold text-success" for="${escapeCobroHtml(switchId)}"
                    style="cursor:pointer;">${escapeCobroHtml(txtP.modo_cobro_sujeto || '')}</label>
            </div>
        </div>`;
}

export async function saveAlojamientoCobroModo(instId, modo) {
    const inst = parseInt(String(instId ?? '').trim(), 10);
    const payload = {
        instId: Number.isFinite(inst) && inst > 0 ? inst : undefined,
        alojamiento_cobro_modo: modo === 'SUJETO' ? 'SUJETO' : 'CONTENIDO',
    };
    return API.request('/precios/alojamiento-cobro-modo', 'POST', payload);
}

/** Enlaza el switch tras insertar HTML (reemplaza el nodo anterior si existía). */
export function bindAlojamientoCobroSwitch(switchId, onChange) {
    const prev = document.getElementById(switchId);
    if (!prev || typeof onChange !== 'function') return;
    const sw = prev.cloneNode(true);
    prev.replaceWith(sw);
    sw.addEventListener('change', () => onChange(sw.checked ? 'SUJETO' : 'CONTENIDO', sw));
}
