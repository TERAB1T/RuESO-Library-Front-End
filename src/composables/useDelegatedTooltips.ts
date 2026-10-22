import { onMounted, onBeforeUnmount } from 'vue';
import type { Tooltip as TooltipType } from 'bootstrap';

const SELECTOR = '[data-bs-toggle="tooltip"]';

/**
 * Enables Bootstrap tooltips for every `[data-bs-toggle="tooltip"]` element on the page
 * through a single delegated listener on document.body, and tears them down on unmount.
 */
export const useDelegatedTooltips = () => {
	let Tooltip: typeof TooltipType | null = null;
	let bodyTooltip: TooltipType | null = null;
	let isUnmounted = false;

	onMounted(async () => {
		({ Tooltip } = await import('bootstrap'));
		if (isUnmounted) return;

		bodyTooltip = new Tooltip(document.body, { selector: SELECTOR });
	});

	onBeforeUnmount(() => {
		isUnmounted = true;

		bodyTooltip?.dispose();
		bodyTooltip = null;

		// Bootstrap keeps a per-element instance for every hovered element in a module-level Map,
		// so without disposing them each one keeps its detached page alive.
		document.querySelectorAll(SELECTOR).forEach(el => Tooltip?.getInstance(el)?.dispose());

		document.querySelectorAll('.tooltip').forEach(el => el.remove());
	});
};
