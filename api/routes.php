<?php
// api/routes.php

// SECCIÓN: Autenticación
$router->get('/validate-inst/:slug', 'AuthController@validateInstitution');
$router->post('/login', 'AuthController@login');
$router->post('/login-superadmin', 'AuthController@loginSuperAdmin');

// REGISTRO
// api/routes.php
$router->post('/register', 'UserController@register');
$router->post('/confirm-account', 'UserController@confirmAccount');
$router->get('/check-username', 'UserController@checkUsername');
$router->get('/maintenance', 'UserController@maintenance');

$router->get('/superadmin/global-stats', 'InstitucionController@getGlobalStats');
// api/routes.php

// Ruta para solicitar el enlace de recuperación (la que te dio el 404)
$router->post('/forgot-password', 'UserController@forgotPassword');

// Ruta para guardar la nueva contraseña (la que usará resetear.html)
$router->post('/update-password-recovery', 'UserController@updatePasswordRecovery');

// SECCIÓN: Menú Dinámico
$router->get('/menu', 'MenuController@getMenu');
// Cambiamos AnimalController por NotificationController para traer los 4 conteos
$router->get('/menu/notifications', 'NotificationController@getMenuNotifications');

// SECCIÓN: Usuarios (Admin)
$router->get('/users/institution', 'UserController@index'); 
$router->get('/users/protocols', 'UserController@getProtocols'); 
$router->get('/users/forms', 'UserController@getForms');       
$router->post('/users/update', 'UserController@update');      
$router->post('/users/reset-pass', 'UserController@resetPassword'); 

// SECCIÓN: Protocolos (Admin)
$router->get('/protocols/institution', 'ProtocolController@getByInstitution');
$router->get('/protocols/form-data', 'ProtocolController@getFormData'); 
$router->post('/protocols/save', 'ProtocolController@save');           
$router->get('/protocols/current-species', 'ProtocolController@getSpeciesByProtocol');

// SECCIÓN: Animales (Registro de Animales)
$router->get('/animals/all', 'AnimalController@getAll'); 
$router->get('/animals/form-data', 'AnimalController@getFormData'); 
$router->get('/animals/last-notification', 'AnimalController@getLastNotification'); 
$router->post('/animals/update-status', 'AnimalController@updateStatus'); 
$router->post('/animals/save-notification', 'AnimalController@saveNotification');
$router->post('/animals/update-full', 'AnimalController@updateFull'); 
$router->get('/animals/protocol-species', 'AnimalController@getSpeciesByProtocol'); 
$router->get('/animals/get-sex-data', 'AnimalController@getSexData'); 

// ============================================================
// SECCIÓN: Reactivos (Otros reactivos biológicos) 
// ============================================================
// Carga la grilla principal
$router->get('/reactivos/all', 'ReactivoController@getAll'); 

// Carga protocolos e insumos para los selectores del modal
$router->get('/reactivos/form-data', 'ReactivoController@getFormData'); 

// Actualización rápida de estado y auditoría administrativa
$router->post('/reactivos/update-status', 'ReactivoController@updateStatus'); 

// Modificación técnica completa (Insumo, Cantidad, Fechas)
$router->post('/reactivos/update-full', 'ReactivoController@updateFull'); 

// Gestión de notificaciones por correo específicas para reactivos
$router->get('/reactivos/last-notification', 'ReactivoController@getLastNotification'); 
$router->post('/reactivos/send-notification', 'ReactivoController@sendNotification');
$router->get('/reactivos/usage', 'ReactivoController@getUsageData');


// ============================================================
// SECCIÓN: Insumos Experimentales (GROBO 2026)
// ============================================================
$router->get('/insumos/all', 'InsumoController@getAll');
// NUEVA: Carga de departamentos (departamentoe) para el modal
$router->get('/insumos/form-data', 'InsumoController@getFormData');
// NUEVA: Carga de productos desde la entidad 'insumo'
$router->get('/insumos/catalog', 'InsumoController@getCatalog');
// NUEVA: Detalle de items vinculados al formulario (forminsumo)
$router->get('/insumos/details', 'InsumoController@getDetails');

