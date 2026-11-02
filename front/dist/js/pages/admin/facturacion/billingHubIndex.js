import { initBillingPageHub } from './billingPersonHub.js?v=20261102';

export async function initBillingHubIndex() {
    await initBillingPageHub('index', {
        getDateRange: () => {
            const hoy = new Date();
            return {
                desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0],
                hasta: hoy.toISOString().split('T')[0],
            };
        },
    });
}
