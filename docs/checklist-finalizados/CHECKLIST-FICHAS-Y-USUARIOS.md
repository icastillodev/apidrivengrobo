# Checklist – Fichas de usuario, PDFs y eliminación

Estado de las tareas trabajadas en esta etapa del proyecto.

---

## ✅ Completado

### Mis formularios (usuario)
- [x] Botón **Ver animales utilizados en protocolos** con modal y detalle por protocolo
- [x] Botón **Insumos pedidos** con modal (insumo, tipo/cantidad, cantidad pedida, institución)
- [x] Botón **Insumos experimentales pedidos** con modal (mismo formato + institución)
- [x] API: `GET /user/insumos-pedidos`, `GET /user/insumos-exp-pedidos`
- [x] API: `GET /user/protocols-used-in-forms` (ya existía)

### Gestor de usuarios (admin)
- [x] **Tres secciones** tras línea bajo “Datos de la persona”: animales en protocolos, insumos pedidos, insumos experimentales (cuadraditos con cantidades y títulos)
- [x] API para admin: `GET /users/protocols-used-in-forms?id=`, `GET /users/insumos-pedidos?id=`, `GET /users/insumos-exp-pedidos?id=`
- [x] **Eliminar usuario**: solo habilitado si es **investigador** (IdTipousrA = 3) y sin formularios, protocolos ni alojamientos
- [x] Modal “Eliminar usuario” con ID, usuario, nombre y apellido
- [x] Confirmación con **contraseña** del admin y eliminación real en BD (usuarioe + actividade)
- [x] Cerrar modal de la ficha antes de abrir SweetAlert para poder escribir la contraseña
- [x] CSS para SweetAlert por encima del modal y input clickeable

### PDF
- [x] **PDF Total**: generado desde HTML de impresión (no captura del modal), con todas las secciones
- [x] **Solo Ficha**: solo datos personales (usuario, apellido, nombre, correo, celular, departamento)
- [x] Cerrar modal y quitar backdrop antes de generar PDF para evitar hoja en blanco
- [x] Cache-bust en script de usuarios (`usuarios.js?v=3`)

### Tarifario
- [x] **Ver tarifario** en dashboard: carga dinámica de `html2pdf` si no está definido
- [x] Comentario en código: tarifario en red depende de la institución al elegir el formulario; luego todo con la institución actual

---

## 🔲 Posibles siguientes pasos (sugeridos)

- [ ] **PDF ficha/total**: si en algún navegador sigue saliendo en blanco, valorar generación de PDF en servidor (PHP + librería tipo TCPDF/Dompdf) en lugar de html2pdf en el cliente
- [ ] **Insumos pedidos / experimentales**: columna opcional “Total acumulado hasta hoy” por insumo (suma de cantidades pedidas)
- [ ] **Auditoría**: revisar que al eliminar usuario se registre bien en bitácora (log de eliminación con contraseña confirmada)
- [ ] **Personae**: si el esquema tiene FK de `personae` a `usuarioe`, decidir si al eliminar usuario se borra/anonymiza también `personae` o se deja para historial

---

## Archivos principales tocados

| Área            | Archivos |
|-----------------|----------|
| API             | `api/src/Models/UserForms/UserFormsModel.php`, `api/src/Controllers/UserFormsController.php`, `api/src/Controllers/UserController.php`, `api/src/Models/User/UserModel.php`, `api/routes.php` |
| Mis formularios | `front/dist/js/pages/usuario/misformularios.js`, `front/paginas/usuario/misformularios.html` |
| Admin usuarios  | `front/dist/js/pages/admin/usuarios.js`, `front/paginas/admin/usuarios.html` |
| Tarifario       | `front/dist/js/services/PreciosService.js` |

Si quieres, podemos bajar alguno de los “siguientes pasos” a tareas concretas (por ejemplo solo “PDF en servidor” o solo “total acumulado por insumo”) y seguir por ahí.
