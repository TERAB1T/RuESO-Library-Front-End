<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { onMounted, onBeforeUnmount, computed, onServerPrefetch, watch, ref, nextTick } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareAtomicShopImage, prepareAtomicShopVideo, generateMetaDescriptionAtomicShop, atomicShopHandleImageError } from '@/utils';
import { useFetchAtomicShopItem, useFetchAtomicShopCategories } from '@/composables/useApi';
import F76AtomicShopCampUnlocked from '@/components/F76AtomicShopCampUnlocked.vue';
import F76AtomicShopInfoCard from '@/components/F76AtomicShopInfoCard.vue';
import F76ItemGallery from '@/components/F76ItemGallery.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import { useSupportText } from '@/composables/useSupportText';
import { useCopyOnClick } from '@/composables/useCopyOnClick';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

import type { ReactiveHead } from '@unhead/vue';
import type { AtomicShopItem, AtomicShopCategoryWithSubcategories, BreadcrumbItem, ItemGallerySlide } from '@/types';

const route = useRoute();

// Loading skeleton: line widths of the description and the info card labels, which are static.
const SKELETON_TEXT_LINES = ['col-12', 'col-11', 'col-12', 'col-9', 'col-10', 'col-6'];
const SKELETON_INFO_LABELS = ['Категория', 'Оригинальное название', 'Form ID', 'Editor ID'];

const LANGS = ['ru', 'en'] as const;
const PTS_NOTICE = {
	ru: 'Сейчас этот предмет доступен только на публичном тестовом сервере.',
	en: 'This item is currently available only on the Public Test Server.',
};

let lightbox: PhotoSwipeLightbox | null = null;
let BootstrapModal: any = null;

const currentItemFormId = computed(() => ((route.params.itemFormId || '') as string).toLowerCase());

const { data: itemData, suspense: itemSuspense, isSuccess: isItemFetched, isError: isItemError } = useFetchAtomicShopItem(currentItemFormId);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchAtomicShopCategories();

const item = computed(() => itemData.value ?? {} as AtomicShopItem);
const categories = computed(() => categoriesData.value ?? [] as AtomicShopCategoryWithSubcategories[]);

const { generateSupportText, generateSupportListText } = useSupportText(item);

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

// A computed rather than a getter: during SSR unhead unwraps only refs.
const headInput = computed((): ReactiveHead => {
	const itemData = item.value;
	if (!itemData.nameRu) return {};

	let metaTitle = `${itemData.nameRu} | Атомная лавка Fallout 76`;
	let metaDescription = generateMetaDescriptionAtomicShop(itemData.descriptionRu as string);
	let metaLink = `https://rueso.ru/f76-atomic-shop/${itemData.formId}-${itemData.slug}`;
	let metaIcon = `https://rueso.ru${prepareAtomicShopImage(itemData.mainImage?.replace(".avif", ".webp"))}`;

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

	return screenshotsArray.map(s => prepareAtomicShopImage(s));
});

// Desktop only: on mobile the gallery is the slider above the text.
const hasGallery = computed(() => splittedScreenshots.value.length > 0);

const gallerySlides = computed((): ItemGallerySlide[] => {
	const name = item.value.nameRu || item.value.nameEn;
	const mainImage = prepareAtomicShopImage(item.value.mainImage);

	return [
		{ href: mainImage, src: mainImage, alt: name || 'Atomic Shop Item' },
		...splittedScreenshots.value.map((screenshot, index) => ({ href: screenshot, src: screenshot, alt: `${name} - скриншот ${index + 1}` })),
	];
});

const videoRef = ref<HTMLVideoElement | null>(null);
let videoObserver: IntersectionObserver | null = null;

// The video sits at the bottom of the page, so it plays only while on screen.
// It is keyed by item, so moving to another item yields a fresh element and a fresh observer.
watch(videoRef, (video) => {
	videoObserver?.disconnect();
	if (!video) return;

	video.muted = true;
	videoObserver = new IntersectionObserver(([entry]) => {
		if (entry?.isIntersecting) video.play().catch(() => {});
		else video.pause();
	}, { threshold: 0.25 });
	videoObserver.observe(video);
});

onBeforeUnmount(() => videoObserver?.disconnect());

const parsedText = computed(() => ({
	ru: (item.value.descriptionRu ?? '').replace(/\n/g, '<br>'),
	en: (item.value.descriptionEn ?? '').replace(/\n/g, '<br>'),
}));

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

