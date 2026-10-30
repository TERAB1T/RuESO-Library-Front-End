<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch, computed, watchEffect, onServerPrefetch, ref } from 'vue';
import { prepareCampImage, getCampSortOrder, setCampSortOrder, atomicShopHandleImageError } from '@/utils';
import Pagination from '@/components/Pagination.vue';
import { useFetchCampItems, usePrefetchCampItem } from '@/composables/useApi';
import { useCatalogList } from '@/composables/useCatalogList';
import { useDelegatedTooltips } from '@/composables/useDelegatedTooltips';
import { useQueryClient } from '@tanstack/vue-query';

import type { CampCategoryWithSubcategories, CampItem } from '@/types';

const route = useRoute();

const props = defineProps<{
	categories: CampCategoryWithSubcategories[]
}>();

const state = reactive({
	items: [] as CampItem[],
	pageSize: 18,
	totalPages: 1,
	sortOrder: getCampSortOrder(),
	isPTS: route.query.isPTS === '1'
});

const { currentPage, filter, changePage, onChangeFilter, getBreadcrumb } = useCatalogList({
	section: 'camp',
	categories: () => props.categories,
	totalPages: () => state.totalPages,
});

const currentCategory = computed(() => (route.params.categoryFormId || '-1') as string);
const currentSubcategory = computed(() => (route.params.subcategoryFormId || '-1') as string);

watch(() => state.sortOrder, (newValue) => {
	setCampSortOrder(newValue);
});

const { data: itemsData, suspense: itemsSuspense, isSuccess: isItemsFetched, isPending: isItemsPending } = useFetchCampItems(
	currentCategory,
	currentSubcategory,
	currentPage,
	state.pageSize,
	computed(() => filter.value),
	computed(() => state.sortOrder),
	computed(() => state.isPTS)
);

watchEffect(async () => {
	if (itemsData.value) {
		state.items = itemsData.value.items ?? [];
		state.totalPages = itemsData.value.pagination?.total_pages ?? 1;
	}
});

onServerPrefetch(async () => {
	await itemsSuspense();
	if (itemsData.value) {
		state.items = itemsData.value.items ?? [];
		state.totalPages = itemsData.value.pagination?.total_pages ?? 1;
	}
});

watch(
	() => [route.params.categoryFormId, route.params.subcategoryFormId, route.query.page, route.query.isPTS],
	([, , , newIsPTS]) => {
		state.isPTS = (newIsPTS === '1') ? true : false;

		if (!import.meta.env.SSR)
			window.scrollTo({ top: 0, behavior: 'smooth' });
	},
	{ immediate: true }
);

const queryClient = useQueryClient();
const prefetchCampItem = (itemFormId: string) => usePrefetchCampItem(queryClient, itemFormId);

const hoveredItem = ref<string | null>(null);

const getImageSrc = (item: CampItem, isHovered: boolean, thumbSize?: number) => {
	return prepareCampImage(item.mainImage, thumbSize);
};

useDelegatedTooltips();

// Loading skeleton: two rows of cards on desktop.
const SKELETON_CARD_COUNT = 6;
</script>

<template>
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

	<div v-if="isItemsPending" class="row g-4 mb-4 skeleton placeholder-glow">
		<span class="visually-hidden" role="status">Загрузка…</span>
		<div v-for="n in SKELETON_CARD_COUNT" :key="n" class="col-12 col-md-6 col-lg-4" aria-hidden="true">
			<div class="card h-100 atomic-shop-card">
				<div class="card-img-wrapper"></div>
				<div class="card-body d-flex flex-column">
					<h5 class="card-title mb-2"><span class="placeholder col-9"></span></h5>
					<p class="card-text mb-2"><span class="placeholder col-6"></span></p>
					<p class="card-text small mt-auto mb-0"><span class="placeholder col-5"></span></p>
				</div>
			</div>
		</div>
	</div>
	<div v-else class="row g-4 mb-4">
		<div v-for="item in state.items" :key="item.formId" class="col-12 col-md-6 col-lg-4">
			<RouterLink :to="`/f76-camp/${item.formId}-${item.slug}`" class="card h-100 text-decoration-none atomic-shop-card" @mouseenter="hoveredItem = item.formId; prefetchCampItem(item.formId)" @mouseleave="hoveredItem = null">
				<div v-if="item.isPTS" class="pts-badge-wrapper" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Доступно только на публичном тестовом сервере.">
					<div class="pts-badge">PTS</div>
				</div>
				<div class="card-img-wrapper">
					<img :src="getImageSrc(item, hoveredItem === item.formId, 512)" class="card-img-top" :alt="item.nameRu || item.nameEn || 'C.A.M.P. Item'" loading="lazy" @error="atomicShopHandleImageError">
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
