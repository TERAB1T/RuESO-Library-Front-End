import { nextTick } from 'vue';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import type PhotoSwipe from 'photoswipe';
import type { SlideData } from 'photoswipe';
import 'photoswipe/style.css';

type Size = { width: number; height: number };
type Slide = NonNullable<PhotoSwipe['currSlide']>;

const srcOf = (data: SlideData) => data.src || (data.element as HTMLAnchorElement | undefined)?.href || '';

/**
 * Sizes the slides of `lightbox`: PhotoSwipe needs a size before an image loads. Until a file loads
 * its slide gets `guess`; then the slide is rebuilt with the real size.
 */
export const addSizeProbe = (lightbox: PhotoSwipeLightbox, guess: Size) => {
	const sizeCache = new Map<string, Size>();
	// Files whose real size arrived after their slide was built with the guess.
	const stale = new Set<string>();

	// Rebuilding restarts a slide: on the slide in view it would undo a zoom or pan,
	// and during the opening or closing animation it would pull the animated image out of the DOM.
	const canRebuild = (pswp: PhotoSwipe, slide: Slide) =>
		slide !== pswp.currSlide || (pswp.opener.isOpen && slide.currZoomLevel === slide.zoomLevels.initial);

	// updateSize() only re-measures the viewport; a slide keeps its size until its content is rebuilt,
	// which runs the itemData filter again and hits the cache.
	const rebuildStale = () => {
		const pswp = lightbox.pswp;
		if (!pswp || !stale.size) return;
		for (const { slide } of pswp.mainScroll.itemHolders) {
			if (!slide || !stale.has(srcOf(slide.data)) || !canRebuild(pswp, slide)) continue;
			stale.delete(srcOf(slide.data));
			pswp.refreshSlideContent(slide.index);
		}
	};

	lightbox.addFilter('itemData', (itemData) => {
		const imgSrc = srcOf(itemData);

		// A screenshot's thumbnail is the full file, so its natural size is already known before the first open.
		const thumb = (itemData.element as HTMLAnchorElement | undefined)?.querySelector('img');
		if (thumb && thumb.naturalWidth && thumb.currentSrc === imgSrc) {
			sizeCache.set(imgSrc, { width: thumb.naturalWidth, height: thumb.naturalHeight });
		}

		const cached = sizeCache.get(imgSrc);
		if (cached) {
			stale.delete(imgSrc);
			itemData.width = cached.width;
			itemData.height = cached.height;
			return itemData;
		}

		itemData.width = guess.width;
		itemData.height = guess.height;

		const img = new Image();
		img.onload = () => {
			sizeCache.set(imgSrc, { width: img.naturalWidth, height: img.naturalHeight });
			stale.add(imgSrc);
			rebuildStale();
		};
		img.src = imgSrc;

		return itemData;
	});

	// A slide that could not be rebuilt when its file loaded: the clicked one loads before PhotoSwipe
	// exists or during the opening animation; a zoomed one waits until the user moves on.
	lightbox.on('openingAnimationEnd', rebuildStale);
	lightbox.on('change', rebuildStale);
};

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

			lightbox = new PhotoSwipeLightbox({
				gallery,
				children: '.screenshot-link',
				pswpModule: () => import('photoswipe'),
			});
			addSizeProbe(lightbox, guess);
			lightbox.init();
		});
	};

	return { initLightbox, destroyLightbox };
};
