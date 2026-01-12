<?php
// api/routes.php

// SECCIÓN: Autenticación
$router->get('/validate-inst/:slug', 'AuthController@validateInstitution');
$router->post('/login', 'AuthController@login');
$router->post('/login-superadmin', 'AuthController@loginSuperAdmin');

// SECCIÓN: Menú Dinámico
$router->get('/menu', 'MenuController@getMenu');
$router->get('/menu/notifications', 'AnimalController@getPendingCounts');


// SECCIÓN: Usuarios (Admin)
$router->get('/users/institution', 'UserController@index'); // Lista principal
$router->get('/users/protocols', 'UserController@getProtocols'); // Para el modal
$router->get('/users/forms', 'UserController@getForms');       // Para el modal
$router->post('/users/update', 'UserController@update');      // Guardar cambios
$router->post('/users/reset-pass', 'UserController@resetPassword'); // resetear pass

// SECCIÓN: Instituciones
$router->get('/institutions/departments', 'InstitutionController@getDepartments');

// SECCIÓN: Protocolos (Admin)
$router->get('/protocols/institution', 'ProtocolController@getByInstitution');
$router->get('/protocols/form-data', 'ProtocolController@getFormData'); // Nueva
$router->post('/protocols/save', 'ProtocolController@save');           // Para crear/editar
$router->get('/protocols/current-species', 'ProtocolController@getSpeciesByProtocol');

// SECCIÓN: Animales (Registro de Animales)
$router->get('/animals/all', 'AnimalController@getAll'); // Carga la grilla filtrada por Animal Vivo
$router->get('/animals/form-data', 'AnimalController@getFormData'); // Selects de tipos y protocolos
$router->get('/animals/last-notification', 'AnimalController@getLastNotification'); // Corregido 404
$router->post('/animals/update-status', 'AnimalController@updateStatus'); // Corregido 500
$router->post('/animals/save-notification', 'AnimalController@saveNotification');
$router->post('/animals/update-full', 'AnimalController@updateFull'); // Modificación completa del formulario
$router->get('/animals/form-data', 'AnimalController@getFormData'); // Carga tipos y protocolos
$router->get('/animals/protocol-species', 'AnimalController@getSpeciesByProtocol'); // Especies aprobadas
$router->get('/animals/get-sex-data', 'AnimalController@getSexData'); // Corregido el 404
