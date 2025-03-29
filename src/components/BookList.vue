<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch } from 'vue';
import { prepareIcon, formatDateToMonthYear } from '@/utils';
import Pagination from '@/components/Pagination.vue';
import { useFetchBooks, usePrefetchBook } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';

import type { Book, Patch } from '@/types';

const route = useRoute();
const router = useRouter();

const state = reactive({
	books: [] as Book[],
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
	pageSize: 100,
	totalPages: 1
});

const currentPage = computed(() => Number(route.query.page) || 1);
const currentCategory = computed(() => Number(route.params.categoryId) || -1);
const currentPatch = computed(() => route.params.patchVersion || '-1');

const { data: booksData, suspense: booksSuspense, isSuccess: isBooksFetched } = useFetchBooks(currentCategory, currentPatch, currentPage, state.pageSize);

watchEffect(async () => {
	if (booksData.value) {
		state.books = booksData.value.books ?? [];
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
</script>

<template>
	<template v-if="state.currentCategory.id > 0">
		<h2 class="mt-3">{{ state.currentCategory.titleRu }}</h2>

		<div class="alert alert-dark" role="alert">
			{{ state.currentCategory.descRu }}
		</div>
	</template>

	<template v-else-if="state.currentPatch.version !== '-1'">
		<h2 class="mt-3">Патч {{ state.currentPatch.version }} ({{ state.currentPatch.nameRu }})</h2>

		<div class="alert alert-dark" role="alert">
			Книги, добавленные в игру с патчем {{ state.currentPatch.version }} ({{ state.currentPatch.nameRu }}), который {{ formatDateToMonthYear(state.currentPatch.date) }}.
		</div>
	</template>

	<TransitionGroup class="list-group list-group-flush" name="list" tag="div">
		<RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/${book.id}-${book.slug}`" @mouseenter="prefetchBook(book.id)">
			<img class="me-2" :src="prepareIcon(book.icon)" width="64" height="64" :alt="book.titleRu">
			{{ book.titleRu }}
		</RouterLink>
	</TransitionGroup>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" />
</template>

<style scoped>
h2 {
	margin-bottom: 30px;
}
</style>
