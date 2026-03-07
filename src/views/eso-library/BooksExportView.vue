<script setup lang="ts">
import { reactive, watch, computed, watchEffect, ref } from 'vue';
import { useFetchBooks, useFetchCategories, useFetchPatches } from '@/composables/useApi';
import { prepareIcon } from '@/utils';

import type { Category, Patch } from '@/types';

const state = reactive({
	patches: [] as Patch[],
	categories: [] as Category[],
	currentPatchVersion: '10000',
	bookList: ''
});

const currentPatch = computed(() => state.currentPatchVersion);

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();
const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();
const { data: booksData, suspense: booksSuspense, isSuccess: isBooksFetched } = useFetchBooks(computed(() => -1), currentPatch, computed(() => 1), 100000, ref(''));

watchEffect(() => {
	if (patchesData.value) {
		state.patches = patchesData.value;
		state.currentPatchVersion = state.patches.length > 0 ? state.patches[0].version : '-1';
	}
});

watch([booksData, categoriesData], ([books, categories]) => {
	if (!books?.books || !categories?.length) return;

	state.categories = categories;

	const filteredBooks = [...books.books].sort((a, b) =>
		a.titleRu.localeCompare(b.titleRu)
	);

	state.bookList = filteredBooks
		.map((book) => {
			const category = categories.find(cat => Number(cat.id) === Number(book.catId));
			return `${book.titleRu.replace(/[\t\n]/g, ' ')}\t${book.titleEn.replace(/[\t\n]/g, ' ')}\t${category?.titleRu ?? '—'}\thttps://rueso.ru${prepareIcon(book.icon)}`;
		})
		.join('\n');
});
</script>

<template>
	<div class="container-xl">
		<select v-model="state.currentPatchVersion" class="form-select mt-3">
			<option v-for="patch in state.patches" :key="patch.version" :value="patch.version">{{ patch.version }} ({{ patch.nameRu }})</option>
		</select>
		<textarea v-model="state.bookList" class="form-control mt-3" style="height: 500px;"></textarea>
	</div>
</template>
