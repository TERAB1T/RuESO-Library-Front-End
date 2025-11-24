<script setup lang="ts">
import { reactive, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import F76AtomicShopCategories from '@/components/F76AtomicShopCategories.vue';
import F76AtomicShopItemList from '@/components/F76AtomicShopItemList.vue';
import { useHead } from '@unhead/vue';
import { useFetchAtomicShopCategories } from '@/composables/useApi';

import type { AtomicShopCategoryWithSubcategories } from '@/types';

const route = useRoute();

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	categories: [] as AtomicShopCategoryWithSubcategories[]
});

const updateHead = () => {
	let metaTitle = `Атомная лавка | Fallout 76`;
	let metaDescription = 'Полный каталог товаров, которые появлялись или появятся в Атомной лавке Fallout 76.';
	let metaLink = 'https://rueso.ru/f76-atomic-shop/';
	let metaIcon = `https://rueso.ru/public/img/main-card-atomic-shop.jpg`;

	if (state.currentSubcategoryFormId !== '-1') {
		const subcategory = state.categories
			.flatMap(category => category.subcategories)
			.find(subcat => subcat.formId === state.currentSubcategoryFormId);
		if (subcategory) {
			metaTitle = `${subcategory.nameRu} | Атомная лавка F76`;
			metaLink = `${metaLink}category/${subcategory.formId}-${subcategory.slug}`;
			metaDescription = `Полный каталог товаров из подкатегории «${subcategory.nameRu}» Атомной лавки Fallout 76.`;
		}
	}
	else if (state.currentCategoryFormId !== '-1') {
		const category = state.categories.find(cat => cat.formId === state.currentCategoryFormId);
		if (category) {
			metaTitle = `${category.nameRu} | Атомная лавка F76`;
			metaLink = `${metaLink}category/${category.formId}-${category.slug}`;
			metaDescription = `Полный каталог товаров из категории «${category.nameRu}» Атомной лавки Fallout 76.`;
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

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchAtomicShopCategories();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
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
	await categoriesSuspense();
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	updateHead();
});
</script>

<template>
	<div class="container-xl">
		<div class="row">
			<div class="col-lg-9 order-1 order-lg-1">
				<div class="p-3">
					<F76AtomicShopItemList :categories="state.categories" />
				</div>
			</div>

			<div class="col-lg-3 order-2 order-lg-2 book-categories-column">
				<F76AtomicShopCategories :categories="state.categories" />
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
