<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch, ref } from 'vue';
import { prepareIcon, formatDateToMonthYear, lowercaseFirstLetter } from '@/utils';
import Pagination from '@/components/Pagination.vue';
import { useFetchBooks, usePrefetchBook } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';

import type { Book, Category, Patch } from '@/types';

const route = useRoute();
const router = useRouter();

const props = defineProps<{
	categories: any[]
	patches: any[]
}>();

const getCategoryById = (id: number): Category | undefined =>
	props.categories.find(category => category.id === id);

const categoryInfo = computed(() =>
	getCategoryById(state.currentCategory.id)
);

const getPatchByVersion = (version: string): Patch | undefined =>
	props.patches.find(patch => patch.version === version);

const patchInfo = computed(() =>
	getPatchByVersion(state.currentPatch.version)
);

const state = reactive({
	books: [] as Book[],
	categories: [] as Category[],
	currentCategory: {
		id: Number(route.params.categoryId) ?? -1,
		titleRu: '',
		descRu: ''
	},
	currentPatch: {
		version: route.params.patchVersion ?? '-1',
		nameRu: '',
		date: ''
	},
	isLoading: true,
	pageSize: 50,
	totalPages: 1
});

const currentPage = computed(() => Number(route.query.page) || 1);
const currentCategory = computed(() => Number(route.params.categoryId) || -1);
const currentPatch = computed(() => route.params.patchVersion || '-1');

const filter = ref('');

const { data: booksData, suspense: booksSuspense, isSuccess: isBooksFetched } = useFetchBooks(currentCategory, currentPatch, currentPage, state.pageSize, filter);

watchEffect(async () => {
	if (booksData.value) {
		state.books = booksData.value.books ?? [];
		state.categories = booksData.value.categories ?? [];
		state.totalPages = booksData.value.pagination?.total_pages ?? 1;

		state.currentCategory.titleRu = booksData.value.titleRu ?? '';
		state.currentCategory.descRu = booksData.value.descRu ?? '';

		state.currentPatch.nameRu = booksData.value.nameRu ?? '';
		state.currentPatch.date = booksData.value.date ?? '';
	}
});

onServerPrefetch(async () => {
	await booksSuspense();
	if (booksData.value) {
		state.books = booksData.value.books ?? [];
		state.categories = booksData.value.categories ?? [];
		state.totalPages = booksData.value.pagination?.total_pages ?? 1;

		state.currentCategory.titleRu = booksData.value.titleRu ?? '';
		state.currentCategory.descRu = booksData.value.descRu ?? '';

		state.currentPatch.nameRu = booksData.value.nameRu ?? '';
		state.currentPatch.date = booksData.value.date ?? '';
	}
});

watch(
	() => [route.params.categoryId, route.query.page],
	([newCategoryId]) => {
		state.currentCategory.id = Number(newCategoryId) ?? -1;
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

watch(
	() => [route.params.patchVersion, route.query.page],
	([newPatchVersion]) => {
		state.currentPatch.version = newPatchVersion ?? '-1';
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

const changePage = (newPage: number) => {
	if (newPage > 0 && newPage <= state.totalPages) {
		router.push({ query: { ...route.query, page: newPage } });
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	}
};

const queryClient = useQueryClient();
const prefetchBook = (bookId: number) => usePrefetchBook(queryClient, bookId);

const onChangeFilter = useDebounceFn((textFilter: string) => {
	if (!textFilter || textFilter.length < 3) {
		filter.value = '';
	} else {
		filter.value = encodeURI(textFilter);
	}

	if (currentPage.value !== 1) {
		router.push({ query: { ...route.query, page: 1 } });
	}
}, 300);
</script>

<template>
	<template v-if="state.currentCategory.id > 0 && categoryInfo?.titleRu">
		<h2>Библиотека ESO: {{ lowercaseFirstLetter(categoryInfo?.titleRu) }}<div class="h2-subtitle">{{ categoryInfo?.titleEn }}</div></h2>

		<div class="alert alert-dark" role="alert">
			{{ categoryInfo?.descRu }}
		</div>
	</template>

	<template v-else-if="state.currentPatch.version !== '-1' && patchInfo?.nameRu">
		<h2>Библиотека ESO: {{ patchInfo?.nameRu }}</h2>

		<div class="alert alert-dark" role="alert">
			Книги, добавленные в игру с патчем {{ state.currentPatch.version }}, который {{ formatDateToMonthYear(patchInfo?.date) }}.
		</div>
	</template>

	<template v-else>
		<h2>Библиотека The Elder Scrolls Online</h2>

		<div class="alert alert-dark" role="alert">
			Полное собрание книг из игры The Elder Scrolls Online.
		</div>
	</template>

	<input type="search" class="form-control form-control-lg" id="library-filter" placeholder="Фильтр по названию" autocomplete="off" @input="onChangeFilter($event.target.value)">

	<TransitionGroup v-if="!state.categories.length" class="list-group list-group-flush" name="list" tag="div">
		<RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/eso/${book.id}-${book.slug}`" @mouseenter="prefetchBook(book.id)">
			<div class="row align-items-center g-3 booklist-row">
				<div class="col-auto booklist-left"><img class="me-2" :src="prepareIcon(book.icon)" width="64" height="64" :alt="book.titleRu"></div>
				<div class="col-auto d-flex flex-column justify-content-center booklist-right">
					<div class="box">{{ book.titleRu }}</div>
					<div class="box booklist-desc">{{ book.titleEn }}</div>
				</div>
			</div>
		</RouterLink>
	</TransitionGroup>

	<template v-else>
		<template v-for="category in state.categories" :key="category.id">
			<h4>{{ category.titleRu }}</h4>
			<TransitionGroup class="list-group list-group-flush" name="list" tag="div">
				<template v-for="book in state.books" :key="book.id">
					<RouterLink v-if="book.catId === category.id" class="list-group-item list-group-item-action" :to="`/library/eso/${book.id}-${book.slug}`" @mouseenter="prefetchBook(book.id)">
						<div class="row align-items-center g-3 booklist-row">
							<div class="col-auto booklist-left"><img class="me-2" :src="prepareIcon(book.icon)" width="64" height="64" :alt="book.titleRu"></div>
							<div class="col-auto d-flex flex-column justify-content-center booklist-right">
								<div class="box">{{ book.titleRu }}</div>
								<div class="box booklist-desc">{{ book.titleEn }}</div>
							</div>
						</div>
					</RouterLink>
				</template>
			</TransitionGroup>
		</template>
	</template>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" />
</template>

<style scoped lang="scss">
h2 {
	margin-bottom: 30px;

	& .h2-subtitle {
		color: #ffffff79;
		font-size: 1.3rem;
		margin-top:10px;
	}
}

h4 {
	margin-top: 20px;
	border-bottom: #ffffff79 1px solid;
	padding-bottom:10px;
}

.booklist-right {
	flex: 1 1 0;
}

.booklist-left {
	margin-right: 5px;
}

.booklist-desc {
	font-size: 13px;
	color: #ffffff79;
}
</style>
