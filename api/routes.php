<?php
// api/routes.php

// ============================================================
// SECCIÓN: Autenticación y Registro
// ============================================================
$router->get('/validate-inst/:slug', 'AuthController@validateInstitution');
$router->post('/login', 'AuthController@login');
$router->post('/login-superadmin', 'AuthController@loginSuperAdmin');

$router->post('/register', 'UserController@register');
$router->post('/confirm-account', 'UserController@confirmAccount');
$router->get('/check-username', 'UserController@checkUsername');
$router->get('/maintenance', 'UserController@maintenance');

// api/routes.php
$router->post('/verify-2fa', 'AuthController@verify2FA');

// Recuperación de Contraseña
$router->post('/forgot-password', 'UserController@forgotPassword');
$router->post('/update-password-recovery', 'UserController@updatePasswordRecovery');


// ============================================================
// SECCIÓN: Menú y Notificaciones , busqueda global
// ============================================================
$router->get('/menu', 'MenuController@getMenu');
$router->get('/menu/notifications', 'NotificationController@getMenuNotifications');


// Búsqueda tradicional (SQL Rápido)
$router->get('/search/global', 'GlobalSearchController@search');

// Procesamiento de lenguaje natural con Gemini
$router->post('/ia/procesar', 'AiController@processCommand');




// ============================================================
// SECCIÓN: Gestión de Usuarios (Admin Sede)
// ============================================================
$router->get('/users/institution', 'UserController@index'); 
$router->get('/users/protocols', 'UserController@getProtocols'); 
$router->get('/users/forms', 'UserController@getForms');       
$router->post('/users/update', 'UserController@update');      
$router->post('/users/reset-pass', 'UserController@resetPassword'); 
$router->get('/users/list-investigators', 'UserController@listInvestigators'); // Selector de investigadores

$router->post('/user/config/update', 'UserConfigController@updatePreferences');

// ============================================================
// SECCIÓN: Mis Formularios (Visor Unificado Investigador)
// ============================================================
$router->get('/user/my-forms', 'UserFormsController@getMyForms');
$router->get('/user/form-detail/:id', 'UserFormsController@getFormDetail');

// ============================================================
// SECCIÓN: Mis Protocolos (Visor Unificado)
// ============================================================
// USUARIO: GESTIÓN DE PROTOCOLOS
$router->get('/user/protocols/config', 'ControllerusuarioTodosProtocolos@getConfig');
$router->get('/user/protocols/all-lists', 'ControllerusuarioTodosProtocolos@getAllLists');
$router->post('/user/protocols/create-internal', 'ControllerusuarioTodosProtocolos@createInternal');
$router->get('/user/protocols/network-targets', 'ControllerusuarioTodosProtocolos@getNetworkTargets');
$router->post('/user/protocols/create-network-request', 'ControllerusuarioTodosProtocolos@createNetworkRequest');


// ============================================================
// SECCIÓN: Perfil de Usuario (Mi Cuenta)
// ============================================================
$router->get('/user/profile', 'UserProfileController@getProfile');
$router->post('/user/profile/update', 'UserProfileController@updateProfile');
$router->post('/user/profile/change-password', 'UserProfileController@changePassword');

// ============================================================
// SECCIÓN: Mis Alojamientos (Visor Usuario)
// ============================================================
$router->get('/user/my-housings', 'UserHousingController@getAll');
$router->get('/user/housing-detail/:id', 'UserHousingController@getDetail');

// ...
// ============================================================
// SECCIÓN: Protocolos
// ============================================================
$router->get('/protocols/institution', 'ProtocolController@getByInstitution');
$router->get('/protocols/form-data', 'ProtocolController@getFormData'); 
$router->post('/protocols/save', 'ProtocolController@save');           
$router->get('/protocols/current-species', 'ProtocolController@getSpeciesByProtocol');
$router->get('/protocolos/search-alojamiento', 'ProtocolController@searchForAlojamiento');
$router->get('/protocolos/search', 'ProtocolController@search');
$router->get('/protocols/requests/count', 'ProtocolController@getPendingCount');
$router->get('/user/protocols/species-detail', 'ControllerusuarioTodosProtocolos@getSpeciesDetail');
$router->post('/user/protocols/update-internal', 'ControllerusuarioTodosProtocolos@updateInternal');

