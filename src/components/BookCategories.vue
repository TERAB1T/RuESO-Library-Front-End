<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch } from 'vue';
import { useFetchCategories, usePrefetchCategory } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';

import type { Category } from '@/types';

const route = useRoute();

const state = reactive({
	categories: [] as Category[],
	currentCategoryId: Number(route.params.categoryId) ?? -1
});

const sortedCategories = computed(() => {
	return [...state.categories].sort((a, b) => {
		if (a.id === 1002 && b.id !== 2000) return 1;
		if (b.id === 1002 && a.id !== 2000) return -1;
		if (a.id === 2000) return 1;
		if (b.id === 2000) return -1;
		return a.titleRu.localeCompare(b.titleRu);
	});
});

watch(
	() => Number(route.params.categoryId),
	(newCategoryId) => {
		state.currentCategoryId = newCategoryId ?? -1;
	},
	{ immediate: true }
);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}
});

onServerPrefetch(async () => {
	await categoriesSuspense();
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}
});

const queryClient = useQueryClient();
const preloadCategory = useDebounceFn((categoryId: number) => {
	usePrefetchCategory(queryClient, categoryId);
}, 200);

</script>

<template>
	<div class="list-group list-group-flush">
		<RouterLink
			v-for="category in sortedCategories"
			:key="category.id"
			class="list-group-item list-group-item-action"
			:class="{ 'active': state.currentCategoryId === category.id }"
			:to="state.currentCategoryId === category.id ? '/library' : `/library/category/${category.id}-${category.slug}`"
			@mouseenter="preloadCategory(category.id)">
			{{ category.titleRu }}
		</RouterLink>
	</div>
</template>
