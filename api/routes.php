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

// Recuperación de Contraseña
$router->post('/forgot-password', 'UserController@forgotPassword');
$router->post('/update-password-recovery', 'UserController@updatePasswordRecovery');


// ============================================================
// SECCIÓN: Menú y Notificaciones
// ============================================================
$router->get('/menu', 'MenuController@getMenu');
$router->get('/menu/notifications', 'NotificationController@getMenuNotifications');


// ============================================================
// SECCIÓN: Gestión de Usuarios (Admin Sede)
// ============================================================
$router->get('/users/institution', 'UserController@index'); 
$router->get('/users/protocols', 'UserController@getProtocols'); 
$router->get('/users/forms', 'UserController@getForms');       
$router->post('/users/update', 'UserController@update');      
$router->post('/users/reset-pass', 'UserController@resetPassword'); 
$router->get('/users/list-investigators', 'UserController@listInvestigators'); // Selector de investigadores

// ============================================================
// SECCIÓN: Mis Formularios (Visor Unificado Investigador)
// ============================================================
$router->get('/user/my-forms', 'UserFormsController@getMyForms');
$router->get('/user/form-detail/:id', 'UserFormsController@getFormDetail');

// ============================================================
// SECCIÓN: Mis Protocolos (Visor Unificado)
// ============================================================
$router->get('/user/my-protocols', 'UserProtocolsController@getAll');
$router->get('/user/protocol-detail/:id', 'UserProtocolsController@getDetail');


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

// ============================================================
// SECCIÓN: Protocolos
// ============================================================
$router->get('/protocols/institution', 'ProtocolController@getByInstitution');
$router->get('/protocols/form-data', 'ProtocolController@getFormData'); 
$router->post('/protocols/save', 'ProtocolController@save');           
$router->get('/protocols/current-species', 'ProtocolController@getSpeciesByProtocol');
$router->get('/protocolos/search-alojamiento', 'ProtocolController@searchForAlojamiento');
$router->get('/protocolos/search', 'ProtocolController@search');


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


// ============================================================
// SECCIÓN: Auxiliares y Selectores
// ============================================================
$router->get('/deptos/list', 'DeptoController@list');
$router->get('/investigadores/search', 'InvestigadorController@search');
$router->get('/billing/list-active-protocols', 'BillingController@listActiveProtocols');
$router->get('/forms/selector', 'FormSelectorController@getSelectorData');


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




