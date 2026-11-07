import {
  snapshotGroboPersistentUiPrefs,
  restoreGroboPersistentUiPrefs,
} from './groboPersistentUiPrefs.js';

/**
 * Los QR publicos comparten autenticacion con GROBO:
 * sessionStorage (sesion corta) o localStorage (recordar acceso).
 */
export function getQrSessionValue(key) {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Cierra la sesion de forma real sin abandonar el QR publico.
 * El token podria estar en sessionStorage, localStorage o cookies.
 * Conserva exclusivamente idioma, aspecto y la institucion de login.
 */
export function closeQrSession() {
  const keysToKeep = ['lang', 'idioma', 'theme', 'fontSize', 'NombreInst', 'instId'];
  const retained = {};
  try {
    keysToKeep.forEach(key => {
      const value = getQrSessionValue(key);
      if (value != null && value !== '' && value !== 'null' && value !== 'undefined') {
        retained[key] = value;
      }
    });
    const tourPreferences = snapshotGroboPersistentUiPrefs();
    localStorage.clear();
    sessionStorage.clear();
    restoreGroboPersistentUiPrefs(tourPreferences);
    Object.entries(retained).forEach(([key, value]) => localStorage.setItem(key, value));
  } catch (e) {
    // Fallback: como minimo, revocar las credenciales que usa API.request.
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ['token','userLevel','userId','userName','userFull','userApe']) {
        try { storage.removeItem(key); } catch {}
      }
    }
    console.warn('QR: no se pudieron limpiar todas las preferencias de sesion', e);
  }

  // Mismo mecanismo de expiracion para cookies accesibles desde JS que usa Auth.
  try {
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0].trim();
      if (!name) continue;
      document.cookie = name + '=;Expires=Thu, 01 Jan 1970 00:00:00 GMT;Path=/;SameSite=Lax';
    }
  } catch {
    /* Cookies no disponibles en el contexto de navegador actual. */
  }
}
