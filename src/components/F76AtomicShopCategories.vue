<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, ref, watch, watchEffect, computed, onMounted } from 'vue';
import { usePrefetchAtomicShopCategory, usePrefetchAtomicShopSubcategory, usePrefetchAtomicShopAcquisitionType, usePrefetchAtomicShopAcquisitionSource } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize } from '@vueuse/core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatDateTime, ACQUISITION_TYPE_LABELS } from '@/utils';

import type { AtomicShopCategoryWithSubcategories, AcquisitionSource, AcquisitionSourcesByType, AtomicShopMobileTab } from '@/types';

const ACQUISITION_TYPE_ORDER = ['atx', 'season', 'miniseason'];
const NON_FILTERABLE_ACQUISITION_TYPES = ['season', 'miniseason'];

const route = useRoute();

const props = defineProps<{
	categories: AtomicShopCategoryWithSubcategories[],
	acquisition: AcquisitionSourcesByType[],
	mobileTab: AtomicShopMobileTab,
	lastUpdated: string
}>();

const emit = defineEmits<{
	(e: 'update:mobileTab', value: AtomicShopMobileTab): void
}>();

const state = reactive({
	expandedCategories: new Set<string>(),
	expandedAcquisitionTypes: new Set<string>()
});

const isPTS = computed(() => route.query.isPTS === '1');
const hasSupport = computed(() => route.query.hasSupport === '1');
const currentCatId = computed(() => (route.params.categoryFormId as string) || '-1');
const currentSubCatId = computed(() => (route.params.subcategoryFormId as string) || '-1');
const currentAcquisitionType = computed(() => (route.params.acquisitionType as string) || '-1');
const currentAcquisitionNumber = computed(() => route.params.acquisitionNumber ? Number(route.params.acquisitionNumber) : -1);

const { width } = useWindowSize();
const isDesktop = computed(() => width.value > 991);
const isMountedClient = ref(false);
onMounted(() => { isMountedClient.value = true; });

const desktopPane = ref<'categories' | 'acquisition'>(currentAcquisitionType.value !== '-1' ? 'acquisition' : 'categories');

const showCategoriesPane = computed(() =>
	(isMountedClient.value && !isDesktop.value) ? props.mobileTab === 'categories' : desktopPane.value === 'categories'
);
const showAcquisitionPane = computed(() =>
	(isMountedClient.value && !isDesktop.value) ? props.mobileTab === 'acquisition' : desktopPane.value === 'acquisition'
);

function onSelectMobileLink() {
	if (isMountedClient.value && !isDesktop.value) {
		emit('update:mobileTab', 'items');
	}
}

watchEffect(() => {
	const catId = currentCatId.value;
	const subId = currentSubCatId.value;

	if (catId !== '-1') state.expandedCategories.add(catId);

	if (subId !== '-1' && props.categories.length > 0) {
		const parent = props.categories.find(c => c.subcategories.some(s => s.formId === subId));
		if (parent) state.expandedCategories.add(parent.formId);
	}
});

watchEffect(() => {
	if (currentAcquisitionType.value !== '-1') state.expandedAcquisitionTypes.add(currentAcquisitionType.value);
});

watch(
	() => route.params.categoryFormId,
	(newCategoryFormId) => {
		if (newCategoryFormId) desktopPane.value = 'categories';
	}
);

watch(
	() => route.params.subcategoryFormId,
	(newSubcategoryFormId) => {
		if (newSubcategoryFormId) desktopPane.value = 'categories';
	}
);

watch(
	() => route.params.acquisitionType,
	(newAcquisitionType) => {
		if (newAcquisitionType) desktopPane.value = 'acquisition';
	}
);

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string) => usePrefetchAtomicShopCategory(queryClient, categoryFormId, isPTS, hasSupport);
const prefetchSubcategory = (subcategoryFormId: string) => usePrefetchAtomicShopSubcategory(queryClient, subcategoryFormId, isPTS, hasSupport);
const prefetchAcquisitionType = (type: string) => usePrefetchAtomicShopAcquisitionType(queryClient, type, isPTS, hasSupport);
const prefetchAcquisitionSource = (type: string, number: number) => usePrefetchAtomicShopAcquisitionSource(queryClient, type, number, isPTS, hasSupport);

const toggleCategory = (categoryFormId: string, event: Event) => {
	event.preventDefault();
	event.stopPropagation();

	if (state.expandedCategories.has(categoryFormId)) {
		state.expandedCategories.delete(categoryFormId);
	} else {
		state.expandedCategories.add(categoryFormId);
	}
};

