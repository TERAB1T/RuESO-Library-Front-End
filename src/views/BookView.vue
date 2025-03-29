<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watchEffect, onServerPrefetch, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { prepareIcon, parsePseudoCode, generateMetaDescription } from '@/utils';
import type { Book } from '@/types';
import { useFetchBook } from '@/composables/useApi';
import NotFoundView from '@/views/NotFoundView.vue';

const route = useRoute();
const router = useRouter();
const bookId = Number(route.params.bookId);
const isNotFound = ref(false);

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
						"image": `https://rueso.ru${prepareIcon(state.book.icon)}`,
						"inLanguage": "ru",
						"url": metaLink
					})
				}
			]
		});
	}
}

watchEffect(() => {
	if (bookData.value) {
		state.book = bookData.value;

		if (!state.book.titleRu) isNotFound.value = true;

		updateHead();
	}
});

onServerPrefetch(async () => {
	await bookSuspense();
	if (bookData.value) {
		state.book = bookData.value;

		if (!state.book.titleRu || state.book.titleRu === undefined) isNotFound.value = true;

		updateHead();
	}
});
</script>

<template>
	<div class="container-xl">
		<NotFoundView v-if="isNotFound" />

		<div v-else-if="isBookFetched" class="row">
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
			</div>
			<div class="col-lg-4 order-1 order-lg-2">
				<div class="p-3" style="margin-top: 20px;">
					<div class="card">
						<div class="card-element">
							<img :src="prepareIcon(state.book.icon)" :alt="state.book.titleRu">
						</div>
						<div class="card-element">
							<div class="card-subtitle">Категория</div>
							<RouterLink :to="`/library/category/${state.book.category?.id}-${state.book.category?.slug}`">{{ state.book.category?.titleRu }}</RouterLink>
						</div>
						<div class="card-element">
							<div class="card-subtitle">Оригинальное название</div>
							{{ state.book.titleEn }}
						</div>
						<div class="card-element">
							<div class="card-subtitle">Добавлена</div>
							<RouterLink :to="`/library/patch/${state.book.created.version}-${state.book.created.slug}`">
								Патч <time :datetime="`${state.book.created.date} 00:00`">{{ state.book.created.version }}</time> ({{ state.book.created.nameRu }})
							</RouterLink>
						</div>
						<div v-if="state.book.created.version !== state.book.updated.version" class="card-element">
							<div v-if="state.book.category?.id === 2000" class="card-subtitle">Удалена</div>
							<div v-else class="card-subtitle">Обновлена</div>
							<RouterLink :to="`/library/patch/${state.book.updated.version}-${state.book.updated.slug}`">
								Патч <time :datetime="`${state.book.updated.date} 00:00`">{{ state.book.updated.version }}</time> ({{ state.book.updated.nameRu }})
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

.card {
	padding: 5px 0 0;
	text-align: center;
	margin: 0 30px;
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
</style>