// ============================================================
// SECCIÓN: Admin - Solicitudes de Protocolos (Aprobación/Rechazo)
// ============================================================
$router->get('/admin/requests/list', 'ControllerAdminSolicitudes@getList');
$router->post('/admin/requests/process', 'ControllerAdminSolicitudes@process');

// ============================================================
// SECCIÓN: Animales (Pedidos)
// ============================================================
$router->get('/animals/all', 'AnimalController@getAll'); 
$router->get('/animals/form-data', 'AnimalController@getFormData'); 
$router->get('/animals/last-notification', 'AnimalController@getLastNotification'); 
$router->post('/animals/update-status', 'AnimalController@updateStatus'); 
$router->post('/animals/save-notification', 'AnimalController@saveNotification');
$router->post('/animals/update-full', 'AnimalController@updateFull'); 
$router->get('/animals/protocol-species', 'AnimalController@getSpeciesByProtocol'); 
$router->get('/animals/get-sex-data', 'AnimalController@getSexData'); 


// --- AGREGAR ESTA LÍNEA QUE FALTABA ---
$router->post('/animals/send-notification', 'AnimalController@sendNotification');


// Búsqueda y Creación de Pedidos (Investigador)
$router->get('/animals/pdf-data', 'AnimalController@getPDFData'); // Nuevo para el Tarifario
$router->get('/animals/search-protocols', 'AnimalController@searchProtocols');
$router->get('/animals/protocol-details', 'AnimalController@getProtocolDetails');
$router->post('/animals/create-order', 'AnimalController@createOrder');


// ============================================================
// SECCIÓN: Reactivos (Otros reactivos biológicos) 
// ============================================================
$router->get('/reactivos/all', 'ReactivoController@getAll'); 
$router->get('/reactivos/form-data', 'ReactivoController@getFormData'); 
$router->post('/reactivos/update-status', 'ReactivoController@updateStatus'); 
$router->post('/reactivos/update-full', 'ReactivoController@updateFull'); 
$router->get('/reactivos/last-notification', 'ReactivoController@getLastNotification'); 
$router->post('/reactivos/send-notification', 'ReactivoController@sendNotification');
$router->get('/reactivos/usage', 'ReactivoController@getUsageData');

$router->get('/reactivos/init', 'ReactivosController@getInitData');
$router->get('/reactivos/protocol-info', 'ReactivosController@getProtocolInfo');
$router->post('/reactivos/create', 'ReactivosController@createOrder');
$router->get('/reactivos/pdf-data', 'ReactivosController@getPDFData');


// ============================================================
// SECCIÓN: Insumos Experimentales
// ============================================================
$router->get('/insumos/all', 'InsumoController@getAll');
$router->get('/insumos/form-data', 'InsumoController@getFormData');
$router->get('/insumos/catalog', 'InsumoController@getCatalog');
$router->get('/insumos/details', 'InsumoController@getDetails');
$router->post('/insumos/update-status', 'InsumoController@updateStatus');
$router->post('/insumos/update-full', 'InsumoController@updateFull');
$router->post('/insumos/send-notification', 'InsumoController@sendNotification');

// Pedidos de Insumos por Departamento
$router->get('/insumos-form/init', 'InsumoFormularioController@getInitData');
$router->post('/insumos-form/save', 'InsumoFormularioController@createOrder');

// ============================================================
// SECCIÓN: Tarifario Institucional (PRECIOS)
// ============================================================
// Trae toda la data: Institución, Especies, Subespecies e Insumos
$router->get('/precios/all-data', 'PreciosController@getAllData'); 
// Actualiza precios, nombres de insumos, jornada y título del tarifario
$router->post('/precios/update-all', 'PreciosController@updateAll');


// ============================================================
// SECCIÓN: Alojamientos
// ============================================================
$router->get('/alojamiento/list', 'AlojamientoController@list');
$router->get('/alojamiento/history', 'AlojamientoController@history');
$router->post('/alojamiento/save', 'AlojamientoController@save');
$router->post('/alojamiento/finalizar', 'AlojamientoController@finalizar');
$router->post('/alojamiento/delete-row', 'AlojamientoController@deleteRow');
$router->post('/alojamiento/update-row', 'AlojamientoController@updateRow');
$router->post('/alojamiento/desfinalizar', 'AlojamientoController@desfinalizar');
$router->post('/alojamiento/update-config', 'AlojamientoController@updateConfig');

