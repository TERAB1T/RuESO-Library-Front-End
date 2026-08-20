<script setup lang="ts">
import { reactive, ref, computed, watch, watchEffect, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import F76AtomicShopCategories from '@/components/F76AtomicShopCategories.vue';
import F76AtomicShopItemList from '@/components/F76AtomicShopItemList.vue';
import { useHead, injectHead } from '@unhead/vue';
import { formatDateTime, formatSeasonDescription, ACQUISITION_TYPE_LABELS } from '@/utils';
import { useFetchAtomicShopCategories, useFetchAtomicShopAcquisition, useFetchAtomicShopUpdated } from '@/composables/useApi';

import type { AtomicShopCategoryWithSubcategories, AcquisitionSourcesByType, AtomicShopMobileTab } from '@/types';

const HOME_DESCRIPTION = 'Полный каталог товаров, которые появлялись или появятся в Атомной лавке либо в сезонах Fallout 76.';

const route = useRoute();
const head = injectHead();

const mobileTab = ref<AtomicShopMobileTab>('items');

const state = reactive({
	currentCategoryFormId: route.params.categoryFormId ?? '-1',
	currentSubcategoryFormId: route.params.subcategoryFormId ?? '-1',
	currentAcquisitionType: route.params.acquisitionType ?? '-1',
	currentAcquisitionNumber: route.params.acquisitionNumber ? Number(route.params.acquisitionNumber) : -1,
	categories: [] as AtomicShopCategoryWithSubcategories[],
	acquisition: [] as AcquisitionSourcesByType[],
	lastUpdated: ''
});

const categoryInfo = computed(() =>
	state.currentSubcategoryFormId === '-1' && state.currentCategoryFormId !== '-1'
		? state.categories.find(cat => cat.formId === state.currentCategoryFormId)
		: undefined
);
const subcategoryInfo = computed(() =>
	state.currentSubcategoryFormId !== '-1'
		? state.categories.flatMap(cat => cat.subcategories).find(sub => sub.formId === state.currentSubcategoryFormId)
		: undefined
);
const acquisitionSourceInfo = computed(() =>
	state.currentAcquisitionNumber !== -1
		? state.acquisition.find(group => group.type === state.currentAcquisitionType)?.sources.find(s => s.number === state.currentAcquisitionNumber)
		: undefined
);
const acquisitionSourceYear = computed(() => {
	const ts = acquisitionSourceInfo.value?.endDate ?? acquisitionSourceInfo.value?.startDate;
	return ts ? new Date(ts * 1000).getFullYear() : '';
});
const acquisitionSourceHeading = computed(() => {
	if (!acquisitionSourceInfo.value) return '';
	const name = acquisitionSourceInfo.value.nameRu;

	if (state.currentAcquisitionType === 'season') {
		return name ? `Сезон ${acquisitionSourceInfo.value.number}: «${name}»` : `Сезон ${acquisitionSourceInfo.value.number}`;
	}

	if (state.currentAcquisitionType === 'miniseason') {
		const year = acquisitionSourceYear.value;
		if (name) return year ? `Мини-сезон ${year}: «${name}»` : `Мини-сезон: «${name}»`;
		return year ? `Мини-сезон ${year}` : 'Мини-сезон';
	}

	return name ? `Атомная лавка: ${name}` : 'Атомная лавка';
});
const acquisitionSourceDescription = computed(() => {
	if (!acquisitionSourceInfo.value) return '';
	if (state.currentAcquisitionType !== 'season' && state.currentAcquisitionType !== 'miniseason') return '';

	return formatSeasonDescription(
		state.currentAcquisitionType,
		acquisitionSourceInfo.value.number,
		acquisitionSourceInfo.value.nameRu,
		acquisitionSourceInfo.value.nameEn,
		acquisitionSourceInfo.value.startDate,
		acquisitionSourceInfo.value.endDate
	);
});

const updateHead = () => {
	let metaTitle = `Атомная лавка | Fallout 76`;
	let metaDescription = HOME_DESCRIPTION;
	let metaLink = 'https://rueso.ru/f76-atomic-shop/';
	let metaIcon = `https://rueso.ru/public/img/main-card-atomic-shop.jpg`;

	if (subcategoryInfo.value) {
		metaTitle = `${subcategoryInfo.value.nameRu} | Атомная лавка F76`;
		metaLink = `${metaLink}category/${subcategoryInfo.value.formId}-${subcategoryInfo.value.slug}`;
		metaDescription = `Полный каталог товаров из подкатегории «${subcategoryInfo.value.nameRu}» Атомной лавки Fallout 76.`;
	}
	else if (categoryInfo.value) {
		metaTitle = `${categoryInfo.value.nameRu} | Атомная лавка F76`;
		metaLink = `${metaLink}category/${categoryInfo.value.formId}-${categoryInfo.value.slug}`;
		metaDescription = `Полный каталог товаров из категории «${categoryInfo.value.nameRu}» Атомной лавки Fallout 76.`;
	}
	else if (acquisitionSourceInfo.value) {
		metaTitle = `${acquisitionSourceHeading.value} | Атомная лавка F76`;
		metaLink = `${metaLink}${state.currentAcquisitionType}/${acquisitionSourceInfo.value.number}-${acquisitionSourceInfo.value.slug}`;
		metaDescription = acquisitionSourceDescription.value || metaDescription;
	}
	else if (state.currentAcquisitionType !== '-1') {
		const label = ACQUISITION_TYPE_LABELS[state.currentAcquisitionType as string] || state.currentAcquisitionType;
		metaTitle = `${label} | Атомная лавка F76`;
		metaLink = `${metaLink}${state.currentAcquisitionType}`;
		metaDescription = `Полный каталог товаров из раздела «${label}» Атомной лавки Fallout 76.`;
	}

	useHead({
		title: metaTitle,
		meta: [
			{ name: 'description', content: metaDescription },

			{ property: 'og:title', content: metaTitle },
			{ property: 'og:description', content: metaDescription },
			{ property: 'og:image', content: metaIcon },
			{ property: 'og:url', content: metaLink },
			{ property: 'og:locale', content: 'ru_RU' },
			{ property: 'og:site_name', content: 'RuESO' },

			{ name: 'twitter:title', content: metaTitle },
			{ name: 'twitter:description', content: metaDescription },
			{ name: 'twitter:image', content: metaIcon },
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:creator', content: '@TERAB1T' },
		],
		link: [
			{ rel: 'canonical', href: metaLink },
		]
	}, { head });
};

const { data: categoriesData, suspense: categoriesSuspense, isSuccess: isCategoriesFetched } = useFetchAtomicShopCategories();
const { data: acquisitionData, suspense: acquisitionSuspense, isSuccess: isAcquisitionFetched } = useFetchAtomicShopAcquisition();
const { data: atomicShopUpdatedData, suspense: atomicShopUpdatedSuspense, isSuccess: isAtomicShopUpdatedFetched } = useFetchAtomicShopUpdated();

watchEffect(() => {
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (acquisitionData.value) {
		state.acquisition = acquisitionData.value;
	}

	if (atomicShopUpdatedData.value) {
		state.lastUpdated = atomicShopUpdatedData.value.lastModified;
	}

	updateHead();
});

watch(
	() => route.params.categoryFormId,
	(newCategoryFormId) => {
		state.currentCategoryFormId = newCategoryFormId ?? '-1';
	},
	{ immediate: true }
);

watch(
	() => route.params.subcategoryFormId,
	(newSubcategoryFormId) => {
		state.currentSubcategoryFormId = newSubcategoryFormId ?? '-1';
	},
	{ immediate: true }
);

watch(
	() => [route.params.acquisitionType, route.params.acquisitionNumber],
	([newAcquisitionType, newAcquisitionNumber]) => {
		state.currentAcquisitionType = newAcquisitionType ?? '-1';
		state.currentAcquisitionNumber = newAcquisitionNumber ? Number(newAcquisitionNumber) : -1;
	},
	{ immediate: true }
);

onServerPrefetch(async () => {
	await Promise.all([
		categoriesSuspense(),
		acquisitionSuspense(),
		atomicShopUpdatedSuspense(),
	]);
	if (categoriesData.value) {
		state.categories = categoriesData.value;
	}

	if (acquisitionData.value) {
		state.acquisition = acquisitionData.value;
	}

	if (atomicShopUpdatedData.value) {
		state.lastUpdated = atomicShopUpdatedData.value.lastModified;
	}

	updateHead();
});
</script>

<template>
	<div class="container-xl">
		<div class="atomic-shop-grid" style="position: relative;">
			<div class="atomic-shop-main">
				<div class="library-header">
					<template v-if="subcategoryInfo && subcategoryInfo.nameRu">
						<h2>Атомная лавка: {{ subcategoryInfo.nameRu === 'S.P.E.C.I.A.L.' ? subcategoryInfo.nameRu : subcategoryInfo.nameRu.toLowerCase() }}</h2>
					</template>
					<template v-else-if="categoryInfo && categoryInfo.nameRu">
						<h2>Атомная лавка: {{ categoryInfo.nameRu === 'C.A.M.P.' ? categoryInfo.nameRu : categoryInfo.nameRu.toLowerCase() }}</h2>
					</template>
					<template v-else-if="acquisitionSourceInfo">
						<h2>{{ acquisitionSourceHeading }}</h2>
						<p class="library-intro">{{ acquisitionSourceDescription }}</p>
					</template>
					<template v-else-if="state.currentAcquisitionType !== '-1'">
						<h2>Атомная лавка: {{ ACQUISITION_TYPE_LABELS[state.currentAcquisitionType as string] || state.currentAcquisitionType }}</h2>
					</template>
					<template v-else>
						<h2>Атомная лавка Fallout 76</h2>
						<p class="library-intro">{{ HOME_DESCRIPTION }}</p>
					</template>
				</div>

				<div class="d-lg-none d-flex justify-content-between align-items-center">
					<div class="text-muted small fst-italic">
						<span class="d-none d-md-inline">Последнее обновление: </span><span class="d-md-none">Обновлено: </span><time v-if="state.lastUpdated" :datetime="formatDateTime(state.lastUpdated)">{{ state.lastUpdated }}</time>
					</div>
				</div>

				<ul class="nav nav-tabs d-lg-none mobile-library-tabs" :class="{ 'd-none': mobileTab !== 'items' }" role="tablist">
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'items' }" type="button" @click="mobileTab = 'items'">Товары</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'categories' }" type="button" @click="mobileTab = 'categories'">Категории</button>
					</li>
					<li class="nav-item" role="presentation">
						<button class="nav-link" :class="{ active: mobileTab === 'acquisition' }" type="button" @click="mobileTab = 'acquisition'">Сезоны</button>
					</li>
				</ul>

				<div class="atomic-shop-items mobile-items-content d-lg-block" :class="{ 'd-none': mobileTab !== 'items' }">
					<F76AtomicShopItemList :categories="state.categories" />
				</div>
			</div>

			<div class="atomic-shop-sidebar book-categories-column d-lg-block" :class="{ 'd-none': mobileTab === 'items' }">
				<F76AtomicShopCategories :categories="state.categories" :acquisition="state.acquisition" :lastUpdated="state.lastUpdated" v-model:mobile-tab="mobileTab" />
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.atomic-shop-grid {
	display: grid;
	grid-template-columns: 1fr;
}

