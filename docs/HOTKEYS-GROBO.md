# Atajos de teclado GROBO

Referencia para **trabajar casi solo con teclado**. La lista **oficial y traducida** está en la aplicación: icono de **teclado** en la barra de menú, o tecla **`?`** (fuera de campos de texto).

## Búsqueda y cierre

| Atajo | Acción |
|--------|--------|
| **Ctrl+G** / **⌘+G** | Abrir o cerrar Gecko Search (búsqueda global) |
| **Ctrl+K** / **⌘+K** | Igual (estilo “paleta de comandos”) |
| **Alt+G** | Igual (alternativa) |
| **Ctrl+Shift+F** / **⌘+Shift+F** | Foco en el filtro principal de la tabla o listado visible |
| **Esc** | Cerrar buscador, modales o menús desplegables |
| **?** | Abrir tabla de atajos |

## Navegación rápida (panel / investigador)

| Atajo | Acción |
|--------|--------|
| **Alt+D** | Inicio (dashboard según rol) |
| **Alt+C** | Capacitación / manual |
| **Alt+M** | Mensajes |
| **Alt+N** | Formularios / centro de solicitudes (nuevo pedido) |
| **Alt+J** | Noticias (portal) |
| **Alt+S** | Soporte / ticket |
| **Alt+O** | Mi perfil |
| **Alt+R** | Mis reservas |
| **Alt+F** | Formularios (mismo destino que **Alt+N**) |
| **Alt+B** | Facturación índice (solo administración sede) |
| **Alt+H** | Ayuda de esta pantalla (tutorial o manual) |
| **Alt+P** | Mis protocolos |
| **Alt+A** | Mis alojamientos |
| **Alt+Q** | Mis pedidos |
| **Alt+Q** luego **S** (rápido) | Cerrar sesión |
| **C** (con modal o alerta abierta) | Confirmar / guardar (sin foco en un campo de texto) |

## Preferencias (barra)

| Atajo | Acción |
|--------|--------|
| **Alt+V** | Micrófono (Gecko Voice) |
| **Alt+T** | Tema claro / oscuro |
| **Alt+Z** | Tamaño de letra (ciclo) |
| **Alt+L** | Menú superior / lateral |
| **Alt+K** | Ayuda de atajos (igual que el botón teclado) |

## Administración de sede (roles GeckoDev / Superadmin / Admin)

Pulsar **Alt+X** y, **en menos de ~0,5 s**, la segunda tecla:

| Segunda tecla | Pantalla |
|---------------|----------|
| **P** | Protocolos |
| **A** | Alojamientos |
| **B** | Facturación (índice) |
| **D** | Departamentos (configuración); en esa pantalla abre «Nuevo departamento» |
| **F** | Facturación por departamento |
| **U** | Usuarios |
| **E** | Estadísticas |
| **I** | Insumos |
| **K** | Reactivos |
| **J** | Animales |
| **V** | Reservas (calendario) |
| **N** | Noticias (comunicación admin) |

## Notas

- En **Windows**, **Alt** a veces activa el menú del navegador; **Ctrl+G** / **Ctrl+K** suelen ser más fiables para el buscador.
- **Alt+N** (formularios) y **Alt+J** (noticias portal) sustituyen el uso anterior de **Alt+N** solo para noticias.
- Los textos de la tabla en la app siguen el idioma (**ES / EN / PT**) elegido con la bandera.
- Preferencia **desactivar atajos**: casilla al pie del modal (`grobo_hotkeys_disabled`).
- Código: `front/dist/js/utils/hotkeys.js`, chips `hotkeyChips.js`, modal en `front/dist/js/components/menujs/MenuEvents.js`.
