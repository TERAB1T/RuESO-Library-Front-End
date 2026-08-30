import { nextTick } from 'vue';

import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

export const METRIKA_ID = 104360427;

/** GA4 rejects parameter values longer than 100 characters. */
const MAX_PARAM_LENGTH = 100;

export type GlossaryType = 'tes' | 'fallout';
export type CatalogSection = 'eso_library' | 'atomic_shop' | 'camp';

declare global {
	interface Window {
		ym?: (counterId: number, action: string, ...args: unknown[]) => void;
		gtag?: (command: string, ...args: unknown[]) => void;
	}
}

/**
 * Nothing is reported outside production. The Metrika counter is already gated by
 * hostname in index.html, but gtag.js is loaded everywhere, so without this check
 * development traffic would land in the live GA4 property.
 */
const isTracking = () => !import.meta.env.SSR
	&& typeof window !== 'undefined'
	&& /(^|\.)rueso\.ru$/.test(window.location.hostname);

const ymCall = (action: string, ...args: unknown[]) => {
	if (!isTracking() || !window.ym) return;

	try {
		window.ym(METRIKA_ID, action, ...args);
	} catch (error) {
		console.warn('[Yandex.Metrika]', action, error);
	}
};

const gtagCall = (command: string, ...args: unknown[]) => {
	if (!isTracking() || !window.gtag) return;

	try {
		window.gtag(command, ...args);
	} catch (error) {
		console.warn('[gtag]', command, error);
	}
};

const trimParams = (params?: Record<string, unknown>) => {
	if (!params) return undefined;

	return Object.fromEntries(
		Object.entries(params).map(([key, value]) =>
			[key, typeof value === 'string' ? value.slice(0, MAX_PARAM_LENGTH) : value]
		)
	);
};

/**
 * Reports a goal to both counters at once.
 *
 * In Metrika the goal must exist as a JavaScript event with the same identifier;
 * in GA4 the event has to be marked as a key event, and every parameter has to be
 * registered as a custom dimension before it shows up in reports.
 *
 * @param target Goal identifier, e.g. 'library_download'.
 * @param params Optional parameters, string values are truncated to fit GA4 limits.
 */
export const reachGoal = (target: string, params?: Record<string, unknown>) => {
	const payload = trimParams(params);

	ymCall('reachGoal', target, payload);
	gtagCall('event', target, payload ?? {});
};

/** Downloading the whole ESO library as a file. */
export const trackLibraryDownload = (format: 'fb2' | 'epub') => {
	reachGoal('library_download', { format });
};

/** Opening the "buy through Bethesda support" guide on an Atomic Shop item page. */
export const trackSupportGuideOpen = (itemFormId: string) => {
	reachGoal('support_guide_open', { item: itemFormId });
};

/** Copying an item name inside the support guide — the last step before ordering. */
export const trackSupportItemCopy = (itemName: string) => {
	reachGoal('support_item_copy', { item: itemName });
};

/** Following an outbound link from the partners page. */
export const trackPartnerClick = (partner: string) => {
	reachGoal('partner_click', { partner });
};

/** Turning on one of the catalogue filters. Only enabling is reported, not clearing. */
export const trackFilterEnabled = (filter: 'pts' | 'support', section: 'atomic_shop' | 'camp') => {
	reachGoal('filter_enabled', { filter, section });
};

/** Full-text search over the game texts — the whole point of the glossary section. */
export const trackGlossarySearch = (glossary: GlossaryType, query: string) => {
	reachGoal('glossary_search', { glossary, query });
};

/** Narrowing an already browsable list by name — a convenience, not a search. */
export const trackCatalogFilter = (section: CatalogSection, query: string) => {
	reachGoal('catalog_filter', { section, query });
};

/**
 * Registers client-side page view tracking for the SPA.
 *
 * Only Metrika is handled here: its counter is initialised with `defer: true`, so
 * it sends no page view on its own. GA4 picks navigations up by itself through
 * enhanced measurement, which hooks the History API that vue-router uses.
 *
 * Titles are read after nextTick because @unhead applies them during the render
 * flush. Must be called after the router is ready, so the initial navigation is
 * already finished and afterEach does not fire for it a second time.
 */
export const initPageViewTracking = (router: Router) => {
	if (!isTracking()) return;

	const sendHit = async (to: RouteLocationNormalizedLoaded, referer: string) => {
		await nextTick();
		ymCall('hit', to.fullPath, { title: document.title, referer });
	};

	sendHit(router.currentRoute.value, document.referrer);

	router.afterEach((to, from) => {
		if (to.fullPath === from.fullPath) return;
		sendHit(to as RouteLocationNormalizedLoaded, window.location.origin + from.fullPath);
	});
};
