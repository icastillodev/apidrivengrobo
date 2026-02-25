export function getMenuTemplates() {
    if (!window.txt) return {};

    return {
        1: { label: window.txt.menu.users, svg: `<svg viewBox="0 0 640 512"><path d="M320 16a104 104 0 1 1 0 208a104 104 0 1 1 0-208M96 88a72 72 0 1 1 0 144a72 72 0 1 1 0-144M0 416c0-70.7 57.3-128 128-128c12.8 0 25.2 1.9 36.9 5.4C132 330.2 112 378.8 112 432v16c0 11.4 2.4 22.2 6.7 32H32c-17.7 0-32-14.3-32-32zm521.3 64c4.3-9.8 6.7-20.6 6.7-32v-16c0-53.2-20-101.8-52.9-138.6c11.7-3.5 24.1-5.4 36.9-5.4c70.7 0 128 57.3 128 128v32c0 17.7-14.3 32-32 32zM472 160a72 72 0 1 1 144 0a72 72 0 1 1-144 0M160 432c0-88.4 71.6-160 160-160s160 71.6 160 160v16c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32z"/></svg>`, path: 'admin/usuarios' },
        2: { label: window.txt.menu.protocols, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'admin/protocolos' },
        3: { label: window.txt.menu.animals, svg: `<svg viewBox="0 0 32 32"><path d="M17.67 6.32c0-2.39-1.94-4.33-4.33-4.33A4.34 4.34 0 0 0 9 6.32c0 .17.01.33.03.49h-.001a3.855 3.855 0 0 1-.027-.362A4.008 4.008 0 0 0 9 6.562v.26L5.978 8.949L2.91 11.1c-.57.4-.91 1.05-.91 1.75c0 1.18.96 2.14 2.14 2.14h3.832a9.065 9.065 0 0 0 1.778 2.87l-1.21 4.73c-.05.2.1.4.3.4H11c.42 0 .73-.2.87-.74l.61-2.35c1.2.58 2.53 1.1 3.93 1.1h.63c-.6 0-1.08.449-1.08 1.01c0 .561.48 1.01 1.08 1.01h5.241c-1.281 0-2.172-1.301-2.578-2.02h.035l.013.023a4.52 4.52 0 0 1 4.043-6.543a.5.5 0 1 1 0 1a3.52 3.52 0 0 0 0 7.04h3.1c.2 0 .394-.022.581-.064a3.369 3.369 0 0 1-2.845 1.564l-5.64-.01a2.99 2.99 0 0 0-.01 5.98L23 30c.55 0 1-.44 1.01-1c0-.55-.45-1-1-1l-4.02-.01c-.55 0-.99-.44-.99-.99s.44-.99.99-.99l5.64.01c2.96 0 5.37-2.41 5.37-5.37v-6.181a.993.993 0 0 0-.054-.323c-.558-5.22-5.371-9.083-10.626-7.946l-1.66.427a5.19 5.19 0 0 0 .01-.307Zm-1.924.188a2.482 2.482 0 1 1-4.965 0a2.482 2.482 0 0 1 4.965 0ZM7.426 12.5a1.105 1.105 0 1 1 0-2.21a1.105 1.105 0 0 1 0 2.21Zm-4.216-.73c.46.13.79.54.79 1.04c0 .51-.35.93-.82 1.05c-.17-.3-.26-.65-.26-1.02c0-.38.1-.75.29-1.07Z"/></svg>`, path: 'admin/animales' },
        4: { label: window.txt.menu.reagents, svg: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-1 11h-5v5h-2v-5H6v-2h5V7h2v5h5v2z"/></svg>`, path: 'admin/reactivos' },
        5: { label: window.txt.menu.supplies, svg: `<svg viewBox="0 0 20 20"><path d="M10.428 2.212a.645.645 0 0 0-.857 0a5.716 5.716 0 0 0-1.926 4.35a.5.5 0 0 0 .246.425A7.407 7.407 0 0 1 9.628 8.41a.5.5 0 0 0 .743 0a7.408 7.408 0 0 1 1.737-1.421a.5.5 0 0 0 .245-.425a5.716 5.716 0 0 0-1.925-4.351Zm-7.412 9.996a.663.663 0 0 1 .606-.72A6.364 6.364 0 0 1 10 15.326a6.364 6.364 0 0 1 6.377-3.838c.366.03.64.352.606.72A6.368 6.368 0 0 1 10.64 18h-.465a.665.665 0 0 1-.176-.024a.665.665 0 0 1-.177.024h-.465a6.368 6.368 0 0 1-6.342-5.792ZM10 10.826a6.364 6.364 0 0 0-6.378-3.838a.663.663 0 0 0-.606.72a6.35 6.35 0 0 0 .765 2.5a.5.5 0 0 0 .434.258a7.357 7.357 0 0 1 5.368 2.394a.5.5 0 0 0 .417.16a.5.5 0 0 0 .416-.16a7.357 7.357 0 0 1 5.368-2.394a.5.5 0 0 0 .434-.259a6.35 6.35 0 0 0 .765-2.499a.663.663 0 0 0-.606-.72A6.364 6.364 0 0 0 10 10.826Z"/></svg>`, path: 'admin/insumos' },
        6: { label: window.txt.menu.reservations, svg: `<svg viewBox="0 0 26 26"><path d="M7 0c-.551 0-1 .449-1 1v3c0 .551.449 1 1 1c.551 0 1-.449 1-1V1c0-.551-.449-1-1-1zm12 0c-.551 0-1 .449-1 1v3c0 .551.449 1 1 1c.551 0 1-.449 1-1V1c0-.551-.449-1-1-1zM3 2C1.344 2 0 3.344 0 5v18c0 1.656 1.344 3 3 3h20c1.656 0 3-1.344 3-3V5c0-1.656-1.344-3-3-3h-2v2a2 2 0 0 1-4 0V2H9v2a2 2 0 0 1-4 0V2H3zM2 9h22v14c0 .551-.449 1-1 1H3c-.551 0-1-.449-1-1V9zm7 3v2.313h4.813l-3.782 7.656H13.5l3.469-8.438V12H9z"/></svg>`, path: 'construccion' },
        7: { label: window.txt.menu.accommodations, svg: `<svg viewBox="0 0 576 512"><path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1v16.2c0 22.1-17.9 40-40 40h-16c-1.1 0-2.2 0-3.3-.1c-1.4.1-2.8.1-4.2.1L416 512h-24c-22.1 0-40-17.9-40-40v-88c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v88c0 22.1-17.9 40-40 40h-55.9c-1.5 0-3-.1-4.5-.2c-1.2.1-2.4.2-3.6.2h-16c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9.1-2.8v-69.7h-32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7l255.4 224.5c8 7 12 15 11 24"/></svg>`, path: 'admin/alojamientos' },
        8: { label: window.txt.menu.stats, svg: `<svg viewBox="0 0 24 24"><path d="M20 13.75a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v6.75H14V4.25c0-.728-.002-1.2-.048-1.546c-.044-.325-.115-.427-.172-.484c-.057-.057-.159-.128-.484-.172C12.949 2.002 12.478 2 11.75 2c-.728 0-1.2.002-1.546.048c-.325.044-.427.115-.484.172c-.057.057-.128.159-.172.484c-.046.347-.048.818-.048 1.546V20.5H8V8.75A.75.75 0 0 0 7.25 8h-3a.75.75 0 0 0-.75.75V20.5H1.75a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5H20v-6.75Z"/></svg>`, path: 'admin/estadisticas' },
        9: { label: window.txt.menu.admin_config, svg: `<svg viewBox="0 0 24 24"><path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5m7 2c0-1.1.9-2 2-2V9.5c-1.1 0-2-.9-2-2s.9-2 2-2V4c0-1.1-.9-2-2-2h-3c0 1.1-.9 2-2 2s-2-.9-2-2H4c-1.1 0-2 .9-2 2v1.5c1.1 0 2 .9 2 2s-.9 2-2 2V15c1.1 0 2 .9 2 2s-.9 2-2 2V20c0 1.1.9 2 2 2h3c0-1.1-.9-2 2-2s2 .9 2 2h3c1.1 0 2-.9 2-2v-2.5z"/></svg>`, path: 'admin/configuracion/config' },
        10: { label: window.txt.menu.forms, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'usuario/formularios.html' },
        11: { label: window.txt.menu.my_forms, svg: `<svg viewBox="0 0 24 24"><path d="M13 1.07l1 1 .03.02L18.41 7.5c.39.39.39 1.02 0 1.41L13 14.34l-1-1L17 8.5 13 4.5V2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM8 4h3v1h-3V4z"/></svg>`, path: 'usuario/misformularios' },
        12: { label: window.txt.menu.my_accommodations, svg: `<svg viewBox="0 0 576 512"><path d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l40 .06a16 16 0 0 0 16-16V344a16 16 0 0 1 16-16h88a16 16 0 0 1 16 16v120a16 16 0 0 0 16 16l40 .06a16 16 0 0 0 16-16V300.11zM571 225.47L488 153.47V48a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v51.33L313.43 14.3a16 16 0 0 0-20.48 0L4.38 225.47a16 16 0 0 0 2.06 22.44l15.11 12.65a16 16 0 0 0 22.59-2.22L288 64.82l243.86 203.52a16 16 0 0 0 22.59 2.22l15.11-12.65a16 16 0 0 0 1.44-22.44z"/></svg>`, path: 'usuario/misalojamientos' },
        13: { label: window.txt.menu.my_history, svg: `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`, path: 'construccion' },
        14: { label: window.txt.menu.my_reservations, svg: `<svg viewBox="0 0 26 26"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`, path: 'usuario/construccion' },
        15: { label: window.txt.menu.my_protocols, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'admin/protocolos' },
        203: { label: window.txt.menu.my_protocols, svg: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>`,path: 'usuario/misprotocolos' },
        
        55: { 
            label: window.txt.menu.investigator_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12.75 15.5h5.25v8h-5.25zM15 18h3m0 2h-3m-3.5-4.25h-8v8h5.25zM16 5.75V3.5m2-3.5H6a3 3 0 0 0-3 3v11.25h8v-7.5h-6v-3h12v3.25h-6v7.5h8V3a3 3 0 0 0-3-3z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.my_forms, path: 'usuario/misformularios' },
                { label: window.txt.menu.my_accommodations, path: 'usuario/misalojamientos' },
                { label: window.txt.menu.my_reservations, path: 'construccion' },
                { label: window.txt.menu.my_protocols, path: 'usuario/misprotocolos' }
            ]
        },

        202: { 
            label: window.txt.menu.accounting_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12.75 15.5h5.25v8h-5.25zM15 18h3m0 2h-3m-3.5-4.25h-8v8h5.25zM16 5.75V3.5m2-3.5H6a3 3 0 0 0-3 3v11.25h8v-7.5h-6v-3h12v3.25h-6v7.5h8V3a3 3 0 0 0-3-3z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.prices, path: 'admin/precios' },
                { label: window.txt.menu.billing, path: 'admin/facturacion/index' },
                { label: window.txt.menu.historialpagos, path: 'admin/historialcontable' }
            ]
        },

            998: { 
            label: window.txt.menu.help_group, 
            svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
            isDropdown: true,
            children: [
                { label: 'Capacitación', path: 'construccion' },
                { label: 'Ticket/Contacto', path: 'construccion' },
                { label: 'Preguntas frecuentes', path: 'construccion' },
                { label: 'Ventas', path: 'construccion' }
            ]
        },
        999: { 
            label: window.txt.menu.profile_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.config, path: 'usuario/perfil' },
                { label: window.txt.menu.logout, path: 'logout' }
            ]
        }
    };
}