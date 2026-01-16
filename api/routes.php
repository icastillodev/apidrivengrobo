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

// api/routes.php

// Cambia 'ProtocoloController' por 'ProtocolController'
$router->get('/protocolos/search-alojamiento', 'ProtocolController@searchForAlojamiento');
$router->get('/protocolos/search', 'ProtocolController@search');

// Auxiliares para búsqueda
$router->get('/protocolos/search', 'ProtocoloController@search');
$router->get('/investigadores/search', 'InvestigadorController@search');

