<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { onMounted, computed, onServerPrefetch, watch, ref, nextTick } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareCampImage, prepareAtomicShopImage, generateMetaDescription, generateMetaDescriptionAtomicShop, atomicShopHandleImageError } from '@/utils';
import { useFetchCampItem, useFetchCampCategories } from '@/composables/useApi';
import Breadcrumb from '@/components/Breadcrumb.vue';
import F76CampUnlockConditions from '@/components/F76CampUnlockConditions.vue';
import F76CampBuffs from '@/components/F76CampBuffs.vue';
import F76CampProducesTable from '@/components/F76CampProducesTable.vue';
import F76CampRecipeVariants from '@/components/F76CampRecipeVariants.vue';
import F76CampDisplayTable from '@/components/F76CampDisplayTable.vue';
import F76CampPowerInfo from '@/components/F76CampPowerInfo.vue';
import F76CampSharedLimit from '@/components/F76CampSharedLimit.vue';
import F76CampStorage from '@/components/F76CampStorage.vue';
import F76CampInfoCard from '@/components/F76CampInfoCard.vue';
import F76ItemGallery from '@/components/F76ItemGallery.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

import type { ReactiveHead } from '@unhead/vue';
import type { CampItemWithRelations, CampCategoryWithSubcategories, BreadcrumbItem, ItemGallerySlide } from '@/types';

const route = useRoute();

// Loading skeleton: line widths of the description and the info card labels, which are static.
const SKELETON_TEXT_LINES = ['col-12', 'col-11', 'col-12', 'col-9', 'col-10', 'col-6'];
const SKELETON_INFO_LABELS = ['Категория', 'Оригинальное название', 'Доступно для постройки', 'Требует энергию', 'Form ID', 'Editor ID'];

const LANGS = ['ru', 'en'] as const;
const PTS_NOTICE = {
	ru: 'Сейчас этот предмет доступен только на публичном тестовом сервере.',
	en: 'This item is currently available only on the Public Test Server.',
};

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

// A computed rather than a getter: during SSR unhead unwraps only refs.
const headInput = computed((): ReactiveHead => {
	const itemData = item.value;
	if (!itemData.nameRu) return {};

	let metaTitle = `${itemData.nameRu} | C.A.M.P. F76`;
	let metaDescription = generateMetaDescriptionAtomicShop(itemData.shopInfo?.descriptionRu || itemData.descriptionRu || itemData.recipe?.descriptionRu || '');
	if (!metaDescription) {
		// Without any game text the description is built from the item's data, so pages don't get identical or empty snippets.
		const facts = [`${itemData.nameRu} — объект${itemData.category?.nameRu ? ` из раздела «${itemData.category.nameRu}»` : ''} для C.A.M.P. в Fallout 76.`];
		if (itemData.powerGenerated > 0) facts.push(`Вырабатывает ${itemData.powerGenerated} ед. энергии.`);
		else if (itemData.requiresPower && itemData.powerRequired > 0) facts.push(`Потребляет ${itemData.powerRequired} ед. энергии.`);
		metaDescription = generateMetaDescription(facts.join(' '));
	}
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

	return {
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
				innerHTML: JSON.stringify({
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
				innerHTML: JSON.stringify(breadcrumbSchema)
			}
		]
	};
});

useHead(headInput);

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

			// A screenshot's thumbnail is the full file, so its natural size is already known before the first open.
			const thumb = (itemData.element as HTMLAnchorElement | undefined)?.querySelector('img');
			if (thumb && thumb.naturalWidth && thumb.currentSrc === imgSrc) {
				sizeCache.set(imgSrc, { width: thumb.naturalWidth, height: thumb.naturalHeight });
			}

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

onServerPrefetch(async () => {
	await itemSuspense();
	await categoriesSuspense();
});

const lang = ref<'ru' | 'en'>('ru');