const isCategoryExpanded = (categoryFormId: string) => {
	return state.expandedCategories.has(categoryFormId);
};

const hasSubcategories = (category: AtomicShopCategoryWithSubcategories) => {
	return category.subcategories && category.subcategories.length > 0;
};

const buildUrl = (type: 'category' | 'subcategory', item: any) => {
	const isCurrent = type === 'category'
		? currentCatId.value === item.formId && currentSubCatId.value === '-1'
		: currentSubCatId.value === item.formId;

	const path = isCurrent
		? '/f76-atomic-shop'
		: `/f76-atomic-shop/${type}/${item.formId}-${item.slug}`;

	return {
		path,
		query: {
			...(route.query.filter && { filter: route.query.filter }),
			...(isPTS.value && { isPTS: '1' }),
			...(hasSupport.value && { hasSupport: '1' })
		}
	};
};

const toggleAcquisitionType = (type: string, event: Event) => {
	event.preventDefault();
	event.stopPropagation();

	if (state.expandedAcquisitionTypes.has(type)) {
		state.expandedAcquisitionTypes.delete(type);
	} else {
		state.expandedAcquisitionTypes.add(type);
	}
};

const isAcquisitionTypeExpanded = (type: string) => {
	return state.expandedAcquisitionTypes.has(type);
};

const sortedAcquisitionTypes = computed(() => {
	return [...props.acquisition]
		.filter(group => group.type !== 'atx')
		.sort((a, b) => ACQUISITION_TYPE_ORDER.indexOf(a.type) - ACQUISITION_TYPE_ORDER.indexOf(b.type));
});

const sortedAcquisitionSources = (group: AcquisitionSourcesByType) => {
	return [...group.sources].sort((a, b) => b.id - a.id);
};

const hasMultipleSources = (group: AcquisitionSourcesByType) => {
	return group.sources && group.sources.length > 1;
};

const getSourceLabel = (type: string, source: AcquisitionSource) => {
	if (type === 'season') return `Сезон ${source.number}`;
	return source.nameRu || source.nameEn || 'Мини-сезон';
};

const buildAcquisitionTypeUrl = (type: string) => {
	const isCurrent = currentAcquisitionType.value === type && currentAcquisitionNumber.value === -1;
	const path = isCurrent ? '/f76-atomic-shop' : `/f76-atomic-shop/${type}`;

	return {
		path,
		query: {
			...(route.query.filter && { filter: route.query.filter }),
			...(isPTS.value && { isPTS: '1' }),
			...(hasSupport.value && { hasSupport: '1' })
		}
	};
};

const buildAcquisitionSourceUrl = (type: string, source: AcquisitionSource) => {
	const isCurrent = currentAcquisitionType.value === type && currentAcquisitionNumber.value === source.number;
	const path = isCurrent ? '/f76-atomic-shop' : `/f76-atomic-shop/${type}/${source.number}-${source.slug}`;

	return {
		path,
		query: {
			...(route.query.filter && { filter: route.query.filter }),
			...(isPTS.value && { isPTS: '1' }),
			...(hasSupport.value && { hasSupport: '1' })
		}
	};
};

const togglePTS = () => {
	const query = { ...route.query, isPTS: !isPTS.value ? '1' : undefined, hasSupport: undefined, page: undefined } as Record<string, any>;
	Object.keys(query).forEach(key => !query[key] && delete query[key]);
	return query;
};
const toggleSupport = () => {
	const query = { ...route.query, hasSupport: !hasSupport.value ? '1' : undefined, isPTS: undefined, page: undefined } as Record<string, any>;
	Object.keys(query).forEach(key => !query[key] && delete query[key]);
	return query;
};
</script>

