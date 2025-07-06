<script setup lang="ts">
import { reactive, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import BookCategories from '@/components/BookCategories.vue';
import BookList from '@/components/BookList.vue';
import { useHead } from '@unhead/vue';
import { prepareIcon } from '@/utils';
import { useFetchCategories, useFetchPatches } from '@/composables/useApi';
import { formatDateToMonthYear } from '@/utils';

import type { Category, Patch } from '@/types';

const route = useRoute();

const state = reactive({
	currentCategoryId: Number(route.params.categoryId) ?? -1,
	currentPatchVersion: route.params.patchVersion ?? '-1',
	categories: [] as Category[],
	patches: [] as Patch[]
});

const updateHead = () => {
	let metaTitle = `Библиотека ESO | RuESO`;
	let metaDescription = 'Библиотека книг из The Elder Scrolls Online';
	let metaLink = 'https://rueso.ru/library/eso/';
	let metaIcon = `https://rueso.ru/public/img/main-card-library.jpg`;

	if (state.currentCategoryId !== -1) {
		const category = state.categories.find(cat => cat.id === state.currentCategoryId);
		if (category) {
			metaTitle = `${category.titleRu} — ESO | RuESO`;
			metaDescription = category.descRu;
			metaLink = `${metaLink}category/${category.id}-${category.slug}`;
			metaIcon = `https://rueso.ru${prepareIcon(category.icon)}`;
		}
	}

	if (state.currentPatchVersion !== '-1') {
		const patch = state.patches.find(p => p.version === state.currentPatchVersion);
		if (patch) {
			metaTitle = `Патч ${patch.version} (${patch.nameRu}) — ESO | RuESO`;
			metaDescription = `Книги, добавленные в игру с патчем ${patch.version}, который ${formatDateToMonthYear(patch.date)}.`;
			metaLink = `${metaLink}patch/${patch.version}-${patch.slug}`;
		}
	}

	useHead({
		title: metaTitle,
		meta: [
			{ name: 'description', content: metaDescription },

			{ name: 'og:title', content: metaTitle },
			{ name: 'og:description', content: metaDescription },
			{ name: 'og:image', content: metaIcon },
			{ name: 'og:url', content: metaLink },
			{ name: 'og:locale', content: 'ru_RU' },
			{ name: 'og:site_name', content: 'RuESO' },

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
}

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchCategories();
const { data: patchesData, suspense: patchesSuspense, isSuccess: isPatchesFetched } = useFetchPatches();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (patchesData.value) {
		state.patches = patchesData.value;
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
	await categoriesSuspense();
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	await patchesSuspense();
	if (patchesData.value) {
		state.patches = patchesData.value;
	}

	updateHead();
});
</script>

<template>
	<div class="container-xl">
		<div class="row">
			<div class="col-lg-8 order-2 order-lg-1">
				<div class="p-3">
					<BookList :categories="state.categories" :patches="state.patches" />
				</div>
			</div>

			<div class="col-lg-4 order-1 order-lg-2">
				<BookCategories :categories="state.categories" :patches="state.patches" />
			</div>
		</div>
	</div>

</template>
