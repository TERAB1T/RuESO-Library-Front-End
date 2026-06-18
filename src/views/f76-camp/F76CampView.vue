<script setup lang="ts">
import { reactive, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import F76CampCategories from '@/components/F76CampCategories.vue';
import F76CampItemList from '@/components/F76CampItemList.vue';
import { useHead } from '@unhead/vue';
import { useFetchCampCategories, useFetchCampUpdated } from '@/composables/useApi';

import type { CampCategoryWithSubcategories } from '@/types';

const route = useRoute();

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	categories: [] as CampCategoryWithSubcategories[],
	lastUpdated: ''
});

const updateHead = () => {
	let metaTitle = `Предметы C.A.M.P. | Fallout 76`;
	let metaDescription = 'Полный перечень предметов, которые можно разместить в C.A.M.P. Fallout 76.';
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
	});
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
		<div class="row">
			<div class="col-lg-9 order-1 order-lg-1">
				<div class="p-3">
					<F76CampItemList :categories="state.categories" />
				</div>
			</div>

			<div class="col-lg-3 order-2 order-lg-2 book-categories-column">
				<F76CampCategories :categories="state.categories" :lastUpdated="state.lastUpdated" />
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
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
