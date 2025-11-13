<script setup lang="ts">
import { reactive, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import F76AtomicShopCategories from '@/components/F76AtomicShopCategories.vue';
import F76AtomicShopItemList from '@/components/F76AtomicShopItemList.vue';
import { useHead } from '@unhead/vue';
import { prepareIcon } from '@/utils';
import { useFetchAtomicShopCategories } from '@/composables/useApi';

import type { AtomicShopCategoryWithSubcategories } from '@/types';

const route = useRoute();

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	categories: [] as AtomicShopCategoryWithSubcategories[]
});

const updateHead = () => {
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
			<div class="col-lg-9 order-2 order-lg-1">
				<div class="p-3">
					<F76AtomicShopItemList :categories="state.categories" />
				</div>
			</div>

			<div class="col-lg-3 order-1 order-lg-2">
				<div class="p-3">
					<F76AtomicShopCategories :categories="state.categories" />
				</div>
			</div>
		</div>
	</div>
</template>
