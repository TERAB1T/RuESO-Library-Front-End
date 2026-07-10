<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { onMounted, watchEffect, computed, onServerPrefetch, watch, ref, nextTick } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareCampImage, generateMetaDescriptionAtomicShop, atomicShopHandleImageError } from '@/utils';
import { useFetchCampItem, useFetchCampCategories, usePrefetchCampCategory, usePrefetchCampSubcategory } from '@/composables/useApi';
import Breadcrumb from '@/components/Breadcrumb.vue';
import F76CampUnlockConditions from '@/components/F76CampUnlockConditions.vue';
import F76CampProducesTable from '@/components/F76CampProducesTable.vue';
import F76CampRecipeVariants from '@/components/F76CampRecipeVariants.vue';
import F76CampRecipeComponents from '@/components/F76CampRecipeComponents.vue';
import F76CampDisplayTable from '@/components/F76CampDisplayTable.vue';
import F76CampPowerInfo from '@/components/F76CampPowerInfo.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize } from '@vueuse/core';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

import type { CampItem, CampItemWithRelations, CampCategoryWithSubcategories, BreadcrumbItem } from '@/types';

const route = useRoute();

let lightbox: PhotoSwipeLightbox | null = null;
let BootstrapModal: any = null;

const currentItemFormId = computed(() => ((route.params.itemFormId || '') as string).toLowerCase());

const { data: itemData, suspense: itemSuspense, isSuccess: isItemFetched, isError: isItemError } = useFetchCampItem(currentItemFormId);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCampCategories();

const item = computed(() => itemData.value ?? {} as CampItemWithRelations);
const categories = computed(() => categoriesData.value ?? [] as CampCategoryWithSubcategories[]);

const isNotFound = computed(() =>
	isItemFetched.value && !item.value.nameRu
);

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

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
	const items: BreadcrumbItem[] = [
		{ label: 'Предметы C.A.M.P. Fallout 76', to: '/f76-camp' }
	];

	if (categoryInfo.value) {
		items.push({
			label: categoryInfo.value.nameRu as string,
			to: `/f76-camp/category/${categoryInfo.value.formId}-${categoryInfo.value.slug}`
		});
	}

	if (subcategoryInfo.value) {
		items.push({
			label: subcategoryInfo.value.nameRu as string,
			to: `/f76-camp/subcategory/${subcategoryInfo.value.formId}-${subcategoryInfo.value.slug}`
		});
	}

	items.push({
		label: item.value.nameRu || 'Загрузка...'
	});

	return items;
});

const updateMetaTags = (itemData: CampItem) => {
	let metaTitle = `${itemData.nameRu} | C.A.M.P. F76`;
	let metaDescription = generateMetaDescriptionAtomicShop(itemData.descriptionRu as string);
	let metaLink = `https://rueso.ru/f76-camp/${itemData.formId}-${itemData.slug}`;
	let metaIcon = `https://rueso.ru${prepareCampImage(itemData.mainImage)}`;

	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumbItems.value.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.label,
			...(item.to && { item: `https://rueso.ru${item.to}` })
		}))
	};

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
			},
			{
				type: 'application/ld+json',
				children: JSON.stringify(breadcrumbSchema)
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
			const imgSrc = itemData.src || (itemData.element as HTMLAnchorElement | undefined)?.href || '';

			if (sizeCache.has(imgSrc)) {
				const cached = sizeCache.get(imgSrc);
				itemData.width = cached.width;
				itemData.height = cached.height;
				return itemData;
			}

			itemData.width = 1440;
			itemData.height = 1440;

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
const prefetchCategory = (categoryFormId: string | undefined) => usePrefetchCampCategory(queryClient, categoryFormId);
const prefetchSubcategory = (subcategoryFormId: string | undefined) => usePrefetchCampSubcategory(queryClient, subcategoryFormId);

const { width } = useWindowSize();
const isMobile = computed(() => width.value <= 991);
let teleportDisabled = ref(true);

const infoTabTrigger = ref<HTMLElement | null>(null);

onMounted(async () => {
	const { Tab, Modal } = await import("bootstrap");
	BootstrapModal = Modal;

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

		teleportDisabled.value = !newValue;
	}, { immediate: true });

	initLightbox();
});

