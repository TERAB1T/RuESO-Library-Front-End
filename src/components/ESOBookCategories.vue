<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, ref, watch, computed, onMounted } from 'vue';
import { usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { useWindowSize } from '@vueuse/core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { formatDateTime } from '@/utils';
import { trackLibraryDownload } from '@/analytics';

import type { LibraryMobileTab } from '@/types';

const route = useRoute();

const props = defineProps<{
	categories: any[]
	patches: any[]
	mobileTab: LibraryMobileTab
	lastUpdated: string
}>();

const emit = defineEmits<{
	(e: 'update:mobileTab', value: LibraryMobileTab): void
}>();

const state = reactive({
	currentCategoryId: Number(route.params.categoryId) ?? -1,
	currentPatchVersion: route.params.patchVersion ?? '-1'
});

const { width } = useWindowSize();
const isDesktop = computed(() => width.value > 991);
const isMountedClient = ref(false);
onMounted(() => { isMountedClient.value = true; });

const desktopPane = ref<'categories' | 'patches'>(state.currentPatchVersion !== '-1' ? 'patches' : 'categories');

const showCategoriesPane = computed(() =>
	(isMountedClient.value && !isDesktop.value) ? props.mobileTab === 'categories' : desktopPane.value === 'categories'
);
const showPatchesPane = computed(() =>
	(isMountedClient.value && !isDesktop.value) ? props.mobileTab === 'patches' : desktopPane.value === 'patches'
);

function onSelectMobileLink() {
	if (isMountedClient.value && !isDesktop.value) {
		emit('update:mobileTab', 'books');
	}
}

const sortedCategories = computed(() => {
	return [...(props.categories || [])].sort((a, b) => {
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
		if (state.currentCategoryId > 0) desktopPane.value = 'categories';
	},
	{ immediate: true }
);

watch(
	() => route.params.patchVersion,
	(newPatchVersion) => {
		state.currentPatchVersion = newPatchVersion ?? '-1';
		if (state.currentPatchVersion !== '-1') desktopPane.value = 'patches';
	},
	{ immediate: true }
);

const queryClient = useQueryClient();
const prefetchCategory = (categoryId: number) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string) => usePrefetchPatch(queryClient, patchVersion);
</script>

<template>
	<div class="book-categories-container">
		<div>
			<ul class="nav nav-tabs d-lg-none mobile-library-tabs" role="tablist">
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'books' }" type="button" @click="emit('update:mobileTab', 'books')">Книги</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'categories' }" type="button" @click="emit('update:mobileTab', 'categories')">Категории</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ active: mobileTab === 'patches' }" type="button" @click="emit('update:mobileTab', 'patches')">Патчи</button>
				</li>
			</ul>

			<div class="d-none d-lg-block">
				<div class="library-updated text-muted small">
					Последнее обновление:
					<time v-if="props.lastUpdated" :datetime="formatDateTime(props.lastUpdated)">{{ props.lastUpdated }}</time>
				</div>

				<div class="d-flex justify-content-center download-links">
					<a href="/files/eso-library.fb2" class="download-link" @click="trackLibraryDownload('fb2')">
						<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
						<span class="d-none d-xl-inline">Скачать в </span>.FB2
					</a>

					<a href="/files/eso-library.epub" class="download-link" @click="trackLibraryDownload('epub')">
						<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
						<span class="d-none d-xl-inline">Скачать в </span>.EPUB
					</a>
				</div>
			</div>

			<ul class="nav nav-tabs d-none d-lg-flex" id="categoriesTab" role="tablist">
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': showCategoriesPane }" type="button" role="tab" aria-controls="book-categories-pane" :aria-selected="showCategoriesPane" @click="desktopPane = 'categories'">Категории</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': showPatchesPane }" type="button" role="tab" aria-controls="book-patches-pane" :aria-selected="showPatchesPane" @click="desktopPane = 'patches'">Патчи</button>
				</li>
			</ul>

			<div class="tab-content" id="categoriesTabContent">
				<div class="tab-pane list-group list-group-flush eso-category-list" :class="{ 'active': showCategoriesPane }" id="book-categories-pane" role="tabpanel" aria-labelledby="book-categories-pane" tabindex="0">
					<RouterLink v-for="category in sortedCategories" :key="category.id" class="list-group-item list-group-item-action" :class="{ 'active': state.currentCategoryId === category.id }" :to="state.currentCategoryId === category.id ? '/library/eso' : `/library/eso/category/${category.id}-${category.slug}`" @mouseenter="prefetchCategory(category.id)" @click="onSelectMobileLink">
						{{ category.titleRu }}
					</RouterLink>
				</div>
				<div class="tab-pane list-group list-group-flush eso-category-list" :class="{ 'active': showPatchesPane }" id="book-patches-pane" role="tabpanel" aria-labelledby="book-patches-pane" tabindex="0">
					<RouterLink v-for="patch in props.patches" :key="patch.version" class="list-group-item list-group-item-action" :class="{ 'active': state.currentPatchVersion === patch.version }" :to="state.currentPatchVersion === patch.version ? '/library/eso' : `/library/eso/patch/${patch.version}-${patch.slug}`" @mouseenter="prefetchPatch(patch.version)" @click="onSelectMobileLink">
						{{ patch.version }} ({{ patch.nameRu }})
					</RouterLink>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.download-links {
	gap: 25px;
	margin: 10px 0 16px;
}

.download-link {
	display: flex;
	align-items: center;
	gap: 5px;
	color: var(--bs-primary);
	text-decoration: none;
	font-weight: 500;
	padding: 4px 8px;
	margin: -4px -8px;
	border-radius: var(--bs-border-radius, 0.375rem);

	&:hover {
		color: var(--bs-primary);
		text-decoration: none;
		background: color-mix(in srgb, var(--bs-primary), transparent 96%);
	}

	&:active {
		color: var(--bs-primary);
		background: color-mix(in srgb, var(--bs-primary), transparent 84%);
	}
}

.fa-dwnld-icon {
	height: 0.9em;
	width: 0.7875em;
}

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
		margin-top: 26px;
	}
}

.nav-tabs {
	position: sticky;
	top: 0;
	z-index: 3;
	margin-top: 28px;
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
	background: rgba(255,255,255,0.3);
}

.book-categories-container::-webkit-scrollbar-thumb:hover {
	background: rgba(255,255,255,0.4);
}

.book-categories-container:hover,
.book-categories-container:focus-within {
	scrollbar-color: rgba(255,255,255,0.3) transparent;
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
