<script setup lang="ts">
import { reactive, ref, computed, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import F76CampCategories from '@/components/F76CampCategories.vue';
import F76CampItemList from '@/components/F76CampItemList.vue';
import { useHead, injectHead } from '@unhead/vue';
import { formatDateTime } from '@/utils';
import { useFetchCampCategories, useFetchCampUpdated } from '@/composables/useApi';

import type { CampCategoryWithSubcategories, CampMobileTab } from '@/types';

const HOME_DESCRIPTION = 'Полный каталог предметов, которые можно разместить в C.A.M.P. Fallout 76.';

const route = useRoute();
const head = injectHead();

const mobileTab = ref<CampMobileTab>('items');

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	categories: [] as CampCategoryWithSubcategories[],
	lastUpdated: ''
});

const categoryInfo = computed(() =>
	state.currentSubcategoryFormId === '-1' && state.currentCategoryFormId !== '-1'
		? state.categories.find(cat => cat.formId === state.currentCategoryFormId)
		: undefined
);
const subcategoryInfo = computed(() =>
	state.currentSubcategoryFormId !== '-1'
		? state.categories.flatMap(cat => cat.subcategories).find(sub => sub.formId === state.currentSubcategoryFormId)
		: undefined
);

const updateHead = () => {
	let metaTitle = `Предметы C.A.M.P. | Fallout 76`;
	let metaDescription = HOME_DESCRIPTION;
	let metaLink = 'https://rueso.ru/f76-camp/';
	let metaIcon = `https://rueso.ru/public/img/main-card-camp.jpg`;

	if (state.currentSubcategoryFormId !== '-1') {
		const subcategory = state.categories
			.flatMap(category => category.subcategories)
			.find(subcat => subcat.formId === state.currentSubcategoryFormId);
		if (subcategory) {
			metaTitle = `${subcategory.nameRu} | C.A.M.P. F76`;
			metaLink = `${metaLink}category/${subcategory.formId}-${subcategory.slug}`;
			metaDescription = `Все предметы для C.A.M.P. Fallout 76 из подкатегории «${subcategory.nameRu}».`;
		}
	}
	else if (state.currentCategoryFormId !== '-1') {
		const category = state.categories.find(cat => cat.formId === state.currentCategoryFormId);
		if (category) {
			metaTitle = `${category.nameRu} | C.A.M.P. F76`;
			metaLink = `${metaLink}category/${category.formId}-${category.slug}`;
			metaDescription = `Все предметы для C.A.M.P. Fallout 76 из категории «${category.nameRu}».`;
		}
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
};

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCampCategories();
const { data: campUpdatedData, suspense: campUpdatedSuspense, isSuccess: isCampUpdatedFetched } = useFetchCampUpdated();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (campUpdatedData.value) {
		state.lastUpdated = campUpdatedData.value.lastModified;
	}

	updateHead();
});

watch(
	() => route.params.categoryFormId,
	(newCategoryFormId) => {
		state.currentCategoryFormId = newCategoryFormId ?? '-1';
	},
	{ immediate: true }
);

watch(
	() => route.params.subcategoryFormId,
	(newSubcategoryFormId) => {
		state.currentSubcategoryFormId = newSubcategoryFormId ?? '-1';
	},
	{ immediate: true }
);

onServerPrefetch(async () => {
	await Promise.all([
		categoriesSuspense(),
		campUpdatedSuspense(),
	]);
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (campUpdatedData.value) {
		state.lastUpdated = campUpdatedData.value.lastModified;
	}

	updateHead();
});
</script>

<template>
	<div class="container-xl">
		<div class="camp-grid" style="position: relative;">
			<div class="camp-main">
				<div class="library-header">
					<template v-if="subcategoryInfo && subcategoryInfo.nameRu">
						<h2>Предметы C.A.M.P.: {{ subcategoryInfo.nameRu.toLowerCase() }}</h2>
					</template>
					<template v-else-if="categoryInfo && categoryInfo.nameRu">
						<h2>Предметы C.A.M.P.: {{ categoryInfo.nameRu.toLowerCase() }}</h2>
					</template>
					<template v-else>
						<h2>Предметы C.A.M.P. Fallout 76</h2>
						<p class="library-intro">{{ HOME_DESCRIPTION }}</p>
					</template>
				</div>

				<div class="d-lg-none d-flex justify-content-between align-items-center">
					<div class="text-muted small fst-italic">
						<span class="d-none d-md-inline">Последнее обновление: </span><span class="d-md-none">Обновлено: </span><time v-if="state.lastUpdated" :datetime="formatDateTime(state.lastUpdated)">{{ state.lastUpdated }}</time>
					</div>
				</div>

				<ul class="nav nav-tabs d-lg-none mobile-library-tabs" :class="{ 'd-none': mobileTab !== 'items' }" role="tablist">
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'items' }" type="button" @click="mobileTab = 'items'">Предметы</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'categories' }" type="button" @click="mobileTab = 'categories'">Категории</button>
					</li>
				</ul>

				<div class="camp-items mobile-items-content d-lg-block" :class="{ 'd-none': mobileTab !== 'items' }">
					<F76CampItemList :categories="state.categories" />
				</div>
			</div>

			<div class="camp-sidebar book-categories-column d-lg-block" :class="{ 'd-none': mobileTab === 'items' }">
				<F76CampCategories :categories="state.categories" :lastUpdated="state.lastUpdated" v-model:mobile-tab="mobileTab" />
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.camp-grid {
	display: grid;
	grid-template-columns: 1fr;
}

@media (min-width: 572.02px) and (max-width: 1400px) {
	.camp-grid {
		padding-left: 1rem;
		padding-right: 1rem;
	}
}

@media (min-width: 992px) {
	.camp-grid {
		grid-template-columns: 3fr 1fr;
		column-gap: 1.5rem;
	}
	.camp-main {
		grid-column: 1;
		grid-row: 1;
	}
	.camp-sidebar {
		grid-column: 2;
		grid-row: 1;
	}
}

.library-header {
	margin-top: 20px;
}

h2 {
	font-size: 2rem;
}

h2:last-child {
	margin-bottom: 1.5rem;
}

.library-intro {
	color: var(--bs-secondary-color);
	margin: -4px 0 24px;
	line-height: 1.55;
}

@media (max-width: 991.98px) {
	h2 {
		font-size: calc(1.325rem + .9vw);
	}
	h2:last-child {
		margin-bottom: 0.5rem;
	}
	.library-intro {
		margin-bottom: 10px;
	}
	.mobile-library-tabs {
		position: sticky;
		top: 66px;
		z-index: 3;
	}
	.mobile-items-content {
		background: var(--bs-block-bg);
		border-bottom-left-radius: var(--bs-block-border-radius);
		border-bottom-right-radius: var(--bs-block-border-radius);
		padding: 1rem 1.2rem;
	}
}

@media (max-width: 767.98px) {
	.mobile-library-tabs {
		top: 56px;
	}
}

.mobile-library-tabs {
	margin-top: 1rem;
	margin-bottom: 0;
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
