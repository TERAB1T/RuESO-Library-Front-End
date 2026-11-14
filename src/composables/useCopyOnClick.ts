import { onMounted, onUnmounted, watch } from 'vue';
import { trackSupportItemCopy } from '@/analytics';
import type { Ref } from 'vue';

interface CopyOnClickOptions {
	/** Elements inside the container whose text is copied on click. */
	selector?: string;
	/** Tooltip shown for a second after copying. */
	title?: string;
	/** Called with the copied text (analytics). */
	onCopy?: (text: string) => void;
}

/** Defaults: the item names in the Atomic Shop support guide. */
export const useCopyOnClick = (containerRef: Ref<HTMLElement | null>, {
	selector = '.support-item-name',
	title = 'Название скопировано',
	onCopy = trackSupportItemCopy,
}: CopyOnClickOptions = {}) => {
	const tooltips = new Map<HTMLElement, any>();
	let Tooltip: any = null;

	const handleClick = async (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const copyElement = target.closest(selector) as HTMLElement;

		if (!copyElement || !Tooltip) return;

		try {
			const textToCopy = copyElement.textContent?.trim() || '';
			await navigator.clipboard.writeText(textToCopy);

			onCopy?.(textToCopy);

			let tooltip = tooltips.get(copyElement);
			if (!tooltip) {
				tooltip = new Tooltip(copyElement, {
					title,
					trigger: 'manual',
					placement: 'top',
					customClass: 'tooltip-dark'
				});
				tooltips.set(copyElement, tooltip);
			}

			tooltip.show();
			setTimeout(() => tooltip.hide(), 1000);
		} catch (err) {
			console.error('Ошибка копирования:', err);
		}
	};

	onMounted(async () => {
		const bootstrap = await import('bootstrap');
		Tooltip = bootstrap.Tooltip;

		watch(
			containerRef,
			(newContainer, oldContainer) => {
				if (oldContainer) {
					oldContainer.removeEventListener('click', handleClick);
				}

				if (newContainer) {
					newContainer.addEventListener('click', handleClick);
				}
			},
			{ immediate: true }
		);
	});

	onUnmounted(() => {
		if (containerRef.value) {
			containerRef.value.removeEventListener('click', handleClick);
		}

		tooltips.forEach(tooltip => tooltip.dispose());
		tooltips.clear();
	});
};
