<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch, ref } from 'vue';
import { prepareAtomicShopImage } from '@/utils';
import Pagination from '@/components/Pagination.vue';
import { useFetchAtomicShopItems, usePrefetchAtomicShopItem } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';

import type { AtomicShopCategoryWithSubcategories, AtomicShopItem, AtomicShopSubcategory } from '@/types';

const route = useRoute();
const router = useRouter();

const props = defineProps<{
	categories: AtomicShopCategoryWithSubcategories[]
}>();

const getCategoryByFormId = (formId: string): AtomicShopCategoryWithSubcategories | undefined =>
	props.categories.find(category => category.formId === formId);

const categoryInfo = computed(() =>
	getCategoryByFormId(state.currentCategory.formId)
);

const getSubcategoryByFormId = (formId: string): AtomicShopSubcategory | undefined =>
	props.categories
		.flatMap(category => category.subcategories)
		.find(subcategory => subcategory.formId === formId);

const subcategoryInfo = computed(() =>
	getSubcategoryByFormId(state.currentSubcategory.formId)
);

const state = reactive({
	items: [] as AtomicShopItem[],
	currentCategory: {
		formId: (route.params.categoryFormId ?? '-1') as string,
		nameRu: ''
	},
	currentSubcategory: {
		formId: (route.params.subcategoryFormId ?? '-1') as string,
		nameRu: ''
	},
	pageSize: 15,
	totalPages: 1
});

const currentPage = computed(() => Number(route.query.page) || 1);
const currentCategory = computed(() => (route.params.categoryFormId || '-1') as string);
const currentSubcategory = computed(() => (route.params.subcategoryFormId || '-1') as string);

const filter = ref('');

const { data: itemsData, suspense: itemsSuspense, isSuccess: isItemsFetched } = useFetchAtomicShopItems(currentCategory, currentSubcategory, currentPage, state.pageSize, filter);

watchEffect(async () => {
	if (itemsData.value) {
		state.items = itemsData.value.items ?? [];
		state.totalPages = itemsData.value.pagination?.total_pages ?? 1;

		state.currentCategory.nameRu = itemsData.value.category?.nameRu ?? '';
		state.currentSubcategory.nameRu = itemsData.value.subcategory?.nameRu ?? '';
	}
});

onServerPrefetch(async () => {
	await itemsSuspense();
	if (itemsData.value) {
		state.items = itemsData.value.items ?? [];
		state.totalPages = itemsData.value.pagination?.total_pages ?? 1;

		state.currentCategory.nameRu = itemsData.value.category?.nameRu ?? '';
		state.currentSubcategory.nameRu = itemsData.value.subcategory?.nameRu ?? '';
	}
});

watch(
	() => [route.params.categoryFormId, route.params.subcategoryFormId, route.query.page],
	([newCategoryFormId, newSubcategoryFormId]) => {
		state.currentCategory.formId = (newCategoryFormId ?? '-1') as string;
		state.currentSubcategory.formId = (newSubcategoryFormId ?? '-1') as string;
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

const changePage = (newPage: number) => {
	if (newPage > 0 && newPage <= state.totalPages) {
		router.push({ query: { ...route.query, page: newPage } });
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	}
};

const queryClient = useQueryClient();
const prefetchAtomicShopItem = (itemFormId: string) => usePrefetchAtomicShopItem(queryClient, itemFormId);

const onChangeFilter = useDebounceFn((textFilter: string) => {
	if (!textFilter || textFilter.length < 3) {
		filter.value = '';
	} else {
		filter.value = encodeURI(textFilter);
	}
}, 300);

// Получить полный путь категория -> подкатегория
const getBreadcrumb = (item: AtomicShopItem): string => {
	const category = item.categoryFormId ? getCategoryByFormId(item.categoryFormId) : null;
	const subcategory = item.subcategoryFormId ? getSubcategoryByFormId(item.subcategoryFormId) : null;

	if (category && subcategory) {
		return `${category.nameRu} → ${subcategory.nameRu}`;
	} else if (category) {
		return category.nameRu || '';
	}
	return '';
};
</script>

<template>
	<template v-if="state.currentSubcategory.formId !== '-1' && subcategoryInfo?.nameRu">
		<h2 class="mt-3 mb-4">{{ subcategoryInfo?.nameRu }}</h2>
	</template>

	<template v-else-if="state.currentCategory.formId !== '-1' && categoryInfo?.nameRu">
		<h2 class="mt-3 mb-4">{{ categoryInfo?.nameRu }}</h2>
	</template>

	<div class="mb-4">
		<input
			type="search"
			class="form-control form-control-lg"
			id="library-filter"
			placeholder="Фильтр по названию"
			autocomplete="off"
			@input="onChangeFilter(($event.target as HTMLInputElement).value)"
		>
	</div>

	<div class="row g-4 mb-4">
		<div
			v-for="item in state.items"
			:key="item.formId"
			class="col-12 col-md-6 col-lg-4"
		>
			<RouterLink
				:to="`/f76-atomic-shop/${item.formId}-${item.slug}`"
				class="card h-100 text-decoration-none atomic-shop-card"
				@mouseenter="prefetchAtomicShopItem(item.formId)"
			>
				<div class="card-img-wrapper">
					<img
						:src="prepareAtomicShopImage(item.mainImage)"
						class="card-img-top"
						:alt="item.nameRu || item.nameEn || 'Item'"
					>
				</div>
				<div class="card-body d-flex flex-column">
					<h5 class="card-title mb-2">{{ item.nameRu || item.nameEn || 'Без названия' }}</h5>
					<p class="card-text text-muted mb-2">{{ item.nameEn }}</p>
					<p class="card-text text-secondary small mt-auto mb-0">
						{{ getBreadcrumb(item) }}
					</p>
				</div>
			</RouterLink>
		</div>
	</div>

	<div v-if="state.items.length === 0" class="alert alert-info">
		Предметы не найдены
	</div>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" />
</template>

<style scoped>
.atomic-shop-card {
	transition: transform 0.2s ease, box-shadow 0.2s ease;
	overflow: hidden;
	border: 1px solid rgba(0, 0, 0, 0.125);
	background: var(--bs-block-bg);
}

.atomic-shop-card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	text-decoration: none;
}

.card-img-wrapper {
	width: 100%;
	height: 300px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.card-img-top {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease;
}

.atomic-shop-card:hover .card-img-top {
	transform: scale(1.05);
}

.card-title {
	font-size: 1.1rem;
	font-weight: 600;
	color: var(--bs-primary);
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.card-text {
	font-size: 0.9rem;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.card-body {
	min-height: 140px;
}

@media (max-width: 767px) {
	.card-img-wrapper {
		height: 180px;
	}
}
</style>
