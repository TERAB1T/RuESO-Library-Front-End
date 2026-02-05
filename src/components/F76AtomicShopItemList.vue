<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch, ref, onMounted, onBeforeUnmount } from 'vue';
import { prepareAtomicShopImage, getAtomicShopSortOrder, setAtomicShopSortOrder, atomicShopHandleImageError } from '@/utils';
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
	totalPages: 1,
	filter: (route.query.filter as string | undefined) || '',
	sortOrder: getAtomicShopSortOrder(),
	isPTS: false,
	hasSupport: false
});

const currentPage = computed(() => Number(route.query.page) || 1);
const currentCategory = computed(() => (route.params.categoryFormId || '-1') as string);
const currentSubcategory = computed(() => (route.params.subcategoryFormId || '-1') as string);

watch(() => state.sortOrder, (newValue) => {
	setAtomicShopSortOrder(newValue);
});

const { data: itemsData, suspense: itemsSuspense, isSuccess: isItemsFetched } = useFetchAtomicShopItems(
	currentCategory,
	currentSubcategory,
	currentPage,
	state.pageSize,
	computed(() => state.filter),
	computed(() => state.sortOrder),
	computed(() => state.isPTS),
	computed(() => state.hasSupport)
);

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
	() => [route.params.categoryFormId, route.params.subcategoryFormId, route.query.page, route.query.isPTS, route.query.hasSupport],
	([newCategoryFormId, newSubcategoryFormId, newPage, newIsPTS, newHasSupport]) => {
		state.currentCategory.formId = (newCategoryFormId ?? '-1') as string;
		state.currentSubcategory.formId = (newSubcategoryFormId ?? '-1') as string;

		state.isPTS = (newIsPTS === '1') ? true : false;
		state.hasSupport = (newHasSupport === '1') ? true : false;

		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

watch(
	() => route.query.filter,
	(newFilter) => {
		state.filter = (newFilter as string | undefined) || '';

		const filterInput = document.getElementById('library-filter') as HTMLInputElement;
		if (filterInput) {
			filterInput.value = state.filter ? decodeURI(state.filter) : '';
		}
	},
	{ immediate: true }
);

const changePage = (newPage: number) => {
	if (newPage > 0 && newPage <= state.totalPages) {
		const newQuery: Record<string, any> = { ...route.query };

		if (newPage === 1) {
			delete newQuery.page;
		} else {
			newQuery.page = newPage;
		}

		router.push({ query: newQuery });
		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	}
};

const queryClient = useQueryClient();
const prefetchAtomicShopItem = (itemFormId: string) => usePrefetchAtomicShopItem(queryClient, itemFormId);

const onChangeFilter = useDebounceFn((textFilter: string) => {
	const newQuery: Record<string, any> = { ...route.query };
	delete newQuery.page;

	if (!textFilter || textFilter.length < 3) {
		state.filter = '';
		delete newQuery.filter;
	} else {
		state.filter = encodeURI(textFilter);
		newQuery.filter = state.filter;
	}

	router.push({ query: newQuery });
}, 300);

const categoriesIndex = computed(() => {
	const index: Record<string, { nameRu: string }> = {};
	props.categories.forEach(cat => {
		index[cat.formId] = { nameRu: cat.nameRu ?? '' };
		cat.subcategories.forEach(sub => {
			index[sub.formId] = { nameRu: sub.nameRu ?? '' };
		});
	});
	return index;
});

const getBreadcrumb = (item: AtomicShopItem) => {
	const catName = categoriesIndex.value[item.categoryFormId || '']?.nameRu;
	const subName = categoriesIndex.value[item.subcategoryFormId || '']?.nameRu;
	if (catName && subName) return `${catName} → ${subName}`;
	return catName || '';
};

const hoveredItem = ref<string | null>(null);

const getImageSrc = (item: AtomicShopItem, isHovered: boolean) => {
	const hasAvif = item.mainImage?.includes('.avif');

	if (!hasAvif) {
		return prepareAtomicShopImage(item.mainImage);
	}

	const format = isHovered ? '.avif' : '.webp';
	return prepareAtomicShopImage(item.mainImage?.replace(/\.(avif|webp)$/, format));
};

let tooltipInstance: any = null;

const enableTooltips = async () => {
	const { Tooltip } = await import("bootstrap");
	const container = document.body;
	tooltipInstance = new Tooltip(container, {
		selector: '[data-bs-toggle="tooltip"]'
	});
};

onMounted(async () => {
	const filterInput = document.getElementById('library-filter') as HTMLInputElement;
	if (filterInput && state.filter) {
		filterInput.value = decodeURI(state.filter);
	}

	await enableTooltips();
});

onBeforeUnmount(() => {
	if (tooltipInstance) {
		tooltipInstance.dispose();
	}

	document.querySelectorAll('.tooltip').forEach(el => el.remove());
});
</script>

<template>
	<template v-if="state.currentSubcategory.formId !== '-1' && subcategoryInfo?.nameRu">
		<h2 class="mb-4">Атомная лавка: {{ subcategoryInfo?.nameRu === 'S.P.E.C.I.A.L.' ? subcategoryInfo?.nameRu : subcategoryInfo?.nameRu.toLowerCase() }}</h2>
	</template>

	<template v-else-if="state.currentCategory.formId !== '-1' && categoryInfo?.nameRu">
		<h2 class="mb-4">Атомная лавка: {{ categoryInfo?.nameRu === 'C.A.M.P.' ? categoryInfo?.nameRu : categoryInfo?.nameRu.toLowerCase() }}</h2>
	</template>

	<template v-else>
		<h2 class="mb-4">Атомная лавка Fallout 76</h2>
	</template>

	<div class="row g-4 mb-2">
		<div class="col-12 col-md-8">
			<input type="search" class="form-control form-control-lg" id="library-filter" placeholder="Фильтр по названию" autocomplete="off" @input="onChangeFilter(($event.target as HTMLInputElement).value)">
		</div>
		<div class="col-12 col-md-4 select-order-wrapper">
			<select v-model="state.sortOrder" class="form-select form-select-lg" aria-label="Сортировка" @change="changePage(1)">
				<option value="date_desc">Сортировка: сначала новые</option>
				<option value="date_asc">Сортировка: сначала старые</option>
				<option value="name_asc">Сортировка: А-Я</option>
				<option value="name_desc">Сортировка: Я-А</option>
			</select>
		</div>
	</div>

	<div class="row g-4 mb-4">
		<div v-for="item in state.items" :key="item.formId" class="col-12 col-md-6 col-lg-4">
			<RouterLink :to="`/f76-atomic-shop/${item.formId}-${item.slug}`" class="card h-100 text-decoration-none atomic-shop-card" @mouseenter="hoveredItem = item.formId; prefetchAtomicShopItem(item.formId)" @mouseleave="hoveredItem = null">
				<div v-if="item.isPTS" class="pts-badge-wrapper" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Доступно только на публичном тестовом сервере.">
					<div class="pts-badge">PTS</div>
				</div>
				<div v-if="item.supportItem || item.supportBundles" class="support-badge-wrapper" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Можно купить в службе поддержки Bethesda.">
					<div class="support-badge">
						<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-headset" viewBox="0 0 16 16">
							<path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5" />
						</svg>
					</div>
				</div>
				<div class="card-img-wrapper">
					<img :src="getImageSrc(item, hoveredItem === item.formId)" class="card-img-top" :alt="item.nameRu || item.nameEn || 'Atomic Shop Item'" loading="lazy" @error="atomicShopHandleImageError">
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

	<div v-if="isItemsFetched && state.items.length === 0" class="alert alert-info">
		Предметы не найдены
	</div>

	<Pagination :currentPage="currentPage" :totalPages="state.totalPages" @changePage="changePage" :maxVisiblePages="9" />
</template>

<style scoped>
.atomic-shop-card {
	position: relative;
	transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
	border: 1px solid rgba(0, 0, 0, 0.125);
	background: var(--bs-block-bg);
	will-change: transform;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	overflow: visible;
}

.atomic-shop-card:hover {
	background: #1e1e20;
	text-decoration: none;
}

.card-img-wrapper {
	width: 100%;
	aspect-ratio: 1 / 1;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #4e4e4e 0%, #383838 100%);
	line-height: 0;
	will-change: transform;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
}

.card-img-top {
	width: 100%;
	height: 100%;
	object-fit: contain;
	padding: 0rem;
	transition: transform 0.3s ease;
	will-change: transform;
	backface-visibility: hidden;
	-webkit-backface-visibility: hidden;
	transform: translateZ(0);
}

.atomic-shop-card:hover .card-img-top {
	transform: scale(1.02);
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

.form-select-lg {
	font-size: 1rem !important;
	line-height: 1.85rem;
	cursor: pointer;
}

@media (max-width: 767.98px) {
	.select-order-wrapper {
		margin-top: 0;
		margin-bottom: 0.8rem;
	}
}
</style>