const splittedScreenshots = computed(() => {
	const screenshots = item.value.screenshots;
	if (!screenshots) return [];

	const screenshotsArray = Array.isArray(screenshots)
		? screenshots
		: screenshots.split(';');

	return screenshotsArray.map(s => prepareCampImage(s));
});

const parsedTextRu = computed(() => {
	if (item.value.descriptionRu) return item.value.descriptionRu.replace(/\n/g, '<br>');
	if (item.value.recipe?.descriptionRu) return item.value.recipe.descriptionRu.replace(/\n/g, '<br>');
	return '';
});

const parsedTextEn = computed(() => {
	if (item.value.descriptionEn) return item.value.descriptionEn.replace(/\n/g, '<br>');
	if (item.value.recipe?.descriptionEn) return item.value.recipe.descriptionEn.replace(/\n/g, '<br>');
	return '';
});

const placementBadges = computed(() => [
	{ key: 'camp', label: 'C.A.M.P.', available: !!item.value.camp },
	{ key: 'shelter', label: 'Укрытия', available: !!item.value.shelter },
	{ key: 'workshop', label: 'Мастерские', available: !!item.value.workshop },
]);

const maximumEntries = computed(() => {
	const entries: { key: string; label: string; value: number | null }[] = [];

	if (item.value.camp) entries.push({ key: 'camp', label: 'C.A.M.P.', value: item.value.campMaxValue });
	if (item.value.workshop) entries.push({ key: 'workshop', label: 'Мастерские', value: item.value.workshopMaxValue });

	return entries;
});

const requiresPowerDisplay = computed(() => {
	if (!item.value.requiresPower) return 'Нет';
	return item.value.powerRequired > 0 ? String(item.value.powerRequired) : 'Да';
});

const powerGeneratedDisplay = computed(() => {
	return item.value.powerGenerated > 0 ? item.value.powerGenerated : null;
});

watch(() => item.value.mainImage, () => {
	initLightbox();
});

const showTeleport = ref(true);