// ============================================================
// SECCIÓN: Trazabilidad Biológica (Alojamiento)
// ============================================================
$router->get('/trazabilidad/get-arbol', 'TrazabilidadController@getArbol');
$router->post('/trazabilidad/save-observation', 'TrazabilidadController@saveObservation');
$router->post('/trazabilidad/add-caja', 'TrazabilidadController@addCaja');

$router->post('/trazabilidad/add-subject', 'TrazabilidadController@addSubject');
$router->post('/trazabilidad/rename-subject', 'TrazabilidadController@renameSubject');

// ============================================================
// SECCIÓN: Protocolos (Para el Registro de Alojamiento)
// ============================================================
$router->get('/protocoloexpe/list', 'ProtocolController@getByInstitution'); // O el nombre que tenga tu controlador de protocolos

// ============================================================
// SECCIÓN: Trazabilidad Biológica (Nuevas acciones CRUD)
// ============================================================
$router->post('/trazabilidad/rename-box', 'TrazabilidadController@renameBox');
$router->post('/trazabilidad/delete-box', 'TrazabilidadController@deleteBox');
$router->post('/trazabilidad/delete-subject', 'TrazabilidadController@deleteSubject');

$router->post('/trazabilidad/add-subject', 'TrazabilidadController@addSubject');
$router->get('/trazabilidad/get-past-boxes', 'TrazabilidadController@getPastBoxes');
$router->post('/trazabilidad/clone-past-boxes', 'TrazabilidadController@clonePastBoxes');
$router->post('/alojamiento/update-price', 'AlojamientoController@updatePrice');

$router->get('/alojamiento/export', 'AlojamientoExportController@export');

// ============================================================
// SECCIÓN: Facturación y Cobranzas (Billing)
// ============================================================

// Reportes
$router->post('/billing/depto-report', 'BillingController@getDeptoReport');
$router->post('/billing/investigador-report', 'BillingController@getInvestigadorReport');
$router->post('/billing/protocol-report', 'BillingController@getProtocolReport');

// Gestión de Saldos
$router->get('/billing/get-investigator-balance/:id', 'BillingController@getInvestigatorBalance');
$router->post('/billing/balance', 'BillingController@updateBalance'); // Carga manual de saldo
$router->post('/billing/ajustar-saldo', 'BillingController@ajustarSaldo'); // Ajuste técnico

// Procesamiento de Pagos
$router->post('/billing/process-payment', 'BillingController@processPayment'); // Pago masivo
$router->post('/billing/pagar-items-saldo', 'BillingController@pagarConSaldo'); // Pagar ítems específicos

// Modales de Edición Fina (Billing Dashboard)
$router->get('/billing/get-item', 'BillingController@getItem'); // Calculadora
$router->post('/billing/update-item', 'BillingController@updateItem'); // Calculadora

// Detalles para Modales
$router->get('/billing/detail-animal/:id', 'BillingController@getAnimalDetail');
$router->get('/billing/detail-reactive/:id', 'BillingController@getReactiveDetail');
$router->get('/billing/detail-insumo/:id', 'BillingController@getInsumoDetail');
$router->get('/billing/detail-alojamiento/:id', 'BillingController@getAlojamientoDetail');

// Actualización desde Modales de Facturación
$router->post('/billing/update-animal', 'BillingController@updateAnimal');
$router->post('/billing/update-reactive', 'BillingController@updateReactive');
$router->post('/billing/update-insumo', 'BillingController@updateInsumo');
$router->post('/billing/update-alojamiento', 'BillingController@updateAlojamiento');

// Ajustes de Pagos Individuales (Revertir/Pagar forzado)
$router->post('/billing/ajustar-pago-individual', 'BillingController@ajustarPagoIndividual');
$router->post('/billing/ajustar-pago-aloj', 'BillingController@ajustarPagoAloj');
$router->post('/billing/ajustar-pago-insumo', 'BillingController@ajustarPagoInsumo');

// Generación de PDF
$router->get('/billing/generate-pdf-ficha', 'BillingController@generatePdfFicha');

// Ruta para extraer el historial contable / financiero (Auditoría específica)
$router->get('/billing/audit-history', 'BillingController@getAuditHistory');

