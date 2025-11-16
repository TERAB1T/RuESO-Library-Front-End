<script setup lang="ts">
import { RouterLink, useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { onMounted, watchEffect, computed, onServerPrefetch, watch, ref, nextTick } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareIcon, parsePseudoCode, generateMetaDescription } from '@/utils';
import { useFetchBook, useFetchCategories, useFetchPatches, usePrefetchBook, usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';
import Breadcrumb from '@/components/Breadcrumb.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize } from '@vueuse/core';

import type { Book, BreadcrumbItem } from '@/types';

const route = useRoute();
const router = useRouter();

const currentBookId = computed(() => Number(route.params.bookId) || 1);

const { data: bookData, suspense: bookSuspense, isSuccess: isBookFetched, isError: isBookError } = useFetchBook(currentBookId);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();
const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();

const book = computed(() => bookData.value ?? {} as Book);

const prevNextBooks = computed(() => {
	const group = book.value.group ?? [];
	const currentId = currentBookId.value;
	const index = group.findIndex(b => b.id === currentId);

	return {
		prev: index > 0 ? group[index - 1] : null,
		next: index !== -1 && index < group.length - 1 ? group[index + 1] : null
	};
});

const prevBook = computed(() => prevNextBooks.value.prev);
const nextBook = computed(() => prevNextBooks.value.next);

const isNotFound = computed(() =>
	isBookFetched.value && !book.value.titleRu
);

const updateMetaTags = (bookData: Book) => {
	const metaTitle = `${bookData.titleRu} | Библиотека ESO`;
	const metaDescription = generateMetaDescription(bookData.textRu);
	const metaLink = `https://rueso.ru/library/eso/${bookData.id}-${bookData.slug}`;
	const metaIcon = `https://rueso.ru${prepareIcon(bookData.icon)}`;

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
			{ property: 'og:type', content: 'book' },
			{ property: 'og:site_name', content: 'RuESO' },

			{ name: 'twitter:title', content: metaTitle },
			{ name: 'twitter:description', content: metaDescription },
			{ name: 'twitter:image', content: metaIcon },
			{ name: 'twitter:card', content: 'summary' },
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
					"name": bookData.titleRu,
					"alternateName": bookData.titleEn,
					"description": metaDescription,
					"datePublished": bookData.created.date,
					"dateModified": bookData.updated.date,
					"image": metaIcon,
					"inLanguage": "ru",
					"url": metaLink
				})
			}
		]
	});
}

watchEffect(() => {
	if (book.value.titleRu) {
		updateMetaTags(book.value);
	}
});

onServerPrefetch(async () => {
	await bookSuspense();
	if (book.value.titleRu) {
		updateMetaTags(book.value);
	}
});

const queryClient = useQueryClient();
const prefetchBook = (bookId: number) => usePrefetchBook(queryClient, bookId);
const prefetchCategory = (categoryId: number | undefined) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string | undefined) => usePrefetchPatch(queryClient, patchVersion);

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
});

const parsedTextRu = computed(() =>
	parsePseudoCode((book.value.textRu ?? '').replace(/\n/g, '<br>'))
);

