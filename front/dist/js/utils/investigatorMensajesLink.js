/**
 * Enlaces a Mensajes con modal "nuevo" pre-rellenado (investigador / rol 3).
 * Rutas relativas según si la página está en paginas/panel o paginas/usuario.
 */
export function isInvestigatorRole() {
  const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
  return r === 3;
}

export function buildMensajesNuevoFromContext({ instId, asunto, origenTipo }) {
  const id = parseInt(String(instId || '0'), 10);
  if (!id) return '';

  const path = window.location.pathname || '';
  let rel = 'mensajes.html';
  if (path.includes('/paginas/usuario/')) {
    rel = '../panel/mensajes.html';
  } else if (!path.includes('/paginas/panel/')) {
    rel = 'paginas/panel/mensajes.html';
  }

  const sp = new URLSearchParams();
  sp.set('msgNuevo', '1');
  sp.set('instId', String(id));
  if (asunto) {
    sp.set('asunto', String(asunto).slice(0, 400));
  }
  const o = String(origenTipo || 'manual').trim();
  if (['formulario', 'alojamiento', 'manual'].includes(o)) {
    sp.set('origen', o);
  }

  return `${rel}?${sp.toString()}`;
}
