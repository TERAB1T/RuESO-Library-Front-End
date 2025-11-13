<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch, computed, onMounted, watchEffect, onServerPrefetch } from 'vue';
import { useFetchAtomicShopUpdated, usePrefetchAtomicShopCategory, usePrefetchAtomicShopSubcategory } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { formatDateTime } from '@/utils';

import type { AtomicShopCategoryWithSubcategories } from '@/types';

const route = useRoute();

const props = defineProps<{
	categories: AtomicShopCategoryWithSubcategories[]
}>();

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	lastUpdated: ""
});

const { data: atomicShopUpdatedData, suspense: atomicShopUpdatedSuspense, isSuccess: isAtomicShopUpdatedFetched } = useFetchAtomicShopUpdated();

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

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string) => usePrefetchAtomicShopCategory(queryClient, categoryFormId);
const prefetchSubcategory = (subcategoryFormId: string) => usePrefetchAtomicShopSubcategory(queryClient, subcategoryFormId);

watchEffect(() => {
	if (atomicShopUpdatedData.value) {
		state.lastUpdated = atomicShopUpdatedData.value.lastModified;
	}
});

onServerPrefetch(async () => {
	await atomicShopUpdatedSuspense();
	if (atomicShopUpdatedData.value) {
		state.lastUpdated = atomicShopUpdatedData.value.lastModified;
	}
});
</script>

<template>
	<div>
		<div class="list-group list-group-flush" :class="{ 'active': state.currentCategoryFormId === '-1' }">
			<RouterLink v-for="category in props.categories" :key="category.formId" class="list-group-item list-group-item-action" :class="{ 'active': state.currentCategoryFormId === category.formId }" :to="state.currentCategoryFormId === category.formId ? '/f76-atomic-shop' : `/f76-atomic-shop/category/${category.formId}-${category.slug}`" @mouseenter="prefetchCategory(category.formId)">
				{{ category.nameRu }}
			</RouterLink>
		</div>

		<div class="w-100 library-updated">Последнее обновление: <time v-if="state.lastUpdated" :datetime="formatDateTime(state.lastUpdated)">{{ state.lastUpdated }}</time></div>
	</div>
</template>
