<script setup lang="ts">
import { reactive, ref, computed, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import BookCategories from '@/components/ESOBookCategories.vue';
import BookList from '@/components/ESOBookList.vue';
import { useHead, injectHead } from '@unhead/vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { prepareIcon, lowercaseFirstLetter, formatDateToMonthYear, formatDateTime, uppercaseFirstLetter } from '@/utils';
import { useFetchCategories, useFetchPatches, useFetchLibraryUpdated } from '@/composables/useApi';

import type { Category, Patch, LibraryMobileTab } from '@/types';

const route = useRoute();
const head = injectHead();

const mobileTab = ref<LibraryMobileTab>('books');

const state = reactive({
	currentCategoryId: Number(route.params.categoryId) ?? -1,
	currentPatchVersion: route.params.patchVersion ?? '-1',
	categories: [] as Category[],
	patches: [] as Patch[],
	lastUpdated: ""
});

const categoryInfo = computed(() =>
	state.currentCategoryId !== -1 ? state.categories.find(cat => cat.id === state.currentCategoryId) : undefined
);
const patchInfo = computed(() =>
	state.currentPatchVersion !== '-1' ? state.patches.find(p => p.version === state.currentPatchVersion) : undefined
);

const updateHead = () => {
	let metaTitle = `Библиотека ESO | RuESO`;
	let metaDescription = 'Библиотека книг из The Elder Scrolls Online';
	let metaLink = 'https://rueso.ru/library/eso/';
	let metaIcon = `https://rueso.ru/public/img/main-card-library.jpg`;

	if (categoryInfo.value) {
		metaTitle = `${categoryInfo.value.titleRu} | Библиотека ESO`;
		metaDescription = categoryInfo.value.descRu;
		metaLink = `${metaLink}category/${categoryInfo.value.id}-${categoryInfo.value.slug}`;
		metaIcon = `https://rueso.ru${prepareIcon(categoryInfo.value.icon)}`;
	}

	if (patchInfo.value) {
		metaTitle = `${uppercaseFirstLetter(patchInfo.value.nameRu)} | Библиотека ESO`;
		metaDescription = `Книги, добавленные в игру с патчем ${patchInfo.value.version}, который ${formatDateToMonthYear(patchInfo.value.date)}.`;
		metaLink = `${metaLink}patch/${patchInfo.value.version}-${patchInfo.value.slug}`;
	}

	useHead({
		title: metaTitle,
		meta: [
			{ name: 'description', content: metaDescription },

			{ property: 'og:title', content: metaTitle },
			{ property: 'og:description', content: metaDescription },
			{ property: 'og:image', content: metaIcon },
			{ property: 'og:url', content: metaLink },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:site_name', content: 'RuESO' },

			{ name: 'twitter:title', content: metaTitle },
			{ name: 'twitter:description', content: metaDescription },
			{ name: 'twitter:image', content: metaIcon },
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [
			{ rel: 'canonical', href: metaLink },
		]
	}, { head });
}

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();
const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();
const { data: libraryUpdatedData, suspense: libraryUpdatedSuspense, isSuccess: isLibraryUpdatedFetched } = useFetchLibraryUpdated();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (patchesData.value) {
		state.patches = patchesData.value;
	}

	if (libraryUpdatedData.value) {
		state.lastUpdated = libraryUpdatedData.value.lastModified;
	}

	updateHead();
});

watch(
	() => Number(route.params.categoryId),
	(newCategoryId) => {
		state.currentCategoryId = newCategoryId ?? -1;
	},
	{ immediate: true }
);

watch(
	() => route.params.patchVersion,
	(newPatchVersion) => {
		state.currentPatchVersion = newPatchVersion ?? '-1';
	},
	{ immediate: true }
);

onServerPrefetch(async () => {
	await Promise.all([
		categoriesSuspense(),
		patchesSuspense(),
		libraryUpdatedSuspense(),
	]);

	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (patchesData.value) {
		state.patches = patchesData.value;
	}

	if (libraryUpdatedData.value) {
		state.lastUpdated = libraryUpdatedData.value.lastModified;
	}

	updateHead();
});
</script>

