<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { reactive, watchEffect, computed } from 'vue';
import { usePrefetchAtomicShopCategory, usePrefetchAtomicShopSubcategory } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatDateTime } from '@/utils';

import type { AtomicShopCategoryWithSubcategories } from '@/types';

const route = useRoute();
const router = useRouter();

const props = defineProps<{
	categories: AtomicShopCategoryWithSubcategories[],
	lastUpdated: string
}>();

const state = reactive({
    expandedCategories: new Set<string>()
});

const isPTS = computed(() => route.query.isPTS === '1');
const hasSupport = computed(() => route.query.hasSupport === '1');
const currentCatId = computed(() => (route.params.categoryFormId as string) || '-1');
const currentSubCatId = computed(() => (route.params.subcategoryFormId as string) || '-1');

watchEffect(() => {
    const catId = currentCatId.value;
    const subId = currentSubCatId.value;

    if (catId !== '-1') state.expandedCategories.add(catId);

    if (subId !== '-1' && props.categories.length > 0) {
        const parent = props.categories.find(c => c.subcategories.some(s => s.formId === subId));
        if (parent) state.expandedCategories.add(parent.formId);
    }
});

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string) => usePrefetchAtomicShopCategory(queryClient, categoryFormId, isPTS, hasSupport);
const prefetchSubcategory = (subcategoryFormId: string) => usePrefetchAtomicShopSubcategory(queryClient, subcategoryFormId, isPTS, hasSupport);

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
            ...(isPTS.value && { isPTS: '1' }),
            ...(hasSupport.value && { hasSupport: '1' })
        }
    };
};

const updateFilters = (updates: Record<string, string | undefined>) => {
	const query = { ...route.query, ...updates, page: undefined } as Record<string, any>;

	Object.keys(query).forEach(key => !query[key] && delete query[key]);
	router.push({ path: route.path, query });
};

const togglePTS = () => updateFilters({ isPTS: !isPTS.value ? '1' : undefined, hasSupport: undefined });
const toggleSupport = () => updateFilters({ hasSupport: !hasSupport.value ? '1' : undefined, isPTS: undefined });
</script>

<template>
	<div class="book-categories-container">
		<div class="p-3">
			<div class="library-updated text-muted small">
				Последнее обновление:
				<time v-if="props.lastUpdated" :datetime="formatDateTime(props.lastUpdated)">
					{{ props.lastUpdated }}
				</time>
			</div>

			<div class="list-group list-group-flush mb-3">
				<h5 class="list-group-item h5-list-group-item">Категории</h5>
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
						}" @mouseenter="prefetchCategory(category.formId)">
							{{ category.nameRu }}
						</RouterLink>
					</div>

					<Transition name="expand">
						<div v-if="hasSubcategories(category) && isCategoryExpanded(category.formId)" class="subcategories-list">
							<RouterLink v-for="subcategory in category.subcategories" :key="subcategory.formId" :to="buildUrl('subcategory', subcategory)" class="list-group-item list-group-item-action subcategory-item" :class="{ 'active': currentSubCatId === subcategory.formId }" @mouseenter="prefetchSubcategory(subcategory.formId)">
								{{ subcategory.nameRu }}
							</RouterLink>
						</div>
					</Transition>
				</div>
				<hr>
				<div class="category-wrapper category-additional">
					<div class="d-flex align-items-stretch category-item">
						<a href="#" class="list-group-item list-group-item-action flex-grow-1" :class="{ active: isPTS }" @click.prevent="togglePTS">
							Тестовый сервер (PTS)
						</a>
					</div>
					<div class="d-flex align-items-stretch category-item">
						<a href="#" class="list-group-item list-group-item-action flex-grow-1" :class="{ active: hasSupport }" @click.prevent="toggleSupport">
							Продается в поддержке
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.library-updated {
	margin-top: 5px;
}

.list-group {
	background: var(--bs-block-bg);
	border-radius: var(--bs-block-border-radius) !important;
	padding: 0 1.2rem 1rem;
	margin-top: 11px;
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

.library-updated {
	padding: 0.75rem 1rem;
	text-align: center;
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

.h5-list-group-item {
	padding: 20px 0 !important;
	font-size: 1.125rem;
	text-align: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
	background: var(--bs-block-bg) !important;
	position: sticky;
	top: 0;
	z-index: 3;
}

.category-toggle.active {
	background-color: var(--bs-primary);
	transition: none;
}

.category-toggle.active .category-toggle-icon {
	color: black !important;
}

/* Sidebar */

.book-categories-container {
	height: calc(100vh - 67px);

	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-gutter: stable;

	scrollbar-width: thin;
	scrollbar-color: transparent transparent;
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

/* Icons */

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

	.h5-list-group-item {
		position: static;
	}
}
</style>