$router->post('/insumos/update-status', 'InsumoController@updateStatus');
$router->post('/insumos/update-full', 'InsumoController@updateFull');
// Gestión de notificaciones para Insumos
$router->post('/insumos/send-notification', 'InsumoController@sendNotification');


// Rutas para el Tarifario Institucional
$router->get('/precios/animales', 'PreciosController@getAnimalPrices');
$router->get('/precios/insumos', 'PreciosController@getInsumoPrices');
// Rutas para el Tarifario Institucional
$router->get('/precios/all-data', 'PreciosController@getAllData'); 
$router->post('/precios/update-all', 'PreciosController@updateAll');



// RUTAS PARA ALOJAMIENTOS
$router->get('/alojamiento/list', 'AlojamientoController@list');
$router->get('/alojamiento/history', 'AlojamientoController@history');
$router->post('/alojamiento/save', 'AlojamientoController@save');
$router->post('/alojamiento/finalizar', 'AlojamientoController@finalizar');
$router->post('/alojamiento/delete-row', 'AlojamientoController@deleteRow');
$router->post('/alojamiento/update-row', 'AlojamientoController@updateRow');
$router->post('/alojamiento/desfinalizar', 'AlojamientoController@desfinalizar');
// SECCIÓN: Alojamientos
$router->post('/alojamiento/update-config', 'AlojamientoController@updateConfig');

// api/routes.php

// Cambia 'ProtocoloController' por 'ProtocolController'
$router->get('/protocolos/search-alojamiento', 'ProtocolController@searchForAlojamiento');
$router->get('/protocolos/search', 'ProtocolController@search');

// Auxiliares para búsqueda
$router->get('/protocolos/search', 'ProtocoloController@search');
$router->get('/investigadores/search', 'InvestigadorController@search');


// ============================================================
// SECCIÓN: Facturación y Cobranzas (GROBO 2026)
// ============================================================

// Reportes y Procesamiento
$router->post('/billing/depto-report', 'BillingController@getDeptoReport');
$router->get('/billing/investigador-report', 'BillingController@getInvestigadorReport');

// Gestión de Ítems Individuales (Calculadora shared)
$router->get('/billing/get-item', 'BillingController@getItem');
$router->post('/billing/update-item', 'BillingController@updateItem');

// Gestión de Saldos e Integridad Financiera
$router->post('/billing/ajustar-saldo', 'BillingController@ajustarSaldo');
$router->post('/billing/pagar-items-saldo', 'BillingController@pagarConSaldo');

// Auxiliares para Selectores de Facturación
// (Asegúrate de tener estos métodos en DeptoController y UserController)
$router->get('/deptos/list', 'DeptoController@list');
$router->get('/users/list-investigators', 'UserController@listInvestigators');


$router->get('/deptos/list', 'DeptoController@list');

$router->post('/billing/balance', 'BillingController@updateBalance');

$router->post('/billing/process-payment', 'BillingController@processPayment');


/**
 * NUEVAS RUTAS PARA MODALES DE EDICIÓN FINA (GROBO 2026)
 */

// Endpoints para obtener el detalle (Carga el modal)
$router->get('/billing/detail-animal/:id', 'BillingController@getAnimalDetail');
$router->get('/billing/detail-reactive/:id', 'BillingController@getReactiveDetail');
$router->get('/billing/detail-insumo/:id', 'BillingController@getInsumoDetail');
$router->get('/billing/detail-alojamiento/:id', 'BillingController@getAlojamientoDetail');

