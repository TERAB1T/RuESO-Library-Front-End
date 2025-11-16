<script setup lang="ts">
import { RouterLink, useRoute, onBeforeRouteLeave } from 'vue-router';
import { onMounted, watchEffect, computed, onServerPrefetch, watch, ref, nextTick, onBeforeUnmount } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareAtomicShopImage, generateMetaDescriptionAtomicShop, atomicShopHandleImageError } from '@/utils';
import { useFetchAtomicShopItem, useFetchAtomicShopCategories, usePrefetchAtomicShopCategory, usePrefetchAtomicShopSubcategory } from '@/composables/useApi';
import Breadcrumb from '@/components/Breadcrumb.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize } from '@vueuse/core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

import type { AtomicShopItem, AtomicShopCategoryWithSubcategories, BreadcrumbItem } from '@/types';

const route = useRoute();

let lightbox: PhotoSwipeLightbox | null = null;

const currentItemFormId = computed(() => (route.params.itemFormId || '') as string);

const { data: itemData, suspense: itemSuspense, isSuccess: isItemFetched, isError: isItemError } = useFetchAtomicShopItem(currentItemFormId);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchAtomicShopCategories();

const item = computed(() => itemData.value ?? {} as AtomicShopItem);
const categories = computed(() => categoriesData.value ?? [] as AtomicShopCategoryWithSubcategories[]);

const isNotFound = computed(() =>
	isItemFetched.value && !item.value.nameRu
);

const updateMetaTags = (itemData: AtomicShopItem) => {
	let metaTitle = `${itemData.nameRu} | Fallout 76`;
	let metaDescription = generateMetaDescriptionAtomicShop(itemData.descriptionRu as string);
	let metaLink = `https://rueso.ru/f76-atomic-shop/${itemData.formId}-${itemData.slug}`;
	let metaIcon = `https://rueso.ru${prepareAtomicShopImage(itemData.mainImage)}`;

	useHead({
		title: metaTitle,
		meta: [
			{ name: 'description', content: metaDescription },
			{ name: 'robots', content: 'index, follow' },

			{ property: 'og:title', content: metaTitle },
			{ property: 'og:description', content: metaDescription },
			{ property: 'og:image', content: metaIcon },
			{ property: 'og:url', content: metaLink },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:type', content: 'article' },
			{ property: 'og:site_name', content: 'RuESO' },

			{ name: 'twitter:title', content: metaTitle },
			{ name: 'twitter:description', content: metaDescription },
			{ name: 'twitter:image', content: metaIcon },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [
			{ rel: 'canonical', href: metaLink },
		],
		script: [
			{
				type: 'application/ld+json',
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "CreativeWork",
					"name": itemData.nameRu,
					"alternateName": itemData.nameEn,
					"description": metaDescription,
					"image": metaIcon,
					"inLanguage": "ru",
					"url": metaLink
				})
			}
		]
	});
}

const initLightbox = () => {
	if (import.meta.env.SSR) return;

	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}

	nextTick(() => {
		const galleryElement = document.querySelector('#main-item-container');
		if (!galleryElement) return;

		const sizeCache = new Map();

		lightbox = new PhotoSwipeLightbox({
			gallery: '#main-item-container',
			children: '.screenshot-link',
			pswpModule: () => import('photoswipe'),
		});

		lightbox.addFilter('itemData', (itemData, index) => {
			const imgSrc = itemData.src || itemData.element?.href || '';

			if (sizeCache.has(imgSrc)) {
				const cached = sizeCache.get(imgSrc);
				itemData.width = cached.width;
				itemData.height = cached.height;
				return itemData;
			}


			const existingImg = itemData.element?.querySelector('img');
			if (existingImg?.complete && existingImg.naturalWidth && existingImg.naturalHeight) {
				itemData.width = existingImg.naturalWidth;
				itemData.height = existingImg.naturalHeight;
				sizeCache.set(imgSrc, { width: existingImg.naturalWidth, height: existingImg.naturalHeight });
			} else {

				itemData.width = 512;
				itemData.height = 512;

				const img = new Image();
				img.onload = () => {
					sizeCache.set(imgSrc, {
						width: img.naturalWidth,
						height: img.naturalHeight
					});

					if (lightbox?.pswp && lightbox.pswp.currSlide?.index === index) {
						lightbox.pswp.updateSize(true);
					}
				};
				img.src = imgSrc;
			}

			return itemData;
		});

		lightbox.init();
	});
};

watchEffect(() => {
	if (item.value.nameRu) {
		updateMetaTags(item.value);
	}
});

onServerPrefetch(async () => {
	await itemSuspense();
	await categoriesSuspense();
	if (item.value.nameRu) {
		updateMetaTags(item.value);
	}
});

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string | undefined) => usePrefetchAtomicShopCategory(queryClient, categoryFormId);
const prefetchSubcategory = (subcategoryFormId: string | undefined) => usePrefetchAtomicShopSubcategory(queryClient, subcategoryFormId);

const { width } = useWindowSize();
const isMobile = computed(() => width.value <= 991);
const infoTabTrigger = ref<HTMLElement | null>(null);

