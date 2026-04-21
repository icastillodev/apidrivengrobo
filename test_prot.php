<?php
require 'api/config/database.php';
$db = (new Database())->getConnection();

// Buscaríamos un id de investigador en session
$sql = "SELECT p.idprotA, p.nprotA, p.IdUsrA, p.IdInstitucion FROM protocoloexpe p LIMIT 10";
$stmt = $db->query($sql);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
