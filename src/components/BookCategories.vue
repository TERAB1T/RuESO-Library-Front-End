<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch } from 'vue';
import { useFetchCategories, usePrefetchCategory } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';

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
const prefetchCategory = (categoryId: number) => usePrefetchCategory(queryClient, categoryId);
</script>

<template>
	<ul class="nav nav-tabs" id="categoriesTab" role="tablist">
		<li class="nav-item" role="presentation">
			<button class="nav-link active" id="book-categories-tab" data-bs-toggle="tab" data-bs-target="#book-categories-pane" type="button" role="tab" aria-controls="book-categories-pane" aria-selected="true">Категории</button>
		</li>
		<li class="nav-item" role="presentation">
			<button class="nav-link" id="book-patches-tab" data-bs-toggle="tab" data-bs-target="#book-patches-pane" type="button" role="tab" aria-controls="book-patches-pane" aria-selected="false">Обновления</button>
		</li>
	</ul>

	<div class="tab-content" id="categoriesTabContent">
		<div class="tab-pane show active list-group list-group-flush" id="book-categories-pane" role="tabpanel" aria-labelledby="book-categories-pane" tabindex="0">
			<RouterLink v-for="category in sortedCategories" :key="category.id" class="list-group-item list-group-item-action" :class="{ 'active': state.currentCategoryId === category.id }" :to="state.currentCategoryId === category.id ? '/library' : `/library/category/${category.id}-${category.slug}`" @mouseenter="prefetchCategory(category.id)">
				{{ category.titleRu }}
			</RouterLink>
		</div>
		<div class="tab-pane list-group list-group-flush" id="book-patches-pane" role="tabpanel" aria-labelledby="book-patches-pane" tabindex="0">Скоро здесь можно будет отсортировать книги по патчам, в которых их добавили.</div>
	</div>
</template>
