<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch } from 'vue';
import axios from 'axios';
import { prepareURL } from '@/utils';

interface Book {
	id: number;
	titleEn: string;
	titleRu: string;
	icon: string;
	slug: string;
}

const route = useRoute();

const state = reactive({
	books: [] as Book[],
	currentCategoryId: route.params.categoryId ?? -1,
	isLoading: true,
	page: 1,
	pageSize: 5,
	totalPages: 1
});

const fetchBooks = async () => {
	state.isLoading = true;
	try {
		let url = `/api/library/books?page=${state.page}&page_size=${state.pageSize}`;

		if (state.currentCategoryId > 0)
			url = `/api/library/categories/${state.currentCategoryId}?page=${state.page}&page_size=${state.pageSize}`;

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
	() => route.params.categoryId,
	(newCategoryId) => {
		state.currentCategoryId = newCategoryId ?? -1;
		state.page = 1;
		fetchBooks();
	},
	{ immediate: true }
);

if (import.meta.env.SSR)
	await fetchBooks();

const changePage = (newPage: number) => {
	if (newPage > 0 && newPage <= state.totalPages) {
		state.page = newPage;
		fetchBooks();
	}
};

</script>

<template>
	<div class="list-group list-group-flush">
		<RouterLink v-for="book in state.books" :key="book.id" class="list-group-item list-group-item-action" :to="`/library/${book.id}`">
			{{ book.titleRu }}
		</RouterLink>
	</div>

	<nav v-if="state.totalPages > 1" class="mt-3">
		<ul class="pagination justify-content-center">
			<li class="page-item" :class="{ disabled: state.page === 1 }">
				<button class="page-link" @click="changePage(state.page - 1)">«</button>
			</li>
			<li v-for="page in state.totalPages" :key="page" class="page-item" :class="{ active: state.page === page }">
				<button class="page-link" @click="changePage(page)">{{ page }}</button>
			</li>
			<li class="page-item" :class="{ disabled: state.page === state.totalPages }">
				<button class="page-link" @click="changePage(state.page + 1)">»</button>
			</li>
		</ul>
	</nav>
</template>
