/**
 * GECKO COMMANDS DICTIONARY - Role Based
 * Comandos organizados por idioma y diferenciados por Rol de Usuario.
 */

export const GeckoCommands = {
    // Palabras de activación (Universal)
    wakewords: [
        'gecko', 'geco', 'gueco', 'eco', 'jeco', 'yecko', 
        'gico', 'guco', 'gako', 'gicko', 'jecko', 'jeko', 
        'ghecko', 'getko', 'keko'
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
            // Mis Cosas (Rutas personalizadas)
            'protocolos': 'usuario/misprotocolos.html', 'protocols': 'usuario/misprotocolos.html',
            'mis protocolos': 'usuario/misprotocolos.html',
            
            'formularios': 'usuario/misformularios.html', 'forms': 'usuario/misformularios.html',
            'mis formularios': 'usuario/misformularios.html',
            
            'alojamientos': 'usuario/misalojamientos.html', 'housing': 'usuario/misalojamientos.html',
            'mis alojamientos': 'usuario/misalojamientos.html',
            'cajas': 'usuario/misalojamientos.html',

            'reservas': 'usuario/construccion.html', 'bookings': 'usuario/construccion.html',
            'mis reservas': 'usuario/construccion.html',

            'perfil': 'usuario/perfil.html', 'profile': 'usuario/perfil.html'
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