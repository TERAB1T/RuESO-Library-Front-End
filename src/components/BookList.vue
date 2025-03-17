<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed } from 'vue';
import axios from 'axios';
import { prepareURL, prepareIcon } from '@/utils';
import Pagination from '@/components/Pagination.vue';

interface Book {
	id: number;
	titleEn: string;
	titleRu: string;
	icon: string;
	slug: string;
}

const route = useRoute();
const router = useRouter();

const state = reactive({
	books: [] as Book[],
	currentCategory: {
		id: route.params.categoryId ?? -1,
		titleRu: '',
		descRu: ''
	},
	isLoading: true,
	pageSize: 100,
	totalPages: 1
});

const currentPage = computed(() => Number(route.query.page) || 1);

const fetchBooks = async () => {
	state.isLoading = true;
	try {
		let url = `/api/library/books?page=${currentPage.value}&page_size=${state.pageSize}`;

		if (state.currentCategory.id > 0)
			url = `/api/library/categories/${state.currentCategory.id}?page=${currentPage.value}&page_size=${state.pageSize}`;

		const response = await axios.get(prepareURL(url));
		state.books = response.data.books;
		state.totalPages = response.data.pagination.total_pages;
		state.currentCategory.titleRu = response.data.titleRu ?? '';
		state.currentCategory.descRu = response.data.descRu ?? '';
	} catch (error) {
		console.error('Error fetching books data:', error);
		state.books = [];
		state.totalPages = 1;
	} finally {
		state.isLoading = false;
	}
};

if (import.meta.env.SSR)
	await fetchBooks();

watch(
	() => [route.params.categoryId, route.query.page],
	([newCategoryId]) => {
		state.currentCategory.id = newCategoryId ?? -1;
		fetchBooks();
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
</script>

<template>
	<template v-if="state.currentCategory.id > 0">
		<h2 class="mt-3">{{ state.currentCategory.titleRu }}</h2>

		<div class="alert alert-dark" role="alert">
			{{ state.currentCategory.descRu }}
		</div>
	</template>

	<TransitionGroup class="list-group list-group-flush" name="list" tag="div">
		<RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/${book.id}`">
			<img class="me-2" :src="prepareIcon(book.icon)" width="64" height="64" :alt="book.titleRu">
			{{ book.titleRu }}
		</RouterLink>
	</TransitionGroup>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" />
</template>
