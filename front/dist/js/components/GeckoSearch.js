import { GeckoSearchEngine } from './GeckoSearchEngine.js';
import { getPanelOrUsuarioPaginasSegment } from './menujs/MenuConfig.js';

/** Debounce para `/search/global`: evita una petición por tecla. */
const OMNI_SEARCH_DEBOUNCE_MS = 300;

function omniTx(key, fallback) {
    const m = window.txt?.menu || {};
    return m[key] != null && String(m[key]).trim() !== '' ? String(m[key]) : fallback;
}

function escapeOmniHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export const GeckoSearch = {
    overlay: null,
    box: null,
    input: null,
    results: null,
    voiceBtn: null,
    voiceTrainBtn: null,
    aiMessageBox: null,
    selectedIndex: -1,
    _omniDebounceTimer: null,
    _omniSearchGeneration: 0,

    _scheduleOmniSearchFromInput(rawTerm) {
        clearTimeout(this._omniDebounceTimer);
        this._omniDebounceTimer = null;
        const term = rawTerm;
        if (!term || term.length < 1) {
            this._omniSearchGeneration++;
            this.renderEmpty();
            return;
        }
        this._omniDebounceTimer = setTimeout(() => {
            this._omniDebounceTimer = null;
            const gen = ++this._omniSearchGeneration;
            this.executeSearch(term, gen);
        }, OMNI_SEARCH_DEBOUNCE_MS);
    },

    _applyNoIaUi() {
        if (this.voiceBtn) this.voiceBtn.classList.add('d-none');
        if (this.voiceTrainBtn) this.voiceTrainBtn.classList.add('d-none');
        if (this.aiMessageBox) this.aiMessageBox.classList.add('d-none');
    },

    init() {
        this.overlay = document.getElementById('gecko-omni-overlay');
        if (!this.overlay) return;

        this.box = this.overlay.querySelector('.gecko-omni-box');
        this.input = document.getElementById('gecko-omni-input');
        this.results = document.getElementById('gecko-omni-results');
        this.voiceBtn = document.getElementById('gecko-omni-voice-btn');
        this.voiceTrainBtn = document.getElementById('gecko-omni-voice-train-btn');
        this.aiMessageBox = document.getElementById('gecko-ai-message');
        this._applyNoIaUi();

        if (this.input) {
            this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
            this.input.oninput = (e) => this._scheduleOmniSearchFromInput(e.target.value);
        }
    },

    open() {
        if (!this.overlay) this.init();
        clearTimeout(this._omniDebounceTimer);
        this._omniDebounceTimer = null;
        this._omniSearchGeneration++;
        this.triggerEl = document.getElementById('gecko-search-trigger');
        this._applyNoIaUi();

        const rect = this.triggerEl.getBoundingClientRect();

        this.box.style.transition = 'none';
        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px';

        this.overlay.classList.add('show');
        this.triggerEl.style.opacity = '0';

        void this.box.offsetWidth;

        this.box.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        const finalWidth = Math.min(800, window.innerWidth * 0.95);
        const finalLeft = (window.innerWidth - finalWidth) / 2;

        this.box.style.top = '100px';
        this.box.style.left = `${finalLeft}px`;
        this.box.style.width = `${finalWidth}px`;
        this.box.style.height = 'auto';
        this.box.style.minHeight = '56px';
        this.box.style.borderRadius = '16px';

        this.box.classList.add('open');

        setTimeout(() => {
            this.input.focus();
            this.input.value = '';
        }, 100);

        document.body.style.overflow = 'hidden';
        if (this.results) this.results.innerHTML = '';
        this.selectedIndex = -1;
    },

    close() {
        if (!this.overlay) return;
        clearTimeout(this._omniDebounceTimer);
        this._omniDebounceTimer = null;
        this._omniSearchGeneration++;

        const rect = this.triggerEl.getBoundingClientRect();
        this.box.classList.remove('open');

        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px';
        this.box.style.opacity = '0';

        setTimeout(() => {
            this.overlay.classList.remove('show');
            this.triggerEl.style.opacity = '1';
            document.body.style.overflow = '';

            if (this.input) this.input.value = '';
            if (this.results) this.renderEmpty();
            this.box.style = '';
        }, 380);

        this.selectedIndex = -1;
    },

    setInput(text) {
        if (this.input) this.input.value = text;
        clearTimeout(this._omniDebounceTimer);
        this._omniDebounceTimer = null;
        const gen = ++this._omniSearchGeneration;
        this.executeSearch(text, gen);
    },

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        const items = this.results ? this.results.querySelectorAll('.gecko-result-item[href]') : [];

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                this.selectedIndex++;
                if (this.selectedIndex >= items.length) this.selectedIndex = 0;
            } else {
                this.selectedIndex--;
                if (this.selectedIndex < 0) this.selectedIndex = items.length - 1;
            }

            this.updateSelection(items);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                window.location.href = items[this.selectedIndex].getAttribute('href');
                this.close();
                return;
            }
            if (items.length > 0) {
                window.location.href = items[0].getAttribute('href');
                this.close();
            }
        }
    },

    updateSelection(items) {
        items.forEach((item) => {
            item.classList.remove('active-result', 'bg-success-subtle', 'border-start', 'border-4', 'border-success');
        });
        if (items[this.selectedIndex]) {
            const activeItem = items[this.selectedIndex];
            activeItem.classList.add('active-result', 'bg-success-subtle', 'border-start', 'border-4', 'border-success');
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    async executeSearch(term, gen) {
        if (!term || term.length < 1) {
            this.renderEmpty();
            return;
        }
        if (gen !== undefined && gen !== this._omniSearchGeneration) return;
        this.renderSpinner();

        const analysis = GeckoSearchEngine.analyze(term);

        try {
            const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? '/URBE-API-DRIVEN/front/'
                : '/';

            const { API } = await import(`${basePath}dist/js/api.js`);

            const instId = localStorage.getItem('instId');
            const params = new URLSearchParams({
                q: analysis.term,
                scope: analysis.scope,
                inst: instId,
                role: localStorage.getItem('userLevel'),
                uid: localStorage.getItem('userId'),
            });

            const res = await API.request(`/search/global?${params.toString()}`);

            if (gen !== undefined && gen !== this._omniSearchGeneration) return;

            if (res.status === 'success') {
                this.renderResults(res.data, term);
            } else if (res.http_status === 401 || res.http_status === 403) {
                const msg = omniTx('search_omni_session_expired', 'Sesión expirada. Vuelva a iniciar sesión.');
                this.results.innerHTML = `<div class="p-3 text-center text-warning small">${escapeOmniHtml(msg)}</div>`;
            } else {
                const msg = omniTx('search_omni_error', 'No se pudo completar la búsqueda.');
                this.results.innerHTML = `<div class="p-3 text-center text-danger small">${escapeOmniHtml(msg)}</div>`;
            }
        } catch (err) {
            if (gen !== undefined && gen !== this._omniSearchGeneration) return;
            const msg = omniTx('search_omni_error', 'No se pudo completar la búsqueda.');
            this.results.innerHTML = `<div class="p-3 text-center text-danger small">${escapeOmniHtml(msg)}</div>`;
        }
    },

    _sectionHeader(label) {
        return `<div class="small fw-bold text-muted px-3 py-2 bg-light text-uppercase" style="font-size:10px;">${escapeOmniHtml(label)}</div>`;
    },

    _resultRow(href, iconClass, iconColor, title, subtitle, badge, tabIndex) {
        return `
            <a href="${href}" tabindex="${tabIndex}" class="gecko-result-item list-group-item list-group-item-action border-0 mb-1 rounded d-flex align-items-center gap-3">
                <span class="${iconColor}"><i class="bi ${iconClass} fs-5"></i></span>
                <div class="d-flex flex-column flex-grow-1" style="overflow:hidden;min-width:0;">
                    <span class="fw-bold text-truncate text-dark" style="font-size: 13px;">${escapeOmniHtml(title)}</span>
                    <span class="small text-muted text-truncate" style="font-size: 11px;">${escapeOmniHtml(subtitle)}</span>
                </div>
                <span class="badge bg-light text-secondary border ms-auto flex-shrink-0">${escapeOmniHtml(badge)}</span>
            </a>`;
    },

    renderResults(data, term) {
        this.selectedIndex = -1;
        if (!this.results) return;

        const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/URBE-API-DRIVEN/front/'
            : '/';
        const misFormSeg = getPanelOrUsuarioPaginasSegment();
        let html = '';
        let hasResults = false;
        let globalIndex = 0;

        const catProt = omniTx('search_cat_protocolo', 'Protocolos');
        const catPed = omniTx('search_cat_pedido', 'Pedidos y formularios');
        const catUsr = omniTx('search_cat_usuario', 'Usuarios');
        const catAloj = omniTx('search_cat_alojamiento', 'Alojamientos');
        const catIns = omniTx('search_cat_insumo', 'Insumos');
        const catDepto = omniTx('search_cat_departamento', 'Departamentos');
        const catOrg = omniTx('search_cat_organismo', 'Organismos');

        if (data.protocolos?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catProt);
            data.protocolos.forEach((p) => {
                const title = p.tituloA || p.nprotA || `#${p.idprotA}`;
                const sub = [
                    p.nprotA ? `N° ${p.nprotA}` : '',
                    p.ApellidoA ? `Inv: ${p.ApellidoA}` : '',
                    p.nombre_depto || '',
                ].filter(Boolean).join(' · ');
                html += this._resultRow(
                    `${basePath}paginas/admin/protocolos.html?id=${p.idprotA}&action=edit`,
                    'bi-file-earmark-medical',
                    'text-secondary',
                    title,
                    sub || catProt,
                    'PROT',
                    globalIndex++
                );
            });
        }

        if (data.formularios?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catPed);
            data.formularios.forEach((f) => {
                const catNombre = f.categoria_nombre || f.tipoA || '';
                const title = `${catNombre || catPed} #${f.idformA}`;
                const sub = [
                    f.estado || '',
                    f.nprotA ? `Prot ${f.nprotA}` : '',
                    f.ApellidoA ? `${f.ApellidoA}, ${f.NombreA || ''}`.trim() : '',
                ].filter(Boolean).join(' · ');
                html += this._resultRow(
                    `${basePath}paginas/${misFormSeg}/misformularios.html?id=${f.idformA}&action=view`,
                    'bi-ui-checks',
                    'text-primary',
                    title,
                    sub,
                    String(f.estado || 'FORM'),
                    globalIndex++
                );
            });
        }

        if (data.usuarios?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catUsr);
            data.usuarios.forEach((u) => {
                html += this._resultRow(
                    `${basePath}paginas/admin/usuarios.html?id=${u.IdUsrA}`,
                    'bi-person-badge',
                    'text-success',
                    `${u.ApellidoA}, ${u.NombreA}`,
                    u.EmailA || '',
                    `ID ${u.IdUsrA}`,
                    globalIndex++
                );
            });
        }

        if (data.alojamientos?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catAloj);
            data.alojamientos.forEach((a) => {
                const title = `${catAloj} #${a.historia}`;
                const sub = [a.nprotA ? `Prot ${a.nprotA}` : '', a.ApellidoA || ''].filter(Boolean).join(' · ');
                const href = a.idprotA
                    ? `${basePath}paginas/admin/facturacion/protocolo.html?prot=${a.idprotA}`
                    : '#';
                html += this._resultRow(href, 'bi-house-door', 'text-warning', title, sub, 'ALOJ', globalIndex++);
            });
        }

        if (data.insumos?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catIns);
            data.insumos.forEach((i) => {
                html += this._resultRow(
                    `${basePath}paginas/admin/insumos.html`,
                    'bi-box-seam',
                    'text-info',
                    i.NombreInsumo || catIns,
                    [i.TipoInsumo, i.CantidadInsumo].filter(Boolean).join(' · '),
                    'INS',
                    globalIndex++
                );
            });
        }

        if (data.departamentos?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catDepto);
            data.departamentos.forEach((d) => {
                html += this._resultRow(
                    `${basePath}paginas/admin/facturacion/depto.html?depto=${d.iddeptoA}`,
                    'bi-building',
                    'text-dark',
                    d.NombreDeptoA,
                    d.nombre_organismo || catDepto,
                    'DEPTO',
                    globalIndex++
                );
            });
        }

        if (data.organismos?.length > 0) {
            hasResults = true;
            html += this._sectionHeader(catOrg);
            data.organismos.forEach((o) => {
                html += this._resultRow(
                    `${basePath}paginas/admin/facturacion/org.html`,
                    'bi-diagram-3',
                    'text-info',
                    o.NombreOrganismo,
                    catOrg,
                    'ORG',
                    globalIndex++
                );
            });
        }

        if (!hasResults) {
            this.renderNoResults(term);
        } else {
            this.results.innerHTML = `<div class="list-group shadow-sm pb-2">${html}</div>`;
        }
    },

    renderEmpty() {
        const hint = omniTx(
            'search_omni_empty_hint',
            'Escriba para buscar. Prefijos: protocolo, pedido, usuario, alojamiento, insumo, departamento, organismo.'
        );
        this.results.innerHTML = `<div class="gecko-omni-empty p-4 text-center text-muted small"><i class="bi bi-search fs-1 d-block mb-2 opacity-25"></i>${escapeOmniHtml(hint)}</div>`;
    },

    renderSpinner() {
        this.results.innerHTML = `<div class="p-4 text-center"><div class="spinner-border text-success spinner-border-sm"></div></div>`;
    },

    renderNoResults(term) {
        const noRes = omniTx('search_omni_no_results', 'No hay coincidencias para');
        const hints = omniTx(
            'search_omni_prefix_hints',
            'Pruebe con prefijos: pedido 123 · protocolo ABC · usuario García · insumo micro'
        );
        this.results.innerHTML = `
            <div class="p-4 text-center">
                <i class="bi bi-clipboard-x text-muted fs-1 opacity-50 mb-2 d-block"></i>
                <p class="text-muted small mb-2">${escapeOmniHtml(noRes)} <b>${escapeOmniHtml(term)}</b></p>
                <p class="text-muted small mb-0" style="font-size:11px;">${escapeOmniHtml(hints)}</p>
            </div>`;
    },
};

export function initGlobalSearchUI() {
    GeckoSearch.init();

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
            const typing =
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
                document.activeElement?.isContentEditable;
            if (typing && !document.getElementById('gecko-omni-overlay')?.classList.contains('show')) {
                return;
            }
            e.preventDefault();
            const overlay = document.getElementById('gecko-omni-overlay');
            if (overlay && overlay.classList.contains('show')) {
                GeckoSearch.close();
            } else {
                GeckoSearch.open();
            }
        }
    });
}
