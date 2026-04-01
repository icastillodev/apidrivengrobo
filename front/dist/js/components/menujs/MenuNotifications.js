import { getSession } from './MenuConfig.js';
import { NotificationManager } from '../../NotificationManager.js';

export async function refreshMenuNotifications() {
    const instId = getSession('instId');
    if (!instId) return;

    try {
        await NotificationManager.check();
    } catch (e) {
        console.warn("Fallo en notificaciones:", e);
    }
}