const copyContainerRef = ref<HTMLElement | null>(null);
useCopyOnClick(copyContainerRef);
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
			<div class="modal fade" id="supportModal" tabindex="-1" aria-labelledby="supportModal" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered modal-lg">
					<div class="modal-content">
						<div class="modal-header" style="padding:20px 30px 20px;">
							<h1 class="modal-title fs-5" id="staticBackdropLabel">
								<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-headset" viewBox="0 0 16 16">
									<path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5" />
								</svg>
								<span style="margin-left: 15px;">Покупка предмета в службе поддержки</span>
							</h1>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
						</div>
						<div class="modal-body" style="padding:30px 30px 20px;" ref="copyContainerRef">
							<p v-html="generateSupportText"></p>
							<ol>
								<li>Перейдите на страницу <a href="https://help.bethesda.net/#ru/home/product/1129/category/14" target="_blank" rel="noopener noreferrer">службы поддержки Bethesda</a>.</li>
								<li>Выберите свою платформу (например, Steam).</li>
								<li>Выберите подкатегорию «Мне нужна помощь с Атомной лавкой».</li>
								<li>Выберите «Да».</li>
								<li>Выберите «Я хочу приобрести себе предмет из Атомной лавки».<ul>
										<li>Если вы не были авторизованы, на этом этапе вам будет предложено войти в учетную запись Bethesda.</li>
									</ul>
								</li>
								<li>В поле «Платформа» снова выберите свою платформу (например, Steam).</li>
								<li v-html="generateSupportListText"></li>
								<li>Нажмите «Отправить».</li>
								<li>В течение нескольких минут на вашу электронную почту придет письмо. Следуйте инструкциям в нем, чтобы завершить покупку.</li>
							</ol>
							<div class="alert alert-info" role="alert">
								<strong>Внимание!</strong> На сайте возможны неточности. Тщательно проверяйте все названия и цены во время оформления заказа. Если вы обнаружили ошибку, пожалуйста, сообщите об этом в <a href="https://discord.com/users/304996291765600258" target="_blank">Discord</a>.
							</div>
						</div>
					</div>
				</div>
			</div>

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

					<div class="tab-content" :class="{ 'with-screenshots': hasGallery || item.video, 'with-video': item.video }" id="item-content" role="tabpanel" :aria-labelledby="`${lang}-tab`">
						<div class="p-3">
							<h1 v-show="lang === 'ru'" class="book-title">{{ item.nameRu }}</h1>
							<h1 v-show="lang === 'en'" class="book-title">{{ item.nameEn }}</h1>

							<!-- Mobile: images and the info card come before the text; desktop shows them beside and below it. -->
							<div class="item-media d-lg-none">
								<F76ItemGallery class="item-media-gallery" :slides="gallerySlides" />
								<F76AtomicShopInfoCard :item="item" :category-info="categoryInfo" :subcategory-info="subcategoryInfo" />
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
								<F76AtomicShopCampUnlocked :key="item.formId" :camp-unlocked-items="item.campUnlockedItems" :lang="l" />
							</div>
						</div>
					</div>

					<!-- On mobile the gallery is the slider above, so only the video remains here. -->
					<div v-if="hasGallery || item.video" class="screenshots" :class="{ 'd-none d-lg-block': !item.video }">
						<div v-if="hasGallery" class="desktop-gallery d-none d-lg-block">
							<div class="fo-sect-h">
								<span class="fo-bar"></span>
								<h3 class="fo-h3">Галерея</h3>
							</div>
							<div class="row g-3">
								<div v-for="(screenshot, index) in splittedScreenshots" :key="index" class="col-12 col-md-4">
									<a :href="screenshot" class="screenshot-link">
										<img :src="screenshot" class="img-fluid screenshot-img" :alt="`${item.nameRu || item.nameEn} - скриншот ${index + 1}`" loading="lazy" @error="atomicShopHandleImageError">
									</a>
								</div>
							</div>
						</div>
						<div v-if="item.video" class="item-video-section">
							<div class="fo-sect-h">
								<span class="fo-bar"></span>
								<h3 class="fo-h3">Видео</h3>
							</div>
							<video :key="item.formId" ref="videoRef" class="item-video" :src="prepareAtomicShopVideo(item.video)" muted loop controls playsinline preload="auto"></video>
						</div>
					</div>
				</div>

				<div class="col-lg-4 d-none d-lg-block">
					<F76AtomicShopInfoCard :item="item" :category-info="categoryInfo" :subcategory-info="subcategoryInfo" with-image />
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
// For the info card skeleton, which mirrors F76AtomicShopInfoCard.
@use '@/assets/styles/f76-info-card';

.tab-content {
	padding: 0.5rem 1.2rem 1rem;
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

/* Videos are either 1:1 or 16:9; capping the height suits both without knowing the ratio in advance. */
.item-video {
	display: block;
	margin: 0 auto;
	max-width: 100%;
	max-height: 540px;
	border-radius: 8px;
	background: #000;
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

// The screenshots block joins the text block from below: on desktop when it has a gallery or a video,
// on mobile only for the video (the gallery is the slider there).
@media (min-width: 992px) {
	.tab-content.with-screenshots {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.desktop-gallery + .item-video-section {
		margin-top: 2rem;
	}
}

@media (max-width: 991.98px) {
	.tab-content.with-video {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.book-title {
		margin-bottom: 1rem;
	}

	.screenshots {
		padding: 0 2.2rem 1.25rem;
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
