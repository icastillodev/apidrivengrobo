import { pathnameToMenuPath, isDashboardMenuPath, isCapacitacionAppPath } from './capacitacionPaths.js?v=20260409';
import { getTourStepsForMenuPath } from './capacitacionTours.js?v=20260409';
import { startCapacitacionInteractiveTour } from '../components/CapacitacionInteractiveTour.js?v=20260409';
import {
  isWelcomeTourDone,
  isAutoToursGloballyDisabled,
  isRouteTourSeen,
  isSetupWizardDone,
} from './capacitacionTourPrefs.js';
import { startCapacitacionSetupWizard } from '../components/CapacitacionSetupWizard.js?v=20260409';

const AUTO_DELAY_MS = 1400;

/**
 * Tras cargar menú y barra de ayuda: bienvenida (una vez) o tutorial por ruta (primera visita).
 * El asistente de primera configuración (idioma/tema/letra/menú) solo se ofrece en el dashboard.
 */
export function tryAutoStartCapacitacionTour() {
  const pathname = window.location.pathname || '';
  if (!isCapacitacionAppPath(pathname)) return;

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
  if (menuPath === 'panel/capacitacion') return;

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
    if (!isDashboardMenuPath(menuPath)) {
      return;
    }
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
