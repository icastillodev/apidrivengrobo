/** Restaura scroll / foco tras recargar facturación (saldo, pagos). */

const STORAGE_KEY = 'urbe_billing_scroll_restore_v1';

function normUsr(idUsr) {
    if (idUsr == null || idUsr === '') return null;
    const n = parseInt(String(idUsr), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function normProt(idProt) {
    if (idProt == null || idProt === '') return null;
    const n = parseInt(String(idProt), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Llamar justo antes del POST que dispara `cargarFacturacion*`.
 * @param {{ idUsr?: unknown, idProt?: unknown }} opts
 */
export function billingArmScrollRestore(opts = {}) {
    const idUsr = normUsr(opts.idUsr);
    const idProt = normProt(opts.idProt);
    const payload = {
        path: `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY ?? window.pageYOffset ?? 0,
        idUsr,
        idProt,
    };
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
        /* ignore */
    }
    if (idProt !== null) {
        window.__billingRestoreProtId = idProt;
    } else {
        delete window.__billingRestoreProtId;
    }
}

function scrollEl(el) {
    if (!el) return false;
    try {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Tras `await cargarFacturacion*` y pintado del DOM.
 */
export function billingApplyScrollRestore() {
    let payload = null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) payload = JSON.parse(raw);
    } catch (_) {
        payload = null;
    }
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
        /* ignore */
    }

    const finish = () => {
        if (window.__billingRestoreProtId != null) {
            delete window.__billingRestoreProtId;
        }
    };

    if (!payload || typeof payload !== 'object') {
        finish();
        return;
    }

    const pathNow = `${window.location.pathname}${window.location.search}`;
    if (payload.path && pathNow !== payload.path) {
        finish();
        return;
    }

    const tryScroll = () => {
        const idProt = normProt(payload.idProt);
        if (idProt !== null) {
            const card = document.getElementById(`card-prot-${idProt}`);
            if (scrollEl(card)) return;
            const inpProt = document.getElementById(`inp-saldo-prot-${idProt}`);
            if (scrollEl(inpProt?.closest('.card-protocolo') || inpProt?.closest('.card'))) return;
            const anyProt = document.querySelector(`[data-prot="${idProt}"]`);
            if (scrollEl(anyProt?.closest('.card-protocolo') || anyProt?.closest('.card'))) return;
        }

        const idUsr = normUsr(payload.idUsr);
        if (idUsr !== null) {
            const inp = document.getElementById(`inp-saldo-${idUsr}`);
            const wrap =
                inp?.closest('.col-md-6') ||
                inp?.closest('tr') ||
                inp?.closest('.border.rounded.p-2');
            if (scrollEl(wrap)) return;

            const row = document.querySelector(`tr[data-billing-inv="${idUsr}"]`);
            if (scrollEl(row)) return;
        }

        if (idUsr !== null) {
            const saldoMaestro = document.getElementById('contenedor-saldo-maestro');
            if (scrollEl(saldoMaestro)) return;
        }

        const y = typeof payload.scrollY === 'number' ? payload.scrollY : 0;
        try {
            window.scrollTo({ top: y, behavior: 'auto' });
        } catch (_) {
            window.scrollTo(0, y);
        }
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            tryScroll();
            setTimeout(() => {
                tryScroll();
                finish();
            }, 150);
        });
    });
}
