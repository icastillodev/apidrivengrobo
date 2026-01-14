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
$router->get('/menu/notifications', 'AnimalController@getPendingCounts');

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
// Carga la grilla filtrada por la categoría específica
$router->get('/reactivos/all', 'ReactivoController@getAll'); 

// Actualización rápida de estado y auditoría (QuienVio)
$router->post('/reactivos/update-status', 'ReactivoController@updateStatus'); 

// Modificación completa: incluye Cantidad (organo) y Medida (TipoInsumo)
$router->post('/reactivos/update-full', 'ReactivoController@updateFull'); 

// (Opcional) Si decides usar el mismo sistema de notificaciones que Animales
$router->get('/reactivos/last-notification', 'ReactivoController@getLastNotification'); 
$router->post('/reactivos/send-notification', 'ReactivoController@sendNotification');

$router->get('/reactivos/form-data', 'ReactivoController@getFormData'); // <--- FALTA ESTA

