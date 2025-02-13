<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, onMounted } from 'vue';
import axios from 'axios';
import { useHead } from '@unhead/vue';
import { prepareURL } from '@/utils';

interface Book {
	id: number,
	titleEn: string,
	titleRu: string,
	textEn: string,
	textRu: string,
	icon: string,
	catId: number,
	slug: string
}

interface Category {
	id: number,
	title: string,
	desc: string,
	icon: string,
	slug: string
}

const route = useRoute();
const bookId = route.params.bookId;

const state = reactive({
	book: {} as Book,
	category: {} as Category,
	isLoading: true,
});

console.log(prepareURL(`/api/books/${bookId}`));

try {
	const response = await axios.get(prepareURL(`/api/books/${bookId}`));
	state.book = response.data;

	const response2 = await axios.get(prepareURL(`/api/categories/${state.book.catId}`));
	state.category = response2.data;

	useHead({
		title: `${state.book.titleRu} — ESO | RuESO`,
		meta: [
			{ name: 'description', content: 'SSR библиотека переводов для The Elder Scrolls' }
		]
	});
} catch (error) {
	console.error('Error fetching book data:', error);
} finally {
	state.isLoading = false;
}
</script>

<template>

	<div class="container-xl">
		<div class="row">
			<div class="col-lg-8 order-2 order-lg-1">
				<div class="p-3">
					<h1>{{ state.book.titleRu }}</h1>
					<div class="book-main">{{ state.book.textRu }}</div>
				</div>
			</div>
			<div class="col-lg-4 order-1 order-lg-2">
				<div class="p-3">
					<div>{{ state.book.titleEn }}</div>
					<RouterLink :to="`/library/category/${state.category.id}`">{{ state.category.title }}</RouterLink>
				</div>
			</div>
		</div>
	</div>
</template>
