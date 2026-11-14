import { nextTick } from 'vue';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

type Size = { width: number; height: number };

/**
 * PhotoSwipe lightbox for the images of an Atomic Shop or C.A.M.P. item page:
 * every `.screenshot-link` inside `#main-item-container`.
 * `gallery` can name other containers; each matched element is a gallery of its own.
 * `guess` is the size assumed for an image until its file loads (item images are square).
 * `initLightbox` (re)binds it after the item's images render; `destroyLightbox` unbinds it.
 */
export const useItemLightbox = (gallery = '#main-item-container', guess: Size = { width: 1440, height: 1440 }) => {
	let lightbox: PhotoSwipeLightbox | null = null;

	const destroyLightbox = () => {
		lightbox?.destroy();
		lightbox = null;
	};

	const initLightbox = () => {
		if (import.meta.env.SSR) return;

		destroyLightbox();

		nextTick(() => {
			if (!document.querySelector(gallery)) return;

			const sizeCache = new Map<string, Size>();

			lightbox = new PhotoSwipeLightbox({
				gallery,
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

				itemData.width = guess.width;
				itemData.height = guess.height;

				const img = new Image();
				img.onload = () => {
					sizeCache.set(imgSrc, { width: img.naturalWidth, height: img.naturalHeight });

					// updateSize() only re-measures the viewport; the slide keeps the guessed size until its
					// content is rebuilt, which runs this filter again and hits the cache. The clicked slide's
					// data is asked for before PhotoSwipe exists, so its file can load before there is anything
					// to refresh: then refresh right after PhotoSwipe initialises.
					if (lightbox?.pswp) {
						lightbox.pswp.refreshSlideContent(index);
						return;
					}
					const refreshOnce = () => {
						lightbox?.pswp?.refreshSlideContent(index);
						lightbox?.off('afterInit', refreshOnce);
					};
					lightbox?.on('afterInit', refreshOnce);
				};
				img.src = imgSrc;

				return itemData;
			});

			lightbox.init();
		});
	};

	return { initLightbox, destroyLightbox };
};