onBeforeRouteLeave(async () => {
	if (BootstrapModal) {
		const modalEl = document.getElementById('supportModal');
		const modal = modalEl ? BootstrapModal.getInstance(modalEl) : null;
		modal?.hide();
	}

	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}

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
							<div v-if="item.isPTS" class="alert alert-info atomic-shop-card" role="alert">
								<div class="pts-badge-wrapper" style="top:calc(50% - 20px);">
									<div class="pts-badge">PTS</div>
								</div>
								<div style="margin-left:55px;">Сейчас этот предмет доступен только на публичном тестовом сервере.</div>
							</div>
							<div class="book-main" v-html="parsedTextRu"></div>

							<F76CampUnlockConditions :learn-conditions="item.learnConditions" :unlocked-by-entitlements="item.unlockedByEntitlements" lang="ru" />
							<F76CampProducesTable :produces="item.produces" :carry-weight="item.carryWeight" lang="ru" />
							<F76CampDisplayTable :display="item.display" lang="ru" />
							<F76CampPowerInfo :requires-power="item.requiresPower" :power-required="item.powerRequired" :power-connectable="item.powerConnectable" :power-generated="item.powerGenerated" :power-radiated="item.powerRadiated" lang="ru" />
							<F76CampRecipeVariants :key="item.formId" :recipe="item.recipe" :recipe-items="item.recipeItems" lang="ru" />
						</div>

						<div class="tab-pane p-3" id="english-pane" role="tabpanel" aria-labelledby="english-pane" tabindex="1">
							<h1 class="book-title">{{ item.nameEn }}</h1>
							<div v-if="item.isPTS" class="alert alert-info atomic-shop-card" role="alert">
								<div class="pts-badge-wrapper" style="top:calc(50% - 20px);">
									<div class="pts-badge">PTS</div>
								</div>
								<div style="margin-left:55px;">This item is currently available only on the Public Test Server.</div>
							</div>
							<div class="book-main" v-html="parsedTextEn"></div>

							<F76CampUnlockConditions :learn-conditions="item.learnConditions" :unlocked-by-entitlements="item.unlockedByEntitlements" lang="en" />
							<F76CampProducesTable :produces="item.produces" :carry-weight="item.carryWeight" lang="en" />
							<F76CampDisplayTable :display="item.display" lang="en" />
							<F76CampPowerInfo :requires-power="item.requiresPower" :power-required="item.powerRequired" :power-connectable="item.powerConnectable" :power-generated="item.powerGenerated" :power-radiated="item.powerRadiated" lang="en" />
							<F76CampRecipeVariants :key="item.formId" :recipe="item.recipe" :recipe-items="item.recipeItems" lang="en" />
						</div>

						<div class="tab-pane p-3" id="info-pane" role="tabpanel" aria-labelledby="info-pane" tabindex="2">
						</div>
					</div>

					<div v-if="isMobile || splittedScreenshots.length > 0" class="screenshots">
						<div class="fo-sect-h">
							<span class="fo-bar"></span>
							<h3 class="fo-h3">Галерея</h3>
						</div>
						<div class="row g-3">
							<div v-if="isMobile" class="col-12 col-md-4">
								<a :href="prepareCampImage(item.mainImage)" class="screenshot-link">
									<img :src="prepareCampImage(item.mainImage, 512)" class="img-fluid screenshot-img" :alt="item.nameRu || item.nameEn || 'C.A.M.P. Item'" loading="lazy" @error="atomicShopHandleImageError">
								</a>
							</div>
							<div v-for="(screenshot, index) in splittedScreenshots" :key="index" class="col-12 col-md-4">
								<a :href="screenshot" class="screenshot-link">
									<img :src="screenshot" class="img-fluid screenshot-img" :alt="`${item.nameRu || item.nameEn} — скриншот ${index + 1}`" @error="atomicShopHandleImageError">
								</a>
							</div>
						</div>
					</div>
				</div>

				<div class="col-lg-4">
					<Teleport v-if="showTeleport" defer to="#info-pane" :disabled="teleportDisabled || !isMobile">
						<template v-if="item.nameRu">
							<div class="p-3 card-wrapper book-info-card-sticky">
								<div class="card">
									<div v-if="!isMobile" class="card-element book-icon">
										<a :href="prepareCampImage(item.mainImage)" class="screenshot-link">
											<img :src="prepareCampImage(item.mainImage, 512)" :alt="item.nameRu || item.nameEn || 'C.A.M.P. Item'" class="main-image" loading="lazy" @error="atomicShopHandleImageError">
										</a>
									</div>
									<div v-if="categoryInfo" class="card-element">
										<div class="card-subtitle">Категория</div>
										<RouterLink :to="`/f76-camp/category/${categoryInfo.formId}-${categoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchCategory(categoryInfo.formId)">
											{{ categoryInfo.nameRu }}
										</RouterLink>
										<span v-if="subcategoryInfo">
											<svg class="breadcrumb-separator" viewBox="0 0 320 512" fill="currentColor">
												<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
											</svg>
											<RouterLink :to="`/f76-camp/subcategory/${subcategoryInfo.formId}-${subcategoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchSubcategory(subcategoryInfo.formId)">
												{{ subcategoryInfo.nameRu }}
											</RouterLink>
										</span>
									</div>
									<div class="card-element">
										<div class="card-subtitle">Оригинальное название</div>
										{{ item.nameEn || '—' }}
									</div>

									<div class="card-element">
										<div class="card-subtitle">Доступно для постройки</div>
										<div class="camp-placement-badges">
											<span v-for="badge in placementBadges" :key="badge.key" class="camp-placement-badge" :class="{ 'is-available': badge.available }">
												<svg class="camp-placement-icon" viewBox="0 0 448 512" fill="currentColor">
													<path v-if="badge.available" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
													<path v-else d="M376.6 84.5c11.3-13.6 9.4-33.9-4.2-45.3s-33.9-9.4-45.3 4.2L192 206 56.6 43.5C45.3 29.9 25 27.9 11.4 39.3S-4.5 73.2 6.9 86.5L150.3 256 6.9 425.5c-11.3 13.6-9.4 33.9 4.2 45.3s33.9 9.4 45.3-4.2L192 306 327.4 468.5c11.3 13.6 31.6 15.6 45.3 4.2s15.6-31.6 4.2-45.3L233.7 256 376.6 84.5z" />
												</svg>
												{{ badge.label }}
											</span>
										</div>
									</div>
									<div v-if="maximumEntries.length > 0" class="card-element">
										<div class="card-subtitle">Максимальное количество</div>
										<div class="camp-maximum-entries">
											<span v-for="entry in maximumEntries" :key="entry.key" class="camp-maximum-entry">
												{{ entry.label }}: <strong>{{ entry.value != null ? entry.value : '∞' }}</strong>
											</span>
										</div>
									</div>
									<div v-if="!powerGeneratedDisplay" class="card-element">
										<div class="card-subtitle">Требует энергию</div>
										{{ requiresPowerDisplay }}
									</div>
									<div v-if="powerGeneratedDisplay" class="card-element">
										<div class="card-subtitle">Производит энергию</div>
										{{ powerGeneratedDisplay }}
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

								<!--<div class="card components-card" v-if="item.recipe?.components && item.recipe.components.length > 0">
									<F76CampRecipeComponents :components="item.recipe?.components ?? []" />
								</div>-->
							</div>
						</template>
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
	padding: 0.5rem 1.2rem 1.25rem;

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

.components-card {
	margin-top: 1rem;
	padding-top: 0 !important;
	text-align: left;
}

.camp-placement-badges {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.4rem;
}

.camp-placement-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.65rem;
	border-radius: 6px;
	font-size: 0.8rem;
	background: rgba(255, 255, 255, 0.04);
	color: #71717a;

	&.is-available {
		background: rgba(38, 149, 73, 0.15);
		color: #4ade80;
	}
}