@media (min-width: 572.02px) and (max-width: 1400px) {
	.atomic-shop-grid {
		padding-left: 1rem;
		padding-right: 1rem;
	}
}

@media (min-width: 992px) {
	.atomic-shop-grid {
		grid-template-columns: 3fr 1fr;
		column-gap: 1.5rem;
	}
	.atomic-shop-main {
		grid-column: 1;
		grid-row: 1;
	}
	.atomic-shop-sidebar {
		grid-column: 2;
		grid-row: 1;
	}
}

.library-header {
	margin-top: 20px;
}

h2 {
	font-size: 2rem;
}

.library-intro {
	color: var(--bs-secondary-color);
	margin: -4px 0 24px;
	line-height: 1.55;
}

@media (max-width: 991.98px) {
	h2 {
		font-size: calc(1.325rem + .9vw);
	}
	.library-intro {
		margin-bottom: 10px;
	}
	.mobile-library-tabs {
		position: sticky;
		top: 66px;
		z-index: 3;
	}
	.mobile-items-content {
		background: var(--bs-block-bg);
		border-bottom-left-radius: var(--bs-block-border-radius);
		border-bottom-right-radius: var(--bs-block-border-radius);
		padding: 1rem 1.2rem;
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

.book-categories-column {
	position: sticky;
	top: 67px;
	height: calc(100vh - 67px);
}

@media (max-width: 991.98px) {
	.book-categories-column {
		height: auto;
		position: static;
	}
}
</style>
