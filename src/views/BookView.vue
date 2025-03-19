<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watchEffect, onServerPrefetch } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareIcon, parsePseudoCode, generateMetaDescription } from '@/utils';
import type { Book } from '@/types';
import { useFetchBook } from '@/composables/useApi';

const route = useRoute();
const bookId = Number(route.params.bookId);

const state = reactive({
	book: {} as Book
});

const { data: bookData, suspense: bookSuspense, isSuccess: isBookFetched } = useFetchBook(bookId);

const updateHead = () => {
	if (state.book && state.book.titleRu) {
		const metaTitle = `${state.book.titleRu} — ESO | RuESO`;
		const metaDescription = generateMetaDescription(state.book.textRu);
		const metaLink = `https://rueso.ru/library/${state.book.id}-${state.book.slug}`;

		useHead({
			title: metaTitle,
			meta: [
				{ name: 'description', content: metaDescription },
				{ name: 'robots', content: 'index, follow' },
				{ name: 'og:title', content: metaTitle },
				{ name: 'og:description', content: metaDescription },
				{ name: 'og:image', content: prepareIcon(state.book.icon) },
				{ name: 'og:url', content: metaLink },
				{ name: 'og:locale', content: 'ru_RU' },
				{ name: 'og:type', content: 'book' },
				{ name: 'og:site_name', content: 'RuESO' },
				{ name: 'twitter:title', content: metaTitle },
				{ name: 'twitter:description', content: metaDescription },
				{ name: 'twitter:image', content: prepareIcon(state.book.icon) },
				{ name: 'twitter:card', content: 'summary' },
				{ name: 'twitter:creator', content: '@TERAB1T' },
			],
			link: [
				{ rel: 'canonical', href: metaLink },
			]
		});
	}
}

watchEffect(() => {
	if (bookData.value) {
		state.book = bookData.value;
		updateHead();
	}
});

onServerPrefetch(async () => {
	await bookSuspense();
	if (bookData.value) {
		state.book = bookData.value;
		updateHead();
	}
});
</script>

<template>

	<div class="container-xl">
		<div v-if="isBookFetched" class="row">
			<div class="col-lg-8 order-2 order-lg-1">
				<div class="p-3">
					<h1>{{ state.book.titleRu }}</h1>
					<div class="book-main" v-html="parsePseudoCode((state.book.textRu ?? '').replace(/\n/g, '<br>'))"></div>
				</div>
			</div>
			<div class="col-lg-4 order-1 order-lg-2">
				<div class="p-3">
					<div style="text-align: center;"><img :src="prepareIcon(state.book.icon)" :alt="state.book.titleRu"></div>
					<div>{{ state.book.titleEn }}</div>
					<div>Добавлена: {{ state.book.created }}</div>
					<div>Обновлена: {{ state.book.updated }}</div>
					<RouterLink :to="`/library/category/${state.book.category?.id}-${state.book.category?.slug}`">{{ state.book.category?.titleRu }}</RouterLink>
				</div>
			</div>
		</div>
	</div>
</template>