onMounted(async () => {
	const { Modal } = await import("bootstrap");
	BootstrapModal = Modal;

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

const shopScreenshots = computed(() => (item.value.shopInfo?.screenshots ?? []).map(s => prepareAtomicShopImage(s)));

const hasShopSetNote = computed(() => shopScreenshots.value.length > 0 && !!item.value.shopInfo?.isSet);

// Desktop only: on mobile the gallery is the slider above the text.
const hasScreenshotsBlock = computed(() => splittedScreenshots.value.length > 0 || shopScreenshots.value.length > 0);

const gallerySlides = computed((): ItemGallerySlide[] => {
	const name = item.value.nameRu || item.value.nameEn;
	const mainImage = prepareCampImage(item.value.mainImage);
	const mainThumb = prepareCampImage(item.value.mainImage, 512);

	return [
		{
			href: mainImage,
			src: mainThumb,
			srcset: item.value.mainImage ? `${mainThumb} 512w, ${mainImage} 1440w` : undefined,
			alt: name || 'C.A.M.P. Item',
		},
		...splittedScreenshots.value.map((screenshot, index) => ({ href: screenshot, src: screenshot, alt: `${name} — скриншот ${index + 1}` })),
		...shopScreenshots.value.map((screenshot, index) => ({ href: screenshot, src: screenshot, alt: `${name} - скриншот из магазина ${index + 1}` })),
	];
});

const SURFACE_RULE = {
	dirt: { ru: 'Можно разместить только на земле.', en: 'Can only be placed in dirt.' },
	water: { ru: 'Можно разместить только в воде.', en: 'Can only be placed in water.' },
};

// One description: the shop text first, then the game's own (or the recipe's) text, then the placement rule.
const parsedText = computed(() => {
	const { descriptionRu, descriptionEn, recipe, shopInfo, surface } = item.value;
	const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join('\n\n').replace(/\n/g, '<br>');
	return {
		ru: join(shopInfo?.descriptionRu || shopInfo?.descriptionEn, descriptionRu || recipe?.descriptionRu, surface && SURFACE_RULE[surface].ru),
		en: join(shopInfo?.descriptionEn || shopInfo?.descriptionRu, descriptionEn || recipe?.descriptionEn, surface && SURFACE_RULE[surface].en),
	};
});

const SHOP_SET_WARNING = {
	ru: 'Часть этого описания относится ко всему набору из магазина, а не к отдельному предмету.',
	en: 'Part of this description applies to the whole shop bundle, not to an individual item.',
};
const hasShopDescriptionSetNote = computed(() => !!item.value.shopInfo?.isSet && !!(item.value.shopInfo.descriptionRu || item.value.shopInfo.descriptionEn));

watch(() => item.value.mainImage, () => {
	initLightbox();
});

onBeforeRouteLeave(() => {
	if (BootstrapModal) {
		const modalEl = document.getElementById('supportModal');
		const modal = modalEl ? BootstrapModal.getInstance(modalEl) : null;
		modal?.hide();
	}

	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}
});
</script>

<template>
	<div class="container-xl">
		<div v-if="!isItemFetched && !isItemError" class="skeleton placeholder-glow">
			<span class="visually-hidden" role="status">Загрузка…</span>
			<Breadcrumb :items="breadcrumbItems" />

			<div class="row" aria-hidden="true">
				<div class="col-lg-8">
					<ul class="nav nav-tabs">
						<li class="nav-item"><span class="nav-link active">Русская<span class="hide-mobile"> версия</span></span></li>
						<li class="nav-item"><span class="nav-link">Английская<span class="hide-mobile"> версия</span></span></li>
					</ul>

					<div class="tab-content">
						<div class="p-3">
							<h1 class="book-title"><span class="placeholder col-7"></span></h1>
							<div class="item-media d-lg-none">
								<span class="placeholder skeleton-square skeleton-slide"></span>
								<div class="card">
									<div v-for="label in SKELETON_INFO_LABELS" :key="label" class="card-element">
										<div class="card-subtitle">{{ label }}</div>
										<span class="placeholder col-4"></span>
									</div>
								</div>
							</div>
							<div class="book-main">
								<div v-for="(width, index) in SKELETON_TEXT_LINES" :key="index"><span class="placeholder" :class="width"></span></div>
							</div>
						</div>
					</div>
				</div>

				<div class="col-lg-4 d-none d-lg-block">
					<div class="p-3 card-wrapper book-info-card-sticky">
						<div class="card">
							<div class="card-element book-icon"><span class="placeholder skeleton-main-image"></span></div>
							<div v-for="label in SKELETON_INFO_LABELS" :key="label" class="card-element">
								<div class="card-subtitle">{{ label }}</div>
								<span class="placeholder col-6"></span>
							</div>
						</div>
					</div>
				</div>
			</div>
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
					<ul class="nav nav-tabs" role="tablist">
						<li class="nav-item" role="presentation">
							<button class="nav-link" :class="{ active: lang === 'ru' }" id="ru-tab" type="button" role="tab" aria-controls="item-content" :aria-selected="lang === 'ru'" @click="lang = 'ru'">Русская<span class="hide-mobile"> версия</span></button>
						</li>
						<li class="nav-item" role="presentation">
							<button class="nav-link" :class="{ active: lang === 'en' }" id="en-tab" type="button" role="tab" aria-controls="item-content" :aria-selected="lang === 'en'" @click="lang = 'en'">Английская<span class="hide-mobile"> версия</span></button>
						</li>
					</ul>

					<div class="tab-content" :class="{ 'with-screenshots': hasScreenshotsBlock }" id="item-content" role="tabpanel" :aria-labelledby="`${lang}-tab`">
						<div class="p-3">
							<h1 v-show="lang === 'ru'" class="book-title">{{ item.nameRu }}</h1>
							<h1 v-show="lang === 'en'" class="book-title">{{ item.nameEn }}</h1>

							<!-- Mobile: images and the info card come before the text; desktop shows them beside and below it. -->
							<div class="item-media d-lg-none">
								<F76ItemGallery class="item-media-gallery" :slides="gallerySlides" :note="hasShopSetNote ? 'Скриншоты из магазина относятся ко всему набору, а не к отдельному предмету.' : undefined" />
								<F76CampInfoCard :item="item" :category-info="categoryInfo" :subcategory-info="subcategoryInfo" />
							</div>

							<!-- Both languages stay in the server HTML; the tabs only toggle visibility. -->
							<div v-for="l in LANGS" v-show="lang === l" :key="l">
								<div v-if="item.isPTS" class="alert alert-info atomic-shop-card" role="alert">
									<div class="pts-badge-wrapper" style="top:calc(50% - 20px);">
										<div class="pts-badge">PTS</div>
									</div>
									<div style="margin-left:55px;">{{ PTS_NOTICE[l] }}</div>
								</div>
								<div class="book-main" v-html="parsedText[l]"></div>
								<div v-if="hasShopDescriptionSetNote" class="shop-description-note">{{ SHOP_SET_WARNING[l] }}</div>

								<F76CampUnlockConditions :learn-conditions="item.learnConditions" :unlocked-by-entitlements="item.unlockedByEntitlements" :lang="l" />
								<F76CampBuffs :buffs="item.buffs" :arcade-game="item.arcadeGame" :lang="l" />
								<F76CampProducesTable :produces="item.produces" :carry-weight="item.carryWeight" :spoil-rate="item.spoilRate" :lang="l" />
								<F76CampDisplayTable :display="item.display" :lang="l" />
								<F76CampStorage :storage="item.storage" :spoil-rate="item.spoilRate" :lang="l" />
								<F76CampPowerInfo :requires-power="item.requiresPower" :power-required="item.powerRequired" :power-connectable="item.powerConnectable" :power-generated="item.powerGenerated" :power-radiated="item.powerRadiated" :lang="l" />
								<F76CampRecipeVariants :key="item.formId" :recipe="item.recipe" :recipe-items="item.recipeItems" :lang="l" />
								<F76CampSharedLimit :key="item.formId" :shared-limit="item.sharedLimit" :lang="l" />
							</div>
						</div>
					</div>

					<div v-if="hasScreenshotsBlock" class="screenshots d-none d-lg-block">
						<div class="fo-sect-h">
							<span class="fo-bar"></span>
							<h3 class="fo-h3">Галерея{{ hasShopSetNote ? '*' : '' }}</h3>
						</div>
						<div class="row g-3">
							<div v-for="(screenshot, index) in splittedScreenshots" :key="index" class="col-12 col-md-4">
								<a :href="screenshot" class="screenshot-link">
									<img :src="screenshot" class="img-fluid screenshot-img" :alt="`${item.nameRu || item.nameEn} — скриншот ${index + 1}`" loading="lazy" @error="atomicShopHandleImageError">
								</a>
							</div>
							<div v-for="(screenshot, index) in shopScreenshots" :key="`shop-${index}`" class="col-12 col-md-4">
								<a :href="screenshot" class="screenshot-link">
									<img :src="screenshot" class="img-fluid screenshot-img" :alt="`${item.nameRu || item.nameEn} - скриншот из магазина ${index + 1}`" loading="lazy" @error="atomicShopHandleImageError">
								</a>
							</div>
						</div>
						<div v-if="hasShopSetNote" class="shop-note">
							*&nbsp;Эти скриншоты относятся ко всему набору из магазина, а не к отдельному предмету.
						</div>
					</div>
				</div>

				<div class="col-lg-4 d-none d-lg-block">
					<F76CampInfoCard :item="item" :category-info="categoryInfo" :subcategory-info="subcategoryInfo" with-image />
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
// For the info card skeleton, which mirrors F76CampInfoCard.
@use '@/assets/styles/f76-info-card';

.tab-content {
	padding: 0.5rem 1.2rem 1.25rem;
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

.item-media {
	margin-bottom: 1.5rem;
	padding-bottom: 0.4rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.item-media-gallery {
	margin-bottom: 0.75rem;
}

.skeleton-slide {
	width: min(100%, 26rem);
	margin-bottom: 0.75rem;
}

.screenshots {
	padding: 0 2.25rem 2.25rem;
	background: var(--bs-block-bg);
	border-bottom-left-radius: 12px;
	border-bottom-right-radius: 12px;
}

.shop-description-note {
	margin-top: 1rem;
	font-size: 0.9rem;
	line-height: 1.4;
	font-style: italic;
	color: #a1a1aa;
}

.shop-note {
	margin-top: 1rem;
	font-size: 0.9rem;
	line-height: 1.4;
	font-style: italic;
	color: #a1a1aa;
	text-align: left;
}

.book-main .alert {
	font-size: 14px;
	line-height: 1.5;
	color: #ffffff;
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

// The screenshots block below joins the text block only on desktop; on mobile it's hidden.
@media (min-width: 992px) {
	.tab-content.with-screenshots {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
}

@media (max-width: 991.98px) {
	.book-title {
		margin-bottom: 1rem;
	}
}

@media (max-width: 767.98px) {
	.nav-tabs {
		display: flex;
	}

	.book-title {
		font-size: 1.6rem;
	}
}

@media (max-width: 575.98px) {
	.nav-tabs {
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
