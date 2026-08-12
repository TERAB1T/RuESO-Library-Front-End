<script setup lang="ts">
import { reactive, watch, computed, watchEffect } from 'vue';
import { useFetchPatchBooksExport, useFetchPatches } from '@/composables/useApi';
import { prepareIcon } from '@/utils';

import type { Category, Patch } from '@/types';

const state = reactive({
	patches: [] as Patch[],
	categories: [] as Category[],
	currentPatchVersion: '10000',
	bookList: ''
});

const currentPatch = computed(() => state.currentPatchVersion);

const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();
const { data: exportData, suspense: exportSuspense, isSuccess: isExportFetched } = useFetchPatchBooksExport(currentPatch);

watchEffect(() => {
	if (patchesData.value) {
		state.patches = patchesData.value;
		state.currentPatchVersion = state.patches.length > 0 ? state.patches[0].version : '-1';
	}
});

watch(exportData, (data) => {
	if (!data?.books || !data?.categories) return;

	state.categories = data.categories as Category[];

	const filteredBooks = [...data.books].sort((a, b) =>
		a.titleRu.localeCompare(b.titleRu)
	);

	state.bookList = filteredBooks
		.map((book) => {
			const category = data.categories.find(cat => Number(cat.id) === Number(book.catId));
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