<template>
	<div class="book-categories-container">
		<div>
			<ul class="nav nav-tabs d-lg-none mobile-library-tabs" role="tablist">
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'items' }" type="button" @click="emit('update:mobileTab', 'items')">Товары</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'categories' }" type="button" @click="emit('update:mobileTab', 'categories')">Категории</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'acquisition' }" type="button" @click="emit('update:mobileTab', 'acquisition')">Сезоны</button>
				</li>
			</ul>

			<div class="d-none d-lg-block">
				<div class="library-updated text-muted small">
					Последнее обновление:
					<time v-if="props.lastUpdated" :datetime="formatDateTime(props.lastUpdated)">{{ props.lastUpdated }}</time>
				</div>
			</div>

			<ul class="nav nav-tabs d-none d-lg-flex" id="atomicShopSidebarTab" role="tablist">
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': showCategoriesPane }" type="button" role="tab" aria-controls="atomic-shop-categories-pane" :aria-selected="showCategoriesPane" @click="desktopPane = 'categories'">Категории</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': showAcquisitionPane }" type="button" role="tab" aria-controls="atomic-shop-acquisition-pane" :aria-selected="showAcquisitionPane" @click="desktopPane = 'acquisition'">Сезоны</button>
				</li>
			</ul>

			<div class="tab-content" id="atomicShopSidebarTabContent">
				<div class="tab-pane" :class="{ 'active': showCategoriesPane }" id="atomic-shop-categories-pane" role="tabpanel" aria-labelledby="atomic-shop-categories-pane" tabindex="0">
					<div class="list-group list-group-flush mb-3">
						<div v-for="category in props.categories" :key="category.formId" class="category-wrapper">
							<div class="d-flex align-items-stretch category-item">
								<button v-if="hasSubcategories(category)" @click="toggleCategory(category.formId, $event)" class="btn btn-sm category-toggle" :class="{
									'active': currentCatId === category.formId && currentSubCatId === '-1'
								}" :aria-expanded="isCategoryExpanded(category.formId)" :aria-label="isCategoryExpanded(category.formId) ? 'Свернуть' : 'Развернуть'">
									<FontAwesomeIcon :icon="isCategoryExpanded(category.formId) ? faChevronDown : faChevronRight" class="text-muted category-toggle-icon" size="sm" />
								</button>

								<RouterLink :to="buildUrl('category', category)" class="list-group-item list-group-item-action flex-grow-1" :class="{
									'active': currentCatId === category.formId && currentSubCatId === '-1',
									'has-subcategories': hasSubcategories(category)
								}" @mouseenter="prefetchCategory(category.formId)" @click="onSelectMobileLink">
									{{ category.nameRu }}
								</RouterLink>
							</div>

							<Transition name="expand">
								<div v-if="hasSubcategories(category) && isCategoryExpanded(category.formId)" class="subcategories-list">
									<RouterLink v-for="subcategory in category.subcategories" :key="subcategory.formId" :to="buildUrl('subcategory', subcategory)" class="list-group-item list-group-item-action subcategory-item" :class="{ 'active': currentSubCatId === subcategory.formId }" @mouseenter="prefetchSubcategory(subcategory.formId)" @click="onSelectMobileLink">
										{{ subcategory.nameRu }}
									</RouterLink>
								</div>
							</Transition>
						</div>
						<hr>
						<div class="category-wrapper category-additional">
							<div class="d-flex align-items-stretch category-item">
								<RouterLink :to="{ path: route.path, query: togglePTS() }" class="list-group-item list-group-item-action flex-grow-1" :class="{ active: isPTS }" @click="onSelectMobileLink">
									Тестовый сервер (PTS)
								</RouterLink>
							</div>
							<div class="d-flex align-items-stretch category-item">
								<RouterLink :to="{ path: route.path, query: toggleSupport() }" class="list-group-item list-group-item-action flex-grow-1" :class="{ active: hasSupport }" @click="onSelectMobileLink">
									Продается в поддержке
								</RouterLink>
							</div>
						</div>
					</div>
				</div>

				<div class="tab-pane" :class="{ 'active': showAcquisitionPane }" id="atomic-shop-acquisition-pane" role="tabpanel" aria-labelledby="atomic-shop-acquisition-pane" tabindex="0">
					<div class="list-group list-group-flush mb-3">
						<div v-for="group in sortedAcquisitionTypes" :key="group.type" class="category-wrapper">
							<div class="d-flex align-items-stretch category-item">
								<button v-if="hasMultipleSources(group)" @click="toggleAcquisitionType(group.type, $event)" class="btn btn-sm category-toggle" :class="{
									'active': currentAcquisitionType === group.type && currentAcquisitionNumber === -1
								}" :aria-expanded="isAcquisitionTypeExpanded(group.type)" :aria-label="isAcquisitionTypeExpanded(group.type) ? 'Свернуть' : 'Развернуть'">
									<FontAwesomeIcon :icon="isAcquisitionTypeExpanded(group.type) ? faChevronDown : faChevronRight" class="text-muted category-toggle-icon" size="sm" />
								</button>

								<RouterLink v-if="!NON_FILTERABLE_ACQUISITION_TYPES.includes(group.type)" :to="buildAcquisitionTypeUrl(group.type)" class="list-group-item list-group-item-action flex-grow-1" :class="{
									'active': currentAcquisitionType === group.type && currentAcquisitionNumber === -1,
									'has-subcategories': hasMultipleSources(group)
								}" @mouseenter="prefetchAcquisitionType(group.type)" @click="onSelectMobileLink">
									{{ ACQUISITION_TYPE_LABELS[group.type] || group.type }}
								</RouterLink>
								<button v-else type="button" class="list-group-item list-group-item-action flex-grow-1 text-start" :class="{ 'has-subcategories': hasMultipleSources(group) }" @click="toggleAcquisitionType(group.type, $event)">
									{{ ACQUISITION_TYPE_LABELS[group.type] || group.type }}
								</button>
							</div>

							<Transition name="expand">
								<div v-if="hasMultipleSources(group) && isAcquisitionTypeExpanded(group.type)" class="subcategories-list">
									<RouterLink v-for="source in sortedAcquisitionSources(group)" :key="source.id" :to="buildAcquisitionSourceUrl(group.type, source)" class="list-group-item list-group-item-action subcategory-item" :class="{ 'active': currentAcquisitionType === group.type && currentAcquisitionNumber === source.number }" @mouseenter="prefetchAcquisitionSource(group.type, source.number)" @click="onSelectMobileLink">
										{{ getSourceLabel(group.type, source) }}
									</RouterLink>
								</div>
							</Transition>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.book-categories-container {
	height: calc(100vh - 67px);

	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-gutter: stable;

	scrollbar-width: thin;
	scrollbar-color: transparent transparent;
}