onMounted(async () => {
	const { Tab } = await import("bootstrap");

	watch(isMobile, (newValue) => {
		if (!newValue) {
			const infoTab = document.querySelector('#info-tab');
			if (infoTab?.classList.contains('active')) {
				const firstTab = document.querySelector('#russian-tab');
				if (firstTab) {
					const tab = new Tab(firstTab as HTMLElement);
					tab.show();
				}
			}
		}
	});

	initLightbox();
});

const splittedScreenshots = computed(() => {
	const screenshots = item.value.screenshots;
	if (!screenshots) return [];

	const screenshotsArray = Array.isArray(screenshots)
		? screenshots
		: screenshots.split(';');

	return screenshotsArray.map(s => prepareAtomicShopImage(s));
});

const categoryInfo = computed(() => {
	if (!item.value.categoryFormId) return null;
	return categories.value.find(cat => cat.formId === item.value.categoryFormId);
});

const subcategoryInfo = computed(() => {
	if (!item.value.subcategoryFormId) return null;
	for (const category of categories.value) {
		const subcategory = category.subcategories.find(sub => sub.formId === item.value.subcategoryFormId);
		if (subcategory) return subcategory;
	}
	return null;
});

const parsedTextRu = computed(() =>
	(item.value.descriptionRu ?? '').replace(/\n/g, '<br>')
);

const parsedTextEn = computed(() =>
	(item.value.descriptionEn ?? '').replace(/\n/g, '<br>')
);

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
	const items: BreadcrumbItem[] = [
		{ label: 'Атомная лавка Fallout 76', to: '/f76-atomic-shop' }
	];

	if (categoryInfo.value) {
		items.push({
			label: categoryInfo.value.nameRu as string,
			to: `/f76-atomic-shop/category/${categoryInfo.value.formId}-${categoryInfo.value.slug}`
		});
	}

	if (subcategoryInfo.value) {
		items.push({
			label: subcategoryInfo.value.nameRu as string,
			to: `/f76-atomic-shop/subcategory/${subcategoryInfo.value.formId}-${subcategoryInfo.value.slug}`
		});
	}

	items.push({
		label: item.value.nameRu || 'Загрузка...'
	});

	return items;
});

watch(() => item.value.mainImage, () => {
	initLightbox();
});

onBeforeUnmount(() => {
	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}
});

const showTeleport = ref(true);

onBeforeRouteLeave(() => {
	showTeleport.value = false;

	return new Promise(resolve => {
		nextTick(() => resolve(true));
	});
});
</script>

