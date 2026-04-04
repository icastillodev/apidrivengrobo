/**
 * GECKO COMMANDS DICTIONARY - Role Based
 * Comandos organizados por idioma y diferenciados por Rol de Usuario.
 */

export const GeckoCommands = {
    /**
     * Palabras de activación (reconocimiento imperfecto).
     * No incluir "eco" suelto (demasiados falsos positivos en frases cotidianas).
     * Incluye marca GROBO y variantes fonéticas frecuentes en ES/EN/PT.
     */
    wakewords: [
        'gecko', 'geco', 'gueco', 'gueko', 'jeko', 'yecko', 'jecko', 'jeco', 'yeco',
        'grobo', 'grovo', 'grubo', 'grobot', 'grobu', 'grobow',
        'gekko', 'geko', 'gheco', 'ghecko', 'gheckoh',
        'xeco', 'zecko', 'secko', 'ceko', 'decko', 'tecko', 'hecko', 'wecko',
        'getko', 'keko', 'keco', 'kiko',
        'gico', 'guco', 'gako', 'gicko', 'gicco', 'greko', 'greco', 'greico',
        'yeiko', 'ieco', 'iecko', 'ecko', 'heckoh',
        'guicko', 'geck', 'gek'
    ],

    // Acciones categorizadas por idioma (Se usan TODAS simultáneamente)
    triggers: {
        search: {
            es: ['buscar', 'búsqueda', 'busca', 'hallar', 'encontrar'],
            en: ['search', 'find', 'lookup', 'looking for', 'get'],
            pt: ['pesquisar', 'procurar', 'busca', 'encontrar']
        },
        select: {
            es: ['elegir', 'seleccionar', 'elige', 'selecciona', 'ver el'],
            en: ['choose', 'select', 'pick', 'view', 'open'],
            pt: ['escolher', 'selecionar', 'escolha', 'ver']
        },
        modify: {
            es: ['modificar', 'editar', 'cambiar', 'actualizar', 'ajustar'],
            en: ['modify', 'edit', 'update', 'change', 'adjust'],
            pt: ['modificar', 'editar', 'alterar', 'atualizar']
        }
    },

    // RUTAS SEGÚN EL ROL DEL USUARIO
    routes: {
        // --- ROL: ADMIN (Niveles 1, 2, 4, 5, 6) ---
        admin: {
            // Usuarios
            'usuarios': 'admin/usuarios.html', 'users': 'admin/usuarios.html', 'usuários': 'admin/usuarios.html',
            // Protocolos (Gestión)
            'protocolos': 'admin/protocolos.html', 'protocols': 'admin/protocolos.html',
            // Animales
            'animales': 'admin/animales.html', 'animals': 'admin/animales.html', 'animais': 'admin/animales.html',
            // Insumos
            'insumos': 'admin/insumos.html', 'supplies': 'admin/insumos.html',
            // Reactivos
            'reactivos': 'admin/reactivos.html', 'reagents': 'admin/reactivos.html', 'reagentes': 'admin/reactivos.html',
            // Alojamientos
            'alojamientos': 'admin/alojamientos.html', 'housing': 'admin/alojamientos.html', 'alojamentos': 'admin/alojamientos.html', 'cajas': 'admin/alojamientos.html',
            // Reservas
            'reservas': 'construccion.html', 'bookings': 'construccion.html',
            // Facturación
            'facturación': 'admin/facturacion/index.html', 'billing': 'admin/facturacion/index.html', 'faturamento': 'admin/facturacion/index.html',
            // Precios
            'precios': 'admin/precios.html', 'prices': 'admin/precios.html'
        },

        // --- ROL: USUARIO / INVESTIGADOR (Nivel 3) ---
        user: {
            // Mis cosas (panel investigador; roles 1/2/4 suelen usar rutas admin o usuario legacy)
            'protocolos': 'panel/misprotocolos.html', 'protocols': 'panel/misprotocolos.html',
            'mis protocolos': 'panel/misprotocolos.html',
            
            'formularios': 'panel/misformularios.html', 'forms': 'panel/misformularios.html',
            'mis formularios': 'panel/misformularios.html',
            
            'alojamientos': 'panel/misalojamientos.html', 'housing': 'panel/misalojamientos.html',
            'mis alojamientos': 'panel/misalojamientos.html',
            'cajas': 'panel/misalojamientos.html',

            'reservas': 'panel/misreservas.html', 'bookings': 'panel/misreservas.html',
            'mis reservas': 'panel/misreservas.html',

            'perfil': 'panel/perfil.html', 'profile': 'panel/perfil.html'
        }
    },

    // Textos de UI (Dependen del idioma configurado en la app)
    ui: {
        es: { 
            retry: 'volver a escuchar', 
            confirm: 'aceptar', 
            firefox_msg: 'Firefox requiere habilitar manualmente el reconocimiento de voz:',
            mic_blocked: 'Micrófono bloqueado. Revisa el candado 🔒 en la barra de URL.'
        },
        en: { 
            retry: 'listen again', 
            confirm: 'accept', 
            firefox_msg: 'Firefox requires manual enablement for voice recognition:',
            mic_blocked: 'Microphone blocked. Check the lock 🔒 icon in the URL bar.'
        },
        pt: { 
            retry: 'ouvir novamente', 
            confirm: 'aceitar', 
            firefox_msg: 'O Firefox requer ativação manual para reconhecimento de voz:',
            mic_blocked: 'Microfone bloqueado. Verifique o cadeado 🔒 na barra de URL.'
        }
    }
};