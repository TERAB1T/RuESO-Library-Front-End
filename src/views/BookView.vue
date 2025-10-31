<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watchEffect, computed, onServerPrefetch, watch, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareIcon, parsePseudoCode, generateMetaDescription } from '@/utils';
import type { Book } from '@/types';
import { useFetchBook, useFetchCategories, useFetchPatches, usePrefetchBook, usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';
import NotFoundView from '@/views/NotFoundView.vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize, useDebounceFn } from '@vueuse/core';
import { Tab } from 'bootstrap';

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

			{ name: 'og:title', content: metaTitle },
			{ name: 'og:description', content: metaDescription },
			{ name: 'og:image', content: metaIcon },
			{ name: 'og:url', content: metaLink },
			{ name: 'og:locale', content: 'ru_RU' },
			{ name: 'og:type', content: 'book' },
			{ name: 'og:site_name', content: 'RuESO' },

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
});

const queryClient = useQueryClient();
const prefetchBook = (bookId: number) => usePrefetchBook(queryClient, bookId);
const prefetchCategory = (categoryId: number | undefined) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string | undefined) => usePrefetchPatch(queryClient, patchVersion);

// TODO: Tabs
const { width } = useWindowSize();
const isMobile = computed(() => width.value <= 991);
const infoTabTrigger = ref<HTMLElement | null>(null);

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
</script>

<template>
	<div class="container-xl">
		<div v-if="!isBookFetched && !isBookError" class="loading-state" style="margin: auto;">
			<!-- TODO: Add spinner -->
		</div>

		<div v-else-if="isBookError" class="error-state">
			Ошибка загрузки книги <!-- TODO: Add error message -->
		</div>

		<NotFoundView v-else-if="isNotFound" />

		<div v-else class="row">
			<div class="col-lg-8 order-2 order-lg-1">
				<ul class="nav nav-tabs" id="bookTab" role="tablist" style="margin-top: 30px;">
					<li class="nav-item" role="presentation">
						<button class="nav-link active" id="russian-tab" data-bs-toggle="tab" data-bs-target="#russian-pane" type="button" role="tab" aria-controls="russian-pane" aria-selected="true">Русская<span class="hide-mobile"> версия</span></button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" id="english-tab" data-bs-toggle="tab" data-bs-target="#english-pane" type="button" role="tab" aria-controls="english-pane" aria-selected="false">Английская<span class="hide-mobile"> версия</span></button>
					</li>
					<li class="nav-item" :class="isMobile ? '' : 'hide-tab'" role="presentation">
						<button ref="infoTabTrigger" class="nav-link" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab" aria-controls="info-pane" aria-selected="false">Информация</button>
					</li>
				</ul>

				<div class="tab-content" id="categoriesTabContent">
					<div class="tab-pane show active p-3" id="russian-pane" role="tabpanel" aria-labelledby="russian-pane" tabindex="0">
						<h1 class="book-title">{{ book.titleRu }}</h1>
						<div class="book-main" v-html="parsePseudoCode((book.textRu ?? '').replace(/\n/g, '<br>'))"></div>
					</div>

					<div class="tab-pane p-3" id="english-pane" role="tabpanel" aria-labelledby="english-pane" tabindex="1">
						<h1 class="book-title">{{ book.titleEn }}</h1>
						<div class="book-main" v-html="parsePseudoCode((book.textEn ?? '').replace(/\n/g, '<br>'))"></div>
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
				<Teleport defer to="#info-pane" :disabled="!isMobile">
					<div class="p-3 card-wrapper" :class="`${book.group && book.group.length ? '' : 'book-info-card-sticky'}`">
						<div class="card">
							<div class="card-element">
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

					<div v-if="book.group && book.group.length" class="p-3">
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
	margin-top: 20px;
}

.card {
	padding: 5px 0 0;
	text-align: center;
	margin: 0 30px;
}

.card-book-group {
	padding: 5px 0 5px;
	text-align: left;
}

.card-element {
	padding: 13px;
}

.card-element:nth-child(even) {
	background-color: #222433;
}

.card-subtitle {
	font-size: 13px;
	margin-bottom: 0;
	color: #ffffff79;
}

.book-main .alert {
	font-size: 14px;
	line-height: 1.5;
	color: #ffffff;
}

.h5-list-group-item {
	margin-bottom: 0;
	text-align: center;
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
	}

	.card {
		margin: 0;
	}
}

@media (max-width: 767.98px) {
	.next-button {
		width: 100%;
	}

	.nav-tabs {
		display: flex;
	}

	.nav-tabs .nav-item {
		width: 33.33%;
	}

	.nav-tabs  .nav-link {
		width: 100%;
	}

	.hide-mobile {
		display: none;
	}

	.prev-next-container {
		gap: 0;
	}
}
</style>
