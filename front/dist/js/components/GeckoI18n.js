/**
 * GECKO INTERNATIONALIZATION (I18N)
 * Diccionario de textos para la interfaz JS.
 */

export const GeckoI18n = {
    lang: localStorage.getItem('lang') || 'es',

    texts: {
        es: {
            loading: 'Cargando...',
            search_placeholder: 'Buscador global...',
            search_btn: 'BUSCAR',
            no_results: 'No se encontraron coincidencias.',
            error_net: 'Error de conexión.',
            labels: {
                protocols: 'Protocolos',
                users: 'Personal / Investigadores',
                housing: 'Alojamientos (Historia)',
                supplies: 'Insumos y Materiales'
            },
            stock: 'Stock',
            history: 'Historia',
            prot: 'Prot'
        },
        en: {
            loading: 'Loading...',
            search_placeholder: 'Global search...',
            search_btn: 'SEARCH',
            no_results: 'No matches found.',
            error_net: 'Connection error.',
            labels: {
                protocols: 'Protocols',
                users: 'Staff / Researchers',
                housing: 'Housing (History)',
                supplies: 'Supplies & Materials'
            },
            stock: 'Stock',
            history: 'History',
            prot: 'Prot'
        },
        pt: {
            loading: 'Carregando...',
            search_placeholder: 'Busca global...',
            search_btn: 'BUSCAR',
            no_results: 'Nenhuma correspondência encontrada.',
            error_net: 'Erro de conexão.',
            labels: {
                protocols: 'Protocolos',
                users: 'Pessoal / Pesquisadores',
                housing: 'Alojamentos (História)',
                supplies: 'Insumos e Materiais'
            },
            stock: 'Estoque',
            history: 'História',
            prot: 'Prot'
        }
    },

    // Función para obtener texto: GeckoI18n.get('search_btn')
    get(key) {
        const l = this.lang;
        // Soporte para claves anidadas (ej: labels.protocols)
        if (key.includes('.')) {
            const [group, subkey] = key.split('.');
            return this.texts[l][group]?.[subkey] || this.texts['es'][group]?.[subkey] || key;
        }
        return this.texts[l][key] || this.texts['es'][key] || key;
    }
};