const parsedTextEn = computed(() =>
	parsePseudoCode((book.value.textEn ?? '').replace(/\n/g, '<br>'))
);

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
	const items: BreadcrumbItem[] = [
		{ label: 'Библиотека TES Online', to: '/library/eso' }
	];

	if (book.value.category) {
		items.push({
			label: book.value.category.titleRu as string,
			to: `/library/eso/category/${book.value.category.id}-${book.value.category.slug}`
		});
	}

	items.push({
		label: book.value.titleRu || 'Загрузка...'
	});

	return items;
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
		<div v-if="!isBookFetched && !isBookError" class="loading-state" style="margin: auto;">
			<!-- TODO: Add skeleton -->
		</div>

		<div v-else-if="isBookError" class="error-state alert alert-danger mt-4">
			<h5>Ошибка загрузки книги</h5>
			<p>Попробуйте обновить страницу или вернуться позже.</p>
		</div>

		<NotFoundView v-else-if="isNotFound" />

		<template v-else>
			<Breadcrumb :items="breadcrumbItems" />
			<div class="row">
				<div class="col-lg-8 order-2 order-lg-1">
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

					<div class="tab-content" id="categoriesTabContent">
						<div class="tab-pane show active p-3" id="russian-pane" role="tabpanel" aria-labelledby="russian-pane" tabindex="0">
							<h1 class="book-title">{{ book.titleRu }}</h1>
							<div class="book-main" v-html="parsedTextRu"></div>
						</div>

						<div class="tab-pane p-3" id="english-pane" role="tabpanel" aria-labelledby="english-pane" tabindex="1">
							<h1 class="book-title">{{ book.titleEn }}</h1>
							<div class="book-main" v-html="parsedTextEn"></div>
						</div>

						<div class="tab-pane p-3" id="info-pane" role="tabpanel" aria-labelledby="info-pane" tabindex="2">
						</div>
					</div>

					<div class="d-flex flex-column flex-md-row mb-4 prev-next-container">
						<RouterLink v-if="prevBook" :to="`/library/eso/${prevBook.id}-${prevBook.slug}`" type="button" class="btn btn-link mb-2 mb-md-0 me-md-auto prev-button" @mouseenter="prefetchBook(prevBook.id)">
							{{ '← ' + prevBook.titleRu }}
						</RouterLink>
						<RouterLink v-if="nextBook" :to="`/library/eso/${nextBook.id}-${nextBook.slug}`" type="button" class="btn btn-link ms-auto next-button" @mouseenter="prefetchBook(nextBook.id)">
							{{ nextBook.titleRu + ' →' }}
						</RouterLink>
					</div>
				</div>
				<div class="col-lg-4 order-2 order-lg-2">
					<Teleport v-if="showTeleport" defer to="#info-pane" :disabled="!isMobile">
						<div class="p-3 card-wrapper" :class="`${book.group && book.group.length ? '' : 'book-info-card-sticky'}`">
							<div class="card">
								<div class="card-element book-icon">
									<img :src="prepareIcon(book.icon)" :alt="book.titleRu">
								</div>
								<div class="card-element">
									<div class="card-subtitle">Категория</div>
									<RouterLink :to="`/library/eso/category/${book.category?.id}-${book.category?.slug}`" @mouseenter="prefetchCategory(book.category?.id)">
										{{ book.category?.titleRu }}
									</RouterLink>
								</div>
								<div class="card-element">
									<div class="card-subtitle">Оригинальное название</div>
									{{ book.titleEn }}
								</div>
								<div class="card-element">
									<div class="card-subtitle">Добавлена</div>
									<RouterLink :to="`/library/eso/patch/${book.created.version}-${book.created.slug}`" @mouseenter="prefetchPatch(book.created.version)">
										Патч <time :datetime="`${book.created.date} 00:00`">{{ book.created.version }}</time> ({{ book.created.nameRu }})
									</RouterLink>
								</div>
								<div v-if="book.created.version !== book.updated.version" class="card-element">
									<div v-if="book.category?.id === 2000" class="card-subtitle">Удалена</div>
									<div v-else class="card-subtitle">Обновлена</div>
									<RouterLink :to="`/library/eso/patch/${book.updated.version}-${book.updated.slug}`" @mouseenter="prefetchPatch(book.updated.version)">
										Патч <time :datetime="`${book.updated.date} 00:00`">{{ book.updated.version }}</time> ({{ book.updated.nameRu }})
									</RouterLink>
								</div>
							</div>
						</div>

						<div v-if="book.group && book.group.length" class="p-3 card-related-books-wrapper">
							<div class="card card-book-group">
								<div class="list-group list-group-flush">
									<h5 class="list-group-item h5-list-group-item">Связанные книги</h5>
									<RouterLink v-for="relatedBook in book.group" :key="relatedBook.id" :to="`/library/eso/${relatedBook.id}-${relatedBook.slug}`" class="list-group-item list-group-item-action" :class="{ 'active': currentBookId === relatedBook.id }" @mouseenter="prefetchBook(relatedBook.id)">
										{{ relatedBook.titleRu }}
									</RouterLink>
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
.tab-content {
	padding: 0.5rem 1.2rem 0.2rem;
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

.card {
	padding: 1.25rem !important;
	text-align: center;
	margin: 0 0 0 15px;
	border: none;
	background: var(--bs-block-bg);
}

.card-book-group {
	padding: 5px 0 5px;
	text-align: left;
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

.list-group {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}

.h5-list-group-item {
	padding: 0;
	font-size: 1.125rem;
	text-align: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	padding-bottom: 20px;
	background: none;
}

.list-group-item-action {
	background: none;
	border: none;
	padding: 0.75rem 1rem;
	border-radius: 6px;
	text-decoration: none;
	color: var(--bs-body-color);
	font-size: 0.9375rem;
	line-height: normal;

	&:hover {
		background: none;
		color: var(--bs-primary);
		transition: color 0.2s;
	}

	&.active {
		background: var(--bs-primary);
		color: #27272a;
		font-weight: 500;
		pointer-events: none;
	}
}

.prev-next-container {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	margin-top: 1.2rem;
}

.prev-next-container .btn {
	text-decoration: none;
	font-weight: 500;

	&:hover {
		color: var(--bs-primary);
		text-decoration: none;
		background: color-mix(in srgb, var(--bs-primary), transparent 96%);
	}

	&:active {
		color: var(--bs-primary);
		background: color-mix(in srgb, var(--bs-primary), transparent 84%);
	}
}

.book-info-card-sticky {
	position: sticky;
	top: 90px;
}

@media (max-width: 991.98px) {
	.card-wrapper {
		margin-top: 0;
		padding: 0 0 10px !important;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.card-related-books-wrapper {
		margin-top: 20px;
		padding: 0 !important;
	}

	.card {
		margin: 0;
		padding: 0 !important;
	}

	.hide-tab {
		display: block;
	}
}

@media (max-width: 767.98px) {
	.next-button {
		width: 100%;
	}

	.nav-tabs {
		display: flex;
	}

	.prev-next-container {
		gap: 0;
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