.camp-placement-icon {
	width: 0.65rem;
	height: 0.65rem;
	flex-shrink: 0;
}

.camp-maximum-entries {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.3rem 1rem;
	font-size: 0.85rem;
	color: var(--bs-body-color);
}

.camp-maximum-entry {
	font-size: 0.85rem;
}

.camp-maximum-label {
	color: #a1a1aa;
}

.camp-maximum-value {
	color: var(--bs-body-color);
	font-weight: 600;
	margin-left: 0.3rem;
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

.modal-trigger {
	text-decoration: underline dotted;
	text-decoration-color: currentColor;
	text-underline-offset: 4px;
	text-decoration-thickness: 0.5px;

	padding: 0;
	border: none;
	margin-top: -4px;
}

:deep(.support-item-name) {
	background-color: hsl(from #4cb6eb h s l / 10%);
	border: 1px solid hsl(from #4cb6eb h s l / 30%);
	border-radius: 4px;
	padding: 0px 4px;
	cursor: pointer;
	transition: background-color 0.2s ease;
	user-select: none;
	white-space: nowrap;

	&:hover {
		background-color: hsl(from #4cb6eb h s l / 18%);
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
		padding: 0 2.2rem 1.25rem;
	}

	.hide-tab {
		display: block;
	}
}

@media (max-width: 767.98px) {
	.nav-tabs {
		display: flex;
	}

	.screenshots {
		text-align: center;
		padding: 0 1.2rem 1.25rem;
	}

	.book-title {
		font-size: 1.6rem;
	}
}

@media (max-width: 575.98px) {
	.nav-tabs {
		justify-content: space-between;
		flex-wrap: nowrap;
	}

	.nav-tabs .nav-item {
		flex: 0 1 auto;
		min-width: 0;
	}

	.nav-tabs .nav-link {
		min-width: 0;
		white-space: normal;
		padding: 15px clamp(5px, 5vw, 25px);
	}

	.hide-mobile {
		display: none;
	}
}
</style>
