import { onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';

export const useCopyOnClick = (containerRef: Ref<HTMLElement | null>) => {
	const tooltips = new Map<HTMLElement, any>();
	let Tooltip: any = null;

	const handleClick = async (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const copyElement = target.closest('.support-item-name') as HTMLElement;

		if (!copyElement || !Tooltip) return;

		try {
			const textToCopy = copyElement.textContent?.trim() || '';
			await navigator.clipboard.writeText(textToCopy);

			let tooltip = tooltips.get(copyElement);
			if (!tooltip) {
				tooltip = new Tooltip(copyElement, {
					title: 'Название скопировано',
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
