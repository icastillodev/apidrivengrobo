import { pathnameToMenuPath } from './capacitacionPaths.js';
import { getTourStepsForMenuPath } from './capacitacionTours.js';
import { startCapacitacionInteractiveTour } from '../components/CapacitacionInteractiveTour.js';
import {
  isWelcomeTourDone,
  isAutoToursGloballyDisabled,
  isRouteTourSeen,
  isSetupWizardDone,
} from './capacitacionTourPrefs.js';
import { startCapacitacionSetupWizard } from '../components/CapacitacionSetupWizard.js';

const AUTO_DELAY_MS = 1400;

/**
 * Tras cargar menú y barra de ayuda: bienvenida (una vez) o tutorial por ruta (primera visita).
 */
export function tryAutoStartCapacitacionTour() {
  const pathname = window.location.pathname || '';
  if (!pathname.toLowerCase().includes('/paginas/')) return;
  if (pathname.toLowerCase().includes('capacitacion.html')) return;

  const secModal = document.getElementById('modal-security-check');
  if (secModal?.classList.contains('show')) {
    secModal.addEventListener(
      'hidden.bs.modal',
      () => {
        tryAutoStartCapacitacionTour();
      },
      { once: true }
    );
    return;
  }

  const menuPath = pathnameToMenuPath(pathname);
  if (!menuPath) return;

  const stepsThisRoute = getTourStepsForMenuPath(menuPath);
  const hasRouteSteps = !!(stepsThisRoute && stepsThisRoute.length > 0);

  // Primera bienvenida o primera visita a una sección con pasos: el auto-tutorial debe arrancar aunque
  // el usuario haya desactivado tutoriales automáticos para el resto de visitas (luego solo al tocar Ayuda).
  const mandatoryFirstAuto =
    !isSetupWizardDone() ||
    !isWelcomeTourDone() ||
    (isWelcomeTourDone() && hasRouteSteps && !isRouteTourSeen(menuPath));

  if (isAutoToursGloballyDisabled() && !mandatoryFirstAuto) return;

  if (sessionStorage.getItem('gecko_skip_next_route_tour') === '1') {
    sessionStorage.removeItem('gecko_skip_next_route_tour');
    return;
  }

  if (!isSetupWizardDone()) {
    setTimeout(() => {
      startCapacitacionSetupWizard();
    }, AUTO_DELAY_MS);
    return;
  }

  if (!isWelcomeTourDone()) {
    setTimeout(() => {
      startCapacitacionInteractiveTour('__welcome__', {
        manual: false,
        hostMenuPath: menuPath,
      });
    }, AUTO_DELAY_MS);
    return;
  }

  if (isRouteTourSeen(menuPath)) return;

  if (!hasRouteSteps) return;

  setTimeout(() => {
    startCapacitacionInteractiveTour(menuPath, { manual: false, hostMenuPath: menuPath });
  }, AUTO_DELAY_MS);
}