<template>
	<div class="container-xl">
		<div class="library-grid" style="position: relative;">
			<div class="library-main">
				<div class="library-header">
					<template v-if="categoryInfo">
						<h1>Библиотека ESO: {{ lowercaseFirstLetter(categoryInfo.titleRu) }}<div class="h2-subtitle">{{ categoryInfo.titleEn }}</div></h1>
						<p class="library-intro">{{ categoryInfo.descRu }}</p>
					</template>
					<template v-else-if="patchInfo">
						<h1>Библиотека ESO: {{ patchInfo.nameRu }}</h1>
						<p class="library-intro">Книги, добавленные в игру с патчем {{ patchInfo.version }}, который {{ formatDateToMonthYear(patchInfo.date) }}.</p>
					</template>
					<template v-else>
						<h1>Библиотека The Elder Scrolls Online</h1>
						<p class="library-intro">Полное собрание книг из игры The Elder Scrolls Online.</p>
					</template>
				</div>

				<div class="d-lg-none d-flex justify-content-between align-items-center">
					<div class="text-muted small fst-italic">
						<span class="d-none d-md-inline">Последнее обновление: </span><span class="d-md-none">Обновлено: </span><time v-if="state.lastUpdated" :datetime="formatDateTime(state.lastUpdated)">{{ state.lastUpdated }}</time>
					</div>

					<div class="d-flex mobile-download-links">
						<a href="/files/eso-library.fb2" class="download-link" aria-label="Скачать в .FB2">
							<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
							<span class="d-none d-md-inline">Скачать в .FB2</span>
							<span class="d-md-none">.FB2</span>
						</a>

						<a href="/files/eso-library.epub" class="download-link" aria-label="Скачать в .EPUB">
							<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
							<span class="d-none d-md-inline">Скачать в .EPUB</span>
							<span class="d-md-none">.EPUB</span>
						</a>
					</div>
				</div>

				<ul class="nav nav-tabs d-lg-none mobile-library-tabs" :class="{ 'd-none': mobileTab !== 'books' }" role="tablist">
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'books' }" type="button" @click="mobileTab = 'books'">Книги</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'categories' }" type="button" @click="mobileTab = 'categories'">Категории</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'patches' }" type="button" @click="mobileTab = 'patches'">Патчи</button>
					</li>
				</ul>

				<div class="library-books mobile-books-content d-lg-block" :class="{ 'd-none': mobileTab !== 'books' }">
					<BookList />
				</div>
			</div>

			<div class="library-sidebar book-categories-column d-lg-block" :class="{ 'd-none': mobileTab === 'books' }">
				<BookCategories :categories="state.categories" :patches="state.patches" :last-updated="state.lastUpdated" v-model:mobile-tab="mobileTab" />
			</div>
		</div>
	</div>

</template>

<style scoped lang="scss">
.library-grid {
	display: grid;
	grid-template-columns: 1fr;
}

@media (min-width: 572.02px) and (max-width: 1400px) {
	.library-grid {
		padding-left: 1rem;
		padding-right: 1rem;
	}
}

@media (min-width: 992px) {
	.library-grid {
		grid-template-columns: 2fr 1fr;
		column-gap: 1.5rem;
	}
	.library-main {
		grid-column: 1;
		grid-row: 1;
	}
	.library-sidebar {
		grid-column: 2;
		grid-row: 1;
	}
}

.library-header {
	margin-top: 20px;
}

h1 {
	font-size: 2rem;

	& .h2-subtitle {
		display: none;
		color: #ffffff79;
		font-size: 1.3rem;
		margin-top: 10px;
	}
}

.library-intro {
	color: var(--bs-secondary-color);
	margin: -4px 0 24px;
	line-height: 1.55;
}

@media (max-width: 991.98px) {
	h1 {
		font-size: calc(1.325rem + .9vw);
	}
	.library-intro {
		margin-bottom: 10px;
	}
	.mobile-books-content {
		background: var(--bs-block-bg);
		border-bottom-left-radius: var(--bs-block-border-radius);
		border-bottom-right-radius: var(--bs-block-border-radius);
		padding: 1rem 1.2rem;
	}
	.mobile-books-content :deep(.list-group-item) {
		padding-left: 0;
		padding-right: 0;
	}
	.mobile-books-content :deep(.booklist-row) {
		margin-left: 0;
		margin-right: 0;
	}
	.mobile-books-content :deep(.list-group-item:not(:hover):not(:focus)) {
		background: none;
	}
	.mobile-library-tabs {
		position: sticky;
		top: 67px;
		z-index: 3;
	}
}

@media (max-width: 767.98px) {
	.mobile-library-tabs {
		top: 57px;
	}
}

.mobile-library-tabs {
	margin-top: 1rem;
	margin-bottom: 0;
}

.mobile-download-links {
	gap: 20px;
}

.download-link {
	display: flex;
	align-items: center;
	gap: 5px;
	color: var(--bs-primary);
	text-decoration: none;
	font-size: 0.9rem;
	font-weight: 500;
	padding: 4px 8px;
	margin: -4px -8px;
	border-radius: var(--bs-border-radius, 0.375rem);

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

.fa-dwnld-icon {
	height: 0.9em;
}

.book-categories-column {
	position: sticky;
	top: 67px;
	height: calc(100vh - 67px);
}

@media (max-width: 991.98px) {
	.book-categories-column {
		height: auto;
		position: static;
	}
}
</style>
