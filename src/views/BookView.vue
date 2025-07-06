<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watchEffect, computed, onServerPrefetch, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareIcon, parsePseudoCode, generateMetaDescription } from '@/utils';
import type { Book } from '@/types';
import { useFetchBook, useFetchCategories, useFetchPatches, usePrefetchBook, usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';
import NotFoundView from '@/views/NotFoundView.vue';
import { useQueryClient } from '@tanstack/vue-query';

const route = useRoute();
const router = useRouter();
const currentBookId = computed(() => Number(route.params.bookId) || 1);
const isNotFound = ref(false);

const state = reactive({
	book: {} as Book,
	prevBook: {} as Book,
	nextBook: {} as Book,
});

const { data: bookData, suspense: bookSuspense, isSuccess: isBookFetched } = useFetchBook(currentBookId);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();
const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();

const updateHead = () => {
	if (state.book && state.book.titleRu) {
		const metaTitle = `${state.book.titleRu} | Библиотека ESO`;
		const metaDescription = generateMetaDescription(state.book.textRu);
		const metaLink = `https://rueso.ru/library/eso/${state.book.id}-${state.book.slug}`;
		const metaIcon = `https://rueso.ru${prepareIcon(state.book.icon)}`;

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
						"name": state.book.titleRu,
						"alternateName": state.book.titleEn,
						"description": metaDescription,
						"datePublished": state.book.created.date,
						"dateModified": state.book.updated.date,
						"image": metaIcon,
						"inLanguage": "ru",
						"url": metaLink
					})
				}
			]
		});
	}
}

const prevNextBook = computed(() => {
	const group = state.book.group ?? [];
	const currentId = currentBookId.value;

	const index = group.findIndex(book => book.id === currentId);

	return {
		prev: index > 0 ? group[index - 1] : {},
		next: index !== -1 && index < group.length - 1 ? group[index + 1] : {}
	};
});

watchEffect(() => {
	if (bookData.value) {
		state.book = bookData.value;
		state.prevBook = prevNextBook.value.prev;
		state.nextBook = prevNextBook.value.next;

		if (!state.book.titleRu) isNotFound.value = true;

		updateHead();
	}
});

onServerPrefetch(async () => {
	await bookSuspense();
	if (bookData.value) {
		state.book = bookData.value;
		state.prevBook = prevNextBook.value.prev;
		state.nextBook = prevNextBook.value.next;

		if (!state.book.titleRu || state.book.titleRu === undefined) isNotFound.value = true;

		updateHead();
	}
});

const queryClient = useQueryClient();
const prefetchBook = (bookId: number) => usePrefetchBook(queryClient, bookId);
const prefetchCategory = (categoryId: number | undefined) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string | undefined) => usePrefetchPatch(queryClient, patchVersion);
</script>

<template>
	<div class="container-xl">
		<NotFoundView v-if="isNotFound" />

		<div v-else-if="Object.keys(state.book).length > 0" class="row">
			<div class="col-lg-8 order-2 order-lg-1">

				<ul class="nav nav-tabs" id="bookTab" role="tablist" style="margin-top: 30px;">
					<li class="nav-item" role="presentation">
						<button class="nav-link active" id="russian-tab" data-bs-toggle="tab" data-bs-target="#russian-pane" type="button" role="tab" aria-controls="russian-pane" aria-selected="true">Русская версия</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" id="english-tab" data-bs-toggle="tab" data-bs-target="#english-pane" type="button" role="tab" aria-controls="english-pane" aria-selected="false">Английская версия</button>
					</li>
				</ul>

				<div class="tab-content" id="categoriesTabContent">
					<div class="tab-pane show active p-3" id="russian-pane" role="tabpanel" aria-labelledby="russian-pane" tabindex="0">
						<h1>{{ state.book.titleRu }}</h1>
						<div class="book-main" v-html="parsePseudoCode((state.book.textRu ?? '').replace(/\n/g, '<br>'))"></div>
					</div>

					<div class="tab-pane p-3" id="english-pane" role="tabpanel" aria-labelledby="english-pane" tabindex="0">
						<h1>{{ state.book.titleEn }}</h1>
						<div class="book-main" v-html="parsePseudoCode((state.book.textEn ?? '').replace(/\n/g, '<br>'))"></div>
					</div>
				</div>

				<div class="d-flex flex-column flex-md-row px-md-3 mb-4 prev-next-container">
					<RouterLink v-if="Object.keys(state.prevBook).length > 0" :to="`/library/eso/${state.prevBook.id}-${state.prevBook.slug}`" type="button" class="btn btn-outline-light mb-2 mb-md-0 me-md-auto prev-button" @mouseenter="prefetchBook(state.prevBook.id)">
						{{ '← ' + state.prevBook.titleRu }}
					</RouterLink>
					<RouterLink v-if="Object.keys(state.nextBook).length > 0" :to="`/library/eso/${state.nextBook.id}-${state.nextBook.slug}`" type="button" class="btn btn-outline-light ms-auto next-button" @mouseenter="prefetchBook(state.nextBook.id)">
						{{ state.nextBook.titleRu + ' →' }}
					</RouterLink>
				</div>
			</div>
			<div class="col-lg-4 order-2 order-lg-2">
				<div class="p-3 card-wrapper">
					<div class="card">
						<div class="card-element">
							<img :src="prepareIcon(state.book.icon)" :alt="state.book.titleRu">
						</div>
						<div class="card-element">
							<div class="card-subtitle">Категория</div>
							<RouterLink :to="`/library/eso/category/${state.book.category?.id}-${state.book.category?.slug}`" @mouseenter="prefetchCategory(state.book.category?.id)">
								{{ state.book.category?.titleRu }}
							</RouterLink>
						</div>
						<div class="card-element">
							<div class="card-subtitle">Оригинальное название</div>
							{{ state.book.titleEn }}
						</div>
						<div class="card-element">
							<div class="card-subtitle">Добавлена</div>
							<RouterLink :to="`/library/eso/patch/${state.book.created.version}-${state.book.created.slug}`" @mouseenter="prefetchPatch(state.book.created.version)">
								Патч <time :datetime="`${state.book.created.date} 00:00`">{{ state.book.created.version }}</time> ({{ state.book.created.nameRu }})
							</RouterLink>
						</div>
						<div v-if="state.book.created.version !== state.book.updated.version" class="card-element">
							<div v-if="state.book.category?.id === 2000" class="card-subtitle">Удалена</div>
							<div v-else class="card-subtitle">Обновлена</div>
							<RouterLink :to="`/library/eso/patch/${state.book.updated.version}-${state.book.updated.slug}`" @mouseenter="prefetchPatch(state.book.updated.version)">
								Патч <time :datetime="`${state.book.updated.date} 00:00`">{{ state.book.updated.version }}</time> ({{ state.book.updated.nameRu }})
							</RouterLink>
						</div>
					</div>
				</div>

				<div v-if="state.book.group && state.book.group.length" class="p-3">
					<div class="card card-book-group">
						<div class="list-group list-group-flush">
							<h5 class="list-group-item h5-list-group-item">Связанные книги</h5>
							<RouterLink v-for="book in state.book.group" :key="book.id" :to="`/library/eso/${book.id}-${book.slug}`" class="list-group-item list-group-item-action" :class="{ 'active': currentBookId === book.id }" @mouseenter="prefetchBook(book.id)">
								{{ book.titleRu }}
							</RouterLink>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
h1 {
	margin: 5px 0 20px;
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
}
</style>
