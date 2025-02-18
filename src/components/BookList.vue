<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed } from 'vue';
import axios from 'axios';
import { prepareURL } from '@/utils';
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
	currentCategoryId: route.params.categoryId ?? -1,
	isLoading: true,
	pageSize: 100,
	totalPages: 1
});

const currentPage = computed(() => Number(route.query.page) || 1);

const fetchBooks = async () => {
	state.isLoading = true;
	try {
		let url = `/api/library/books?page=${currentPage.value}&page_size=${state.pageSize}`;

		if (state.currentCategoryId > 0)
			url = `/api/library/categories/${state.currentCategoryId}?page=${currentPage.value}&page_size=${state.pageSize}`;

		const response = await axios.get(prepareURL(url));
		state.books = response.data.books;
		state.totalPages = response.data.pagination.total_pages;
	} catch (error) {
		console.error('Error fetching books data:', error);
		state.books = [];
		state.totalPages = 1;
	} finally {
		state.isLoading = false;
	}
};

watch(
	() => [route.params.categoryId, route.query.page],
	([newCategoryId]) => {
		state.currentCategoryId = newCategoryId ?? -1;
		fetchBooks();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

const changePage = (newPage: number) => {
	if (newPage > 0 && newPage <= state.totalPages) {
		router.push({ query: { ...route.query, page: newPage } });
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
};
</script>

<template>
	<div class="list-group list-group-flush">
		<RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/${book.id}`">
			{{ book.titleRu }}
		</RouterLink>
	</div>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" />
</template>