// ============================================================
// SECCIÓN: Auxiliares y Selectores
// ============================================================
$router->get('/deptos/list', 'DeptoController@list');
$router->get('/investigadores/search', 'InvestigadorController@search');
$router->get('/billing/list-active-protocols', 'BillingController@listActiveProtocols');
$router->get('/forms/selector', 'FormSelectorController@getSelectorData');


// ============================================================
// ADMIN: INSUMOS EXPERIMENTALES
// ============================================================
$router->get('/admin/config/insumos-exp/all', 'AdminConfigInsumoExpController@getAll');
$router->get('/admin/config/insumos-exp/species', 'AdminConfigInsumoExpController@getSpeciesList'); // Para llenar el select
$router->post('/admin/config/insumos-exp/save', 'AdminConfigInsumoExpController@save');
$router->post('/admin/config/insumos-exp/delete', 'AdminConfigInsumoExpController@delete');
$router->post('/admin/config/insumos-exp/toggle', 'AdminConfigInsumoExpController@toggle');

// ============================================================
// ADMIN: CONFIGURACIÓN INSUMOS
// ============================================================
$router->get('/admin/config/insumos/all', 'AdminConfigInsumoController@getAll');
$router->post('/admin/config/insumos/save', 'AdminConfigInsumoController@save');
$router->post('/admin/config/insumos/delete', 'AdminConfigInsumoController@delete');
$router->post('/admin/config/insumos/toggle', 'AdminConfigInsumoController@toggle');
$router->get('/admin/config/insumos/types', 'AdminConfigInsumoController@get_types');

// ============================================================
// ADMIN: CONFIGURACIÓN TIPOS DE FORMULARIO
// ============================================================
$router->get('/admin/config/form-types/all', 'AdminConfigFormTypesController@getAll');
$router->post('/admin/config/form-types/save', 'AdminConfigFormTypesController@save');
$router->post('/admin/config/form-types/delete', 'AdminConfigFormTypesController@delete');

// ============================================================
// ADMIN: CONFIGURACIÓN PROTOCOLOS (TIPOS Y SEVERIDADES)
// ============================================================
$router->get('/admin/config/protocols-conf/init', 'AdminConfigProtocoloController@init');

// Tipos de Protocolo
$router->post('/admin/config/protocols-conf/type/save', 'AdminConfigProtocoloController@saveType');
$router->post('/admin/config/protocols-conf/type/delete', 'AdminConfigProtocoloController@deleteType');

// Severidades
$router->post('/admin/config/protocols-conf/severity/save', 'AdminConfigProtocoloController@saveSeverity');
$router->post('/admin/config/protocols-conf/severity/delete', 'AdminConfigProtocoloController@deleteSeverity');


// ============================================================
// ADMIN: USUARIOS, ROLES Y MENÚS
// ============================================================
$router->get('/admin/config/roles/init', 'AdminConfigRolesController@init');
$router->post('/admin/config/roles/update-user-role', 'AdminConfigRolesController@updateUserRole');
$router->post('/admin/config/roles/toggle-menu', 'AdminConfigRolesController@toggleMenuAccess');

// ============================================================
// ADMIN: Especies y subespecies
// ============================================================
$router->get('/admin/config/especies/all', 'AdminConfigEspeciesController@getAll');
$router->post('/admin/config/especies/save', 'AdminConfigEspeciesController@saveEspecie');
$router->post('/admin/config/especies/delete', 'AdminConfigEspeciesController@deleteEspecie');
$router->post('/admin/config/subespecies/save', 'AdminConfigEspeciesController@saveSubespecie');
$router->post('/admin/config/subespecies/toggle', 'AdminConfigEspeciesController@toggleSubespecie');


// ============================================================
// ADMIN: CONFIGURACIÓN INSTITUCIÓN
// ============================================================
$router->get('/admin/config/institution', 'AdminConfigInstitutionController@get');
$router->post('/admin/config/institution/update', 'AdminConfigInstitutionController@update');

// --- AGREGAR ESTAS DOS LÍNEAS NUEVAS ---
$router->post('/admin/config/institution/service/add', 'AdminConfigInstitutionController@add_service');
$router->post('/admin/config/institution/service/delete', 'AdminConfigInstitutionController@delete_service');
$router->post('/admin/config/institution/service/toggle', 'AdminConfigInstitutionController@toggle_service');