// Endpoints para actualizar (Guarda cambios del modal)
$router->post('/billing/update-animal', 'BillingController@updateAnimal');
$router->post('/billing/update-reactive', 'BillingController@updateReactive');
$router->post('/billing/update-insumo', 'BillingController@updateInsumo');
$router->post('/billing/update-alojamiento', 'BillingController@updateAlojamiento');

// Generación de Fichas PDF individuales
$router->get('/billing/generate-pdf-ficha', 'BillingController@generatePdfFicha');
// En la sección de Facturación y Cobranzas
$router->post('/billing/ajustar-pago-individual', 'BillingController@ajustarPagoIndividual');

// Cambia {id} por :id para mantener la consistencia del router
$router->get('/billing/get-investigator-balance/:id', 'BillingController@getInvestigatorBalance');
/**
 * Ruta para procesar pagos/devoluciones de alojamiento
 */
$router->post('/billing/ajustar-pago-aloj', 'BillingController@ajustarPagoAloj');
$router->get('/billing/detail-insumo/:id', 'BillingController@getInsumoDetail');

// NUEVA Ruta para Insumos y Reactivos
$router->post('/billing/ajustar-pago-insumo', 'BillingController@ajustarPagoInsumo');




// ============================================================
// SECCIÓN: Facturación por Investigador (Gecko Devs 2026)
// ============================================================

/** * 1. Selector de Investigadores:
 * Trae solo usuarios que son responsables de pago (con deudas o protocolos)
 */
$router->get('/users/list-investigators', 'UserController@listInvestigators');

/**
 * 2. Reporte Consolidado:
 * Procesa toda la deuda de un investigador agrupada por sus protocolos
 */
$router->post('/billing/investigador-report', 'BillingController@getInvestigadorReport');

/**
 * 3. Gestión de Saldo Directo:
 * Permite al administrador cargar o quitar dinero de la billetera del investigador
 */
$router->post('/billing/balance', 'BillingController@updateBalance');

/**
 * 4. Pagos Masivos de Protocolo:
 * Ejecuta la transacción de pagar múltiples ítems seleccionados
 */
$router->post('/billing/process-payment', 'BillingController@processPayment');

/**
 * 5. Detalle de Saldo Individual (Para modales):
 */
$router->get('/billing/get-investigator-balance/:id', 'BillingController@getInvestigatorBalance');



$router->get('/billing/list-active-protocols', 'BillingController@listActiveProtocols');
$router->post('/billing/protocol-report', 'BillingController@getProtocolReport');


// --- RUTAS DE GESTIÓN DE INSTITUCIONES ---
$router->get('/superadmin/instituciones', 'InstitucionController@list');
$router->post('/superadmin/instituciones/create', 'InstitucionController@create');
$router->post('/superadmin/instituciones/update', 'InstitucionController@update');

// --- RUTAS DE SUPERADMIN: USUARIOS ---

// 1. Obtener la lista de todos los usuarios de todas las sedes
$router->get('/superadmin/usuarios', 'UsuarioController@list');

// 2. Crear un nuevo usuario (Contraseña genérica: 12345678)
$router->post('/superadmin/usuarios/create', 'UsuarioController@create');

// 3. Actualizar datos, rol o institución de un usuario existente
$router->post('/superadmin/usuarios/update', 'UsuarioController@update');

// 4. Resetear contraseña a 12345678 (Ruta que faltaba para el botón amarillo)
$router->post('/superadmin/usuarios/reset-pass', 'UsuarioController@resetPass');

$router->get('/superadmin/usuarios/check-username', 'UsuarioController@checkUsername');


// SECCIÓN: Selector de Formularios (Lógica Multi-Dependencia)
$router->get('/forms/selector', 'FormSelectorController@getSelectorData');



// Búsqueda y selección
$router->get('/animals/search-protocols', 'AnimalController@searchProtocols');
$router->get('/animals/protocol-details', 'AnimalController@getProtocolDetails');
// Guardado
$router->post('/animals/create-order', 'AnimalController@createOrder');