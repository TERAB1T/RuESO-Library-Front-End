<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import emblaCarouselVue from 'embla-carousel-vue';
import { atomicShopHandleImageError } from '@/utils';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

import type { ItemGallerySlide } from '@/types';

const props = defineProps<{
	slides: ItemGallerySlide[];
	note?: string;
}>();

// Matches the slide width in the styles below.
const SLIDE_SIZES = 'min(100vw, 26rem)';

const [viewport, embla] = emblaCarouselVue({ align: 'start', containScroll: 'trimSnaps' });

// One dot per scroll position. On tablets several slides fit at once, so there are fewer positions
// than slides; until Embla measures that, the server and the first render show one per slide.
const snapCount = ref(props.slides.length);
const activeIndex = ref(0);
let lightbox: PhotoSwipeLightbox | null = null;

const syncDots = () => {
	if (!embla.value) return;
	snapCount.value = embla.value.scrollSnapList().length;
	activeIndex.value = embla.value.selectedScrollSnap();
};

const scrollToSlide = (index: number, jump = false) => {
	embla.value?.scrollTo(Math.min(index, snapCount.value - 1), jump);
};

// The fallback srcset would otherwise keep winning over the replaced src.
const onImageError = (event: Event) => {
	(event.target as HTMLImageElement).removeAttribute('srcset');
	atomicShopHandleImageError(event);
};

watch(embla, (api) => {
	if (!api) return;
	api.on('select', syncDots).on('reInit', syncDots);
	syncDots();
});

// Embla re-measures new slides by itself; only the position has to go back to the start.
watch(() => props.slides, () => nextTick(() => scrollToSlide(0, true)));

onMounted(() => {
	if (!viewport.value) return;

	const sizeCache = new Map<string, { width: number; height: number }>();

	// Embla swallows the click that ends a drag, so a drag never opens the lightbox.
	lightbox = new PhotoSwipeLightbox({
		gallery: viewport.value,
		children: 'a',
		pswpModule: () => import('photoswipe'),
	});

	lightbox.addFilter('itemData', (itemData, index) => {
		const imgSrc = (itemData.element as HTMLAnchorElement | undefined)?.href || '';

		const thumb = itemData.element?.querySelector('img');
		if (thumb && thumb.naturalWidth && thumb.currentSrc === imgSrc) {
			sizeCache.set(imgSrc, { width: thumb.naturalWidth, height: thumb.naturalHeight });
		}

		const cached = sizeCache.get(imgSrc);
		if (cached) {
			itemData.width = cached.width;
			itemData.height = cached.height;
			return itemData;
		}

		// Item images are square; the real size replaces this guess once the file loads.
		itemData.width = 1440;
		itemData.height = 1440;

		const img = new Image();
		img.onload = () => {
			sizeCache.set(imgSrc, { width: img.naturalWidth, height: img.naturalHeight });
			if (lightbox?.pswp?.currSlide?.index === index) lightbox.pswp.updateSize(true);
		};
		img.src = imgSrc;

		return itemData;
	});

	// Closing animates back to the thumbnail, so the slider follows the lightbox.
	lightbox.on('change', () => {
		const index = lightbox?.pswp?.currIndex;
		if (index !== undefined) scrollToSlide(index, true);
	});

	lightbox.init();
});

onBeforeUnmount(() => {
	lightbox?.destroy();
	lightbox = null;
});
</script>

<template>
	<div class="item-gallery">
		<div ref="viewport" class="item-gallery-viewport">
			<div class="item-gallery-container">
				<div v-for="(slide, index) in slides" :key="`${index}-${slide.href}`" class="item-gallery-slide">
					<a :href="slide.href" class="item-gallery-link" draggable="false">
						<img :src="slide.src" :srcset="slide.srcset" :sizes="slide.srcset ? SLIDE_SIZES : undefined" :alt="slide.alt" width="512" height="512" loading="lazy" draggable="false" @error="onImageError">
					</a>
				</div>
			</div>
		</div>
		<div v-if="snapCount > 1" class="item-gallery-dots">
			<button v-for="index in snapCount" :key="index" type="button" class="item-gallery-dot" :class="{ active: index - 1 === activeIndex }" :aria-label="`Изображение ${index} из ${snapCount}`" :aria-current="index - 1 === activeIndex || undefined" @click="scrollToSlide(index - 1)"></button>
		</div>
		<div v-if="note" class="item-gallery-note">{{ note }}</div>
	</div>
</template>

<style scoped lang="scss">
$gap: 0.75rem;

.item-gallery-viewport {
	overflow: hidden;

	@media (hover: hover) and (pointer: fine) {
		cursor: grab;
	}
}

// Spacing as Embla documents it: padding inside each slide, pulled back by the container's margin.
.item-gallery-container {
	display: flex;
	margin-left: -$gap;
	touch-action: pan-y pinch-zoom;
	user-select: none;
}

.item-gallery-slide {
	flex: 0 0 min(100%, 26rem);
	min-width: 0;
	padding-left: $gap;
}

/* Item images and shop screenshots are all square. */
.item-gallery-link {
	display: block;
	aspect-ratio: 1;
	border-radius: 8px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.03);

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
}

.item-gallery-dots {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	margin-top: 0.5rem;
}

.item-gallery-dot {
	// Narrow enough for 15+ dots (the most screenshots an item has) on one line of a 320px phone.
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 24px;
	padding: 0;
	border: none;
	background: none;

	&::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #52525b;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}

	&.active::before {
		background: var(--bs-primary);
		transform: scale(1.3);
	}
}

.item-gallery-note {
	margin-top: 0.5rem;
	font-size: 0.9rem;
	line-height: 1.4;
	font-style: italic;
	color: #a1a1aa;
}
</style>