// ============================================================
// ADMIN: CONFIGURACIÓN DEPARTAMENTOS Y ORGANISMOS
// ============================================================
$router->get('/admin/config/deptos-init', 'AdminConfigDeptoController@getAll');

// Organismos
$router->post('/admin/config/org/save', 'AdminConfigDeptoController@saveOrg');
$router->post('/admin/config/org/delete', 'AdminConfigDeptoController@deleteOrg');

// Departamentos
$router->post('/admin/config/depto/save', 'AdminConfigDeptoController@saveDepto');
$router->post('/admin/config/depto/delete', 'AdminConfigDeptoController@deleteDepto');


// ADMIN: ALOJAMIENTOS Y CLINICA
$router->get('/admin/config/alojamiento/details', 'AdminConfigAlojamientoController@getDetails');

// Tipos
$router->post('/admin/config/alojamiento/type/save', 'AdminConfigAlojamientoController@saveType');
$router->post('/admin/config/alojamiento/type/delete', 'AdminConfigAlojamientoController@deleteType');

// Categorias (Variables Clinicas)
$router->post('/admin/config/alojamiento/cat/save', 'AdminConfigAlojamientoController@saveCat');
$router->post('/admin/config/alojamiento/cat/delete', 'AdminConfigAlojamientoController@deleteCat');
$router->post('/admin/config/alojamiento/type/toggle', 'AdminConfigAlojamientoController@toggleType'); // Cambiado de delete a toggle
$router->post('/admin/config/alojamiento/cat/toggle', 'AdminConfigAlojamientoController@toggleCat');


// ADMIN: RESERVAS Y ESPACIOS
$router->get('/admin/config/reservas/sala/all', 'AdminConfigReservasController@getAllSalas');
$router->get('/admin/config/reservas/sala/detail', 'AdminConfigReservasController@getSalaDetail');
$router->post('/admin/config/reservas/sala/save', 'AdminConfigReservasController@saveSala');
$router->post('/admin/config/reservas/sala/toggle', 'AdminConfigReservasController@toggleSala');
$router->post('/admin/config/reservas/sala/global-type', 'AdminConfigReservasController@updateGlobalTimeType');

$router->get('/admin/config/reservas/inst/all', 'AdminConfigReservasController@getAllInst');
$router->post('/admin/config/reservas/inst/save', 'AdminConfigReservasController@saveInst');
$router->post('/admin/config/reservas/inst/toggle', 'AdminConfigReservasController@toggleInst');



// ============================================================
// SECCIÓN: Estadísticas (Agregado al final o en su sección)
// ============================================================
$router->get('/stats/dashboard', 'StatisticsController@getStats');


// ============================================================
// SECCIÓN: SUPERADMIN (Gestión Global)
// ============================================================
$router->get('/superadmin/global-stats', 'InstitucionController@getGlobalStats');

// Instituciones
$router->get('/superadmin/instituciones', 'InstitucionController@list');
$router->post('/superadmin/instituciones/create', 'InstitucionController@create');
$router->post('/superadmin/instituciones/update', 'InstitucionController@update');

// Usuarios Globales
$router->get('/superadmin/usuarios', 'UsuarioController@list');
$router->post('/superadmin/usuarios/create', 'UsuarioController@create');
$router->post('/superadmin/usuarios/update', 'UsuarioController@update');
$router->post('/superadmin/usuarios/reset-pass', 'UsuarioController@resetPass');
$router->get('/superadmin/usuarios/check-username', 'UsuarioController@checkUsername');




// ============================================================
// SECCIÓN: SUPERADMIN - GESTIÓN DE FORMULARIOS DE REGISTRO
// ============================================================

// Listado de formularios creados y su estado
$router->get('/superadmin/form-registros/all', 'FormRegistroController@listAll');

// Crear un nuevo acceso (Link) para una institución
$router->post('/superadmin/form-registros/create-link', 'FormRegistroController@createConfig');

// Obtener TODO el detalle EAV de un formulario específico (agrupado)
$router->get('/superadmin/form-registros/detail/:id', 'FormRegistroController@getFullDetail');

// Eliminar o desactivar un link de registro
$router->post('/superadmin/form-registros/delete', 'FormRegistroController@deleteConfig');

$router->get('/superadmin/bitacora/list', 'BitacoraController@listAll');