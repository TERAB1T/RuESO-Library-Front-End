import { nextTick } from 'vue';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

type Size = { width: number; height: number };

/**
 * PhotoSwipe lightbox for the images of an Atomic Shop or C.A.M.P. item page:
 * every `.screenshot-link` inside `#main-item-container`.
 * `initLightbox` (re)binds it after the item's images render; `destroyLightbox` unbinds it.
 */
export const useItemLightbox = () => {
	let lightbox: PhotoSwipeLightbox | null = null;

	const destroyLightbox = () => {
		lightbox?.destroy();
		lightbox = null;
	};

	const initLightbox = () => {
		if (import.meta.env.SSR) return;

		destroyLightbox();

		nextTick(() => {
			if (!document.querySelector('#main-item-container')) return;

			const sizeCache = new Map<string, Size>();

			lightbox = new PhotoSwipeLightbox({
				gallery: '#main-item-container',
				children: '.screenshot-link',
				pswpModule: () => import('photoswipe'),
			});

			lightbox.addFilter('itemData', (itemData, index) => {
				const imgSrc = itemData.src || (itemData.element as HTMLAnchorElement | undefined)?.href || '';

				// A screenshot's thumbnail is the full file, so its natural size is already known before the first open.
				const thumb = (itemData.element as HTMLAnchorElement | undefined)?.querySelector('img');
				if (thumb && thumb.naturalWidth && thumb.currentSrc === imgSrc) {
					sizeCache.set(imgSrc, { width: thumb.naturalWidth, height: thumb.naturalHeight });
				}

				const cached = sizeCache.get(imgSrc);
				if (cached) {
					itemData.width = cached.width;
					itemData.height = cached.height;
					return itemData;
				}

				itemData.width = 1440;
				itemData.height = 1440;

				const img = new Image();
				img.onload = () => {
					sizeCache.set(imgSrc, { width: img.naturalWidth, height: img.naturalHeight });

					if (lightbox?.pswp && lightbox.pswp.currSlide?.index === index) {
						lightbox.pswp.updateSize(true);
					}
				};
				img.src = imgSrc;

				return itemData;
			});

			lightbox.init();
		});
	};

	return { initLightbox, destroyLightbox };
};