<template>
	<div class="container-xl">
		<div v-if="!isItemFetched && !isItemError" class="loading-state" style="margin: auto;">
			<!-- TODO: Add skeleton -->
		</div>

		<div v-else-if="isItemError" class="error-state alert alert-danger mt-4">
			<h5>Ошибка загрузки предмета</h5>
			<p>Попробуйте обновить страницу или вернуться позже.</p>
		</div>

		<NotFoundView v-else-if="isNotFound" />

		<template v-else>
			<Breadcrumb :items="breadcrumbItems" />

			<div class="row" id="main-item-container">
				<div class="col-lg-8">
					<ul class="nav nav-tabs" id="bookTab" role="tablist">
						<li class="nav-item" role="presentation">
							<button class="nav-link active" id="russian-tab" data-bs-toggle="tab" data-bs-target="#russian-pane" type="button" role="tab" aria-controls="russian-pane" aria-selected="true">Русская<span class="hide-mobile"> версия</span></button>
						</li>
						<li class="nav-item" role="presentation">
							<button class="nav-link" id="english-tab" data-bs-toggle="tab" data-bs-target="#english-pane" type="button" role="tab" aria-controls="english-pane" aria-selected="false">Английская<span class="hide-mobile"> версия</span></button>
						</li>
						<li class="nav-item hide-tab" role="presentation">
							<button ref="infoTabTrigger" class="nav-link" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab" aria-controls="info-pane" aria-selected="false">Информация</button>
						</li>
					</ul>

					<div class="tab-content" :class="splittedScreenshots.length > 0 || isMobile ? 'with-screenshots' : ''" id="categoriesTabContent">
						<div class="tab-pane show active p-3" id="russian-pane" role="tabpanel" aria-labelledby="russian-pane" tabindex="0">
							<h1 class="book-title">{{ item.nameRu }}</h1>
							<div class="book-main" v-html="parsedTextRu"></div>
						</div>

						<div class="tab-pane p-3" id="english-pane" role="tabpanel" aria-labelledby="english-pane" tabindex="1">
							<h1 class="book-title">{{ item.nameEn }}</h1>
							<div class="book-main" v-html="parsedTextEn"></div>
						</div>

						<div class="tab-pane p-3" id="info-pane" role="tabpanel" aria-labelledby="info-pane" tabindex="2">
						</div>
					</div>

					<div v-if="isMobile || splittedScreenshots.length > 0" class="screenshots">
						<div class="row g-3">
							<div v-if="isMobile" class="col-12 col-md-4">
								<a :href="prepareAtomicShopImage(item.mainImage)" class="screenshot-link">
									<img :src="prepareAtomicShopImage(item.mainImage)" class="img-fluid screenshot-img" :alt="item.nameRu || item.nameEn || 'Atomic Shop Item'" loading="lazy" @error="atomicShopHandleImageError">
								</a>
							</div>
							<div v-for="(screenshot, index) in splittedScreenshots" :key="index" class="col-12 col-md-4">
								<a :href="screenshot" class="screenshot-link">
									<img :src="screenshot" class="img-fluid screenshot-img" :alt="`${item.nameRu || item.nameEn} - скриншот ${index + 1}`" @error="atomicShopHandleImageError">
								</a>
							</div>
						</div>
					</div>
				</div>

				<div class="col-lg-4">
					<Teleport v-if="showTeleport" defer to="#info-pane" :disabled="!isMobile">
						<div class="p-3 card-wrapper book-info-card-sticky">
							<div class="card">
								<div v-if="!isMobile" class="card-element book-icon">
									<a :href="prepareAtomicShopImage(item.mainImage)" class="screenshot-link">
										<img :src="prepareAtomicShopImage(item.mainImage)" :alt="item.nameRu || item.nameEn || 'Atomic Shop Item'" class="main-image" loading="lazy" @error="atomicShopHandleImageError">
									</a>
								</div>
								<div v-if="categoryInfo" class="card-element">
									<div class="card-subtitle">Категория</div>
									<RouterLink :to="`/f76-atomic-shop/category/${categoryInfo.formId}-${categoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchCategory(categoryInfo.formId)">
										{{ categoryInfo.nameRu }}
									</RouterLink>
									<span v-if="subcategoryInfo">
										<svg class="breadcrumb-separator" viewBox="0 0 320 512" fill="currentColor">
											<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
										</svg>
										<RouterLink :to="`/f76-atomic-shop/subcategory/${subcategoryInfo.formId}-${subcategoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchSubcategory(subcategoryInfo.formId)">
											{{ subcategoryInfo.nameRu }}
										</RouterLink>
									</span>
								</div>
								<div class="card-element">
									<div class="card-subtitle">Оригинальное название</div>
									{{ item.nameEn || '—' }}
								</div>
								<div class="card-element">
									<div class="card-subtitle">Form ID</div>
									{{ item.formId }}
								</div>
								<div class="card-element">
									<div class="card-subtitle">Editor ID</div>
									{{ item.editorId }}
								</div>
							</div>
						</div>
					</Teleport>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.breadcrumb-separator {
	color: #71717a;
	width: 0.7rem;
	height: 0.7rem;
	margin: 0 0.5rem;
	flex-shrink: 0;
}

.tab-content {
	padding: 0.5rem 1.2rem 1rem;

	&.with-screenshots {
		border-bottom-left-radius: 0%;
		border-bottom-right-radius: 0%;
	}
}

.hide-tab {
	display: none;
}

.book-title {
	font-size: 2rem;
	font-weight: 600;
	margin: 0 0 1.7rem 0;
	line-height: 1.3;
}

.book-main {
	font-size: 1.0325rem;
	line-height: 1.6;
}

.card-wrapper {
	padding-top: 0 !important;
}

.screenshots {
	padding: 0 2.25rem 2.25rem;
	background: var(--bs-block-bg);
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
}

.card {
	padding: 1.25rem !important;
	text-align: center;
	margin: 0 0 0 15px;
	border: none;
	background: var(--bs-block-bg);
}

.card-element {
	padding: 1rem 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	text-align: center;
}

.card-element:last-child {
	border-bottom: none;
}

.card-subtitle {
	font-size: 13px;
	margin-bottom: 0.3rem;
	color: #a1a1aa;
	font-weight: 500;
}

.book-icon {
	border: none;
}

.book-main .alert {
	font-size: 14px;
	line-height: 1.5;
	color: #ffffff;
}

.book-info-card-sticky {
	position: sticky;
	top: 90px;
}

.main-image {
	max-width: 200px;
}

.screenshot-link {
	display: block;
	border-radius: 8px;
	overflow: hidden;

	&:hover .screenshot-img {
		transform: scale(1.02);
	}
}

.screenshot-img {
	transition: transform 0.2s ease;
	will-change: transform;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	transform: translateZ(0);

	&:hover {
		transform: scale(1.02);
	}
}

@media (max-width: 991.98px) {
	.card-wrapper {
		margin-top: 0;
		padding: 0 0 10px !important;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.card {
		margin: 0;
		padding: 0 !important;
	}

	.screenshots {
		padding: 0 1.2rem 1.25rem;
	}

	.hide-tab {
		display: block;
	}
}

@media (max-width: 767.98px) {
	.nav-tabs {
		display: flex;
	}

	.nav-tabs .nav-item {
		width: 33.33%;
	}

	.nav-tabs .nav-link {
		width: 100%;
	}

	.hide-mobile {
		display: none;
	}

	.screenshots {
		text-align: center;
	}
}
</style>