@media (min-width: 992px) {
	.book-categories-container > div > .d-none.d-lg-block {
		margin-top: 60px;
	}
}

.nav-tabs {
	position: sticky;
	top: 0;
	z-index: 3;
	margin-top: 28px;
}

@media (min-width: 992px) and (max-width: 1040px) {
	.nav-tabs .nav-link {
		padding: 15px 20px;
	}
}

.book-categories-container::-webkit-scrollbar {
	width: 6px;
}

.book-categories-container::-webkit-scrollbar-track {
	background: transparent;
}

.book-categories-container::-webkit-scrollbar-thumb {
	background: transparent;
	border-radius: 3px;
	transition: background-color 0.2s ease;
}

.book-categories-container:hover::-webkit-scrollbar-thumb,
.book-categories-container:focus-within::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.3);
}

.book-categories-container::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.4);
}

.book-categories-container:hover,
.book-categories-container:focus-within {
	scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.category-wrapper {
	position: relative;
}

.category-item {
	position: relative;

	&:hover .list-group-item:not(.active) {
		color: var(--bs-primary);
	}
}

.category-toggle {
	width: 36px;
	border: none;
	background: transparent;
	border-radius: 0;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.15s ease;
}

.category-toggle:hover {
	background-color: rgba(0, 0, 0, 0.05);
}

.category-toggle:focus {
	box-shadow: none;
	outline: none;
}

.list-group-item {
	border: none;
}

.list-group-item:not(.active) {
	border-radius: 0 !important;
	transition: all 0.15s ease;
	background: transparent;
}

.list-group-item.has-subcategories {
	border-top-left-radius: 0 !important;
	border-bottom-left-radius: 0 !important;
	padding-left: 5px;
}

.list-group-item:not(.has-subcategories) {
	border-top-left-radius: 0 !important;
	border-bottom-left-radius: 0 !important;
	padding-left: 36px;
}

.list-group-item+.list-group-item.active {
	margin-top: 0;
	border-top-width: 0;
}

.subcategories-list {
	background-color: rgba(0, 0, 0, 0.02);
	border-left: 1px solid #ffffff14;
	margin-left: 16px;
}

.subcategory-item {
	padding-left: 30px;
	font-size: 0.95rem;
	border-left: none;
	border-right: none;

	&:not(.active):hover {
		color: var(--bs-primary);
	}
}

/* Анимация раскрытия */
.expand-enter-active,
.expand-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	max-height: 0;
	opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
	max-height: 1000px;
	opacity: 1;
}

.category-toggle.active {
	background-color: var(--bs-primary);
	transition: none;
}

.category-toggle.active .category-toggle-icon {
	color: black !important;
}

.svg-inline--fa {
	height: 1em;
	width: var(--fa-width, 1.25em);
	font-size: calc(14 / 16 * 1em);
	line-height: calc(1 / 14 * 1em);
}

@media (max-width: 991.98px) {
	.book-categories-container {
		height: auto;
		position: static;
		overflow: visible;
	}
	.nav-tabs {
		position: static;
	}
	.mobile-library-tabs {
		position: sticky;
		top: 66px;
		z-index: 3;
	}
}

@media (max-width: 767.98px) {
	.mobile-library-tabs {
		top: 56px;
	}
}

.mobile-library-tabs {
	margin-top: 1rem;
	margin-bottom: 0;
}
</style>
