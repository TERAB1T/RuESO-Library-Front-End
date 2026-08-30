import { nextTick } from 'vue';

import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

export const METRIKA_ID = 104360427;

declare global {
	interface Window {
		ym?: (counterId: number, action: string, ...args: unknown[]) => void;
	}
}

const call = (action: string, ...args: unknown[]) => {
	if (import.meta.env.SSR || typeof window === 'undefined' || !window.ym) return;

	try {
		window.ym(METRIKA_ID, action, ...args);
	} catch (error) {
		console.warn('[Yandex.Metrika]', action, error);
	}
};

/**
 * Reports a goal completion. The goal must also exist in the Metrika interface
 * as a JavaScript event with the same identifier, otherwise the call is ignored.
 *
 * @param target Goal identifier, e.g. 'library_download'.
 * @param params Optional goal parameters.
 */
export const reachGoal = (target: string, params?: Record<string, unknown>) => {
	call('reachGoal', target, params);
};

/** Downloading the whole ESO library as a file. */
export const trackLibraryDownload = (format: 'fb2' | 'epub') => {
	reachGoal('library_download', { format });
};

/** Opening the "buy through Bethesda support" guide on an Atomic Shop item page. */
export const trackSupportGuideOpen = (itemFormId: string) => {
	reachGoal('support_guide_open', { item: itemFormId });
};

/** Following an outbound link from the partners page. */
export const trackPartnerClick = (partner: string) => {
	reachGoal('partner_click', { partner });
};

/**
 * Registers client-side page view tracking for the SPA.
 *
 * The counter is initialised with `defer: true`, so it sends no page view on its
 * own — every view, including the very first one, is reported from here. Titles
 * are read after nextTick because @unhead applies them during the render flush.
 *
 * Must be called after the router is ready, so the initial navigation is already
 * finished and afterEach does not fire for it a second time.
 */
export const initMetrikaPageViews = (router: Router) => {
	if (import.meta.env.SSR) return;

	const sendHit = async (to: RouteLocationNormalizedLoaded, referer: string) => {
		await nextTick();
		call('hit', to.fullPath, { title: document.title, referer });
	};

	sendHit(router.currentRoute.value, document.referrer);

	router.afterEach((to, from) => {
		if (to.fullPath === from.fullPath) return;
		sendHit(to as RouteLocationNormalizedLoaded, window.location.origin + from.fullPath);
	});
};
