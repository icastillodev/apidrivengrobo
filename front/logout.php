<?php
// front/logout.php
session_start();
session_destroy(); // Destruye la sesión de PHP
?>
<!DOCTYPE html>
<html>
<head>
    <script>
        // Limpiamos el localStorage; preservamos onboarding/tours (misma lógica que Auth.logout)
        const slug = localStorage.getItem('NombreInst') || '';
        const uiSnap = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k.startsWith('gecko_cap_tour_') || k === 'gecko_hide_capacitacion_fab') uiSnap[k] = localStorage.getItem(k);
        }
        localStorage.clear();
        Object.keys(uiSnap).forEach(function (k) { if (uiSnap[k] != null) localStorage.setItem(k, uiSnap[k]); });
        
        // Redirigimos al inicio
        window.location.href = "/URBE-API-DRIVEN/front/" + slug;
    </script>
</head>
<body>
    <p>Cerrando sesión...</p>
</body>
</html>