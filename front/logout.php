<?php
// front/logout.php
session_start();
session_destroy(); // Destruye la sesión de PHP
?>
<!DOCTYPE html>
<html>
<head>
    <script>
        // Limpiamos el localStorage desde el navegador
        const slug = localStorage.getItem('NombreInst') || '';
        localStorage.clear(); 
        
        // Redirigimos al inicio
        window.location.href = "/URBE-API-DRIVEN/front/" + slug;
    </script>
</head>
<body>
    <p>Cerrando sesión...</p>
</body>
</html>