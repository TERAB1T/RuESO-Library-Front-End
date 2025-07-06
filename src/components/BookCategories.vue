<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { reactive, watch, computed, onMounted } from 'vue';
import { usePrefetchCategory, usePrefetchPatch } from '@/composables/useApi';
import { useQueryClient } from '@tanstack/vue-query';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

const route = useRoute();

const props = defineProps<{
	categories: any[]
	patches: any[]
}>();

const state = reactive({
	currentCategoryId: Number(route.params.categoryId) ?? -1,
	currentPatchVersion: route.params.patchVersion ?? '-1'
});

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

const queryClient = useQueryClient();
const prefetchCategory = (categoryId: number) => usePrefetchCategory(queryClient, categoryId);
const prefetchPatch = (patchVersion: string) => usePrefetchPatch(queryClient, patchVersion);

onMounted(async () => {
	const { Collapse } = await import("bootstrap");

	const collapseElement = document.querySelector('#collapse-categories');
	const bsCollapse = collapseElement ? new Collapse(collapseElement, { toggle: false }) : null;

	document.querySelector('#collapse-categories')?.addEventListener('click', (event) => {
		const link = (event.target as Element).closest('.list-group-item');
		if (!link) return;

		if (window.innerWidth <= 768) bsCollapse?.hide();
	});
});
</script>

<template>
	<button class="btn btn-primary w-100 d-lg-none mt-4" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-categories" aria-expanded="false" aria-controls="collapse-categories">
		Показать категории
	</button>

	<div id="collapse-categories" class="collapse d-lg-block">
		<div class="p-3">
			<div class="d-flex justify-content-between gap-3 flex-nowrap">
				<a href="/files/eso-library.fb2" role="button" class="btn btn-primary flex-fill d-flex align-items-center justify-content-center download-button">
					<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
					.FB2
				</a>

				<a href="/files/eso-library.epub" role="button" class="btn btn-primary flex-fill d-flex align-items-center justify-content-center download-button">
					<FontAwesomeIcon :icon="faDownload" class="fa-dwnld-icon" />
					.EPUB
				</a>
			</div>

			<ul class="nav nav-tabs" id="categoriesTab" role="tablist">
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': state.currentPatchVersion === '-1' }" id="book-categories-tab" data-bs-toggle="tab" data-bs-target="#book-categories-pane" type="button" role="tab" aria-controls="book-categories-pane" aria-selected="true">Категории</button>
				</li>
				<li class="nav-item" role="presentation">
					<button class="nav-link" :class="{ 'active': state.currentPatchVersion !== '-1' }" id="book-patches-tab" data-bs-toggle="tab" data-bs-target="#book-patches-pane" type="button" role="tab" aria-controls="book-patches-pane" aria-selected="false">Патчи</button>
				</li>
			</ul>

			<div class="tab-content" id="categoriesTabContent">
				<div class="tab-pane list-group list-group-flush" :class="{ 'active': state.currentPatchVersion === '-1' }" id="book-categories-pane" role="tabpanel" aria-labelledby="book-categories-pane" tabindex="0">
					<RouterLink v-for="category in sortedCategories" :key="category.id" class="list-group-item list-group-item-action" :class="{ 'active': state.currentCategoryId === category.id }" :to="state.currentCategoryId === category.id ? '/library/eso' : `/library/eso/category/${category.id}-${category.slug}`" @mouseenter="prefetchCategory(category.id)">
						{{ category.titleRu }}
					</RouterLink>
				</div>
				<div class="tab-pane list-group list-group-flush" :class="{ 'active': state.currentPatchVersion !== '-1' }" id="book-patches-pane" role="tabpanel" aria-labelledby="book-patches-pane" tabindex="0">
					<RouterLink v-for="patch in props.patches" :key="patch.version" class="list-group-item list-group-item-action" :class="{ 'active': state.currentPatchVersion === patch.version }" :to="state.currentPatchVersion === patch.version ? '/library/eso' : `/library/eso/patch/${patch.version}-${patch.slug}`" @mouseenter="prefetchPatch(patch.version)">
						{{ patch.version }} ({{ patch.nameRu }})
					</RouterLink>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.download-button {
	height: 48px;
	margin-bottom: 20px;
}

.fa-dwnld-icon {
	height: 1em;
	margin-right: 10px;
}
</style>
