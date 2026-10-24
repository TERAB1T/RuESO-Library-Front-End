<script setup lang="ts">
import { computed } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { prepareCampImage, atomicShopHandleImageError } from '@/utils';
import { usePrefetchCampCategory, usePrefetchCampSubcategory } from '@/composables/useApi';
import F76CampRecipeComponents from '@/components/F76CampRecipeComponents.vue';

import type { CampItemWithRelations, CampCategoryWithSubcategories, CampSubcategory } from '@/types';

const props = defineProps<{
	item: CampItemWithRelations;
	categoryInfo: CampCategoryWithSubcategories | null | undefined;
	subcategoryInfo: CampSubcategory | null | undefined;
	withImage?: boolean;
}>();

const queryClient = useQueryClient();
const prefetchCategory = (categoryFormId: string | undefined) => usePrefetchCampCategory(queryClient, categoryFormId);
const prefetchSubcategory = (subcategoryFormId: string | undefined) => usePrefetchCampSubcategory(queryClient, subcategoryFormId);

const placementBadges = computed(() => [
	{ key: 'camp', label: 'C.A.M.P.', available: !!props.item.camp },
	{ key: 'shelter', label: 'Укрытия', available: !!props.item.shelter },
	{ key: 'workshop', label: 'Мастерские', available: !!props.item.workshop },
]);

const maximumEntries = computed(() => {
	const entries: { key: string; label: string; value: number | null }[] = [];

	if (props.item.camp) entries.push({ key: 'camp', label: 'C.A.M.P.', value: props.item.campMaxValue });
	if (props.item.workshop) entries.push({ key: 'workshop', label: 'Мастерские', value: props.item.workshopMaxValue });

	return entries;
});

const requiresPowerDisplay = computed(() => {
	if (!props.item.requiresPower) return 'Нет';
	return props.item.powerRequired > 0 ? String(props.item.powerRequired) : 'Да';
});

// Editor IDs are long snake_case: break them after underscores, not mid-word.
const editorIdParts = computed(() => (props.item.editorId ?? '').split('_'));

const powerGeneratedDisplay = computed(() => {
	return props.item.powerGenerated > 0 ? props.item.powerGenerated : null;
});
</script>

<template>
	<div class="p-3 card-wrapper book-info-card-sticky">
		<div class="card">
			<div v-if="withImage" class="card-element book-icon">
				<a :href="prepareCampImage(item.mainImage)" class="screenshot-link">
					<img :src="prepareCampImage(item.mainImage, 512)" :alt="item.nameRu || item.nameEn || 'C.A.M.P. Item'" class="main-image" width="200" height="200" loading="lazy" @error="atomicShopHandleImageError">
				</a>
			</div>
			<div v-if="categoryInfo" class="card-element">
				<div class="card-subtitle">Категория</div>
				<div class="card-value">
					<RouterLink :to="`/f76-camp/category/${categoryInfo.formId}-${categoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchCategory(categoryInfo.formId)">
						{{ categoryInfo.nameRu }}
					</RouterLink>
					<span v-if="subcategoryInfo">
						<svg class="breadcrumb-separator" viewBox="0 0 320 512" fill="currentColor">
							<path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
						</svg>
						<RouterLink :to="`/f76-camp/subcategory/${subcategoryInfo.formId}-${subcategoryInfo.slug}`" class="text-decoration-none" @mouseenter="prefetchSubcategory(subcategoryInfo.formId)">
							{{ subcategoryInfo.nameRu }}
						</RouterLink>
					</span>
				</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Оригинальное название</div>
				<div class="card-value">{{ item.nameEn || '—' }}</div>
			</div>

			<div class="card-element">
				<div class="card-subtitle">Доступно для постройки</div>
				<div class="card-value camp-placement-badges">
					<span v-for="badge in placementBadges" :key="badge.key" class="camp-placement-badge" :class="{ 'is-available': badge.available }">
						<svg class="camp-placement-icon" viewBox="0 0 448 512" fill="currentColor">
							<path v-if="badge.available" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
							<path v-else d="M376.6 84.5c11.3-13.6 9.4-33.9-4.2-45.3s-33.9-9.4-45.3 4.2L192 206 56.6 43.5C45.3 29.9 25 27.9 11.4 39.3S-4.5 73.2 6.9 86.5L150.3 256 6.9 425.5c-11.3 13.6-9.4 33.9 4.2 45.3s33.9 9.4 45.3-4.2L192 306 327.4 468.5c11.3 13.6 31.6 15.6 45.3 4.2s15.6-31.6 4.2-45.3L233.7 256 376.6 84.5z" />
						</svg>
						{{ badge.label }}
					</span>
				</div>
			</div>
			<div v-if="maximumEntries.length > 0" class="card-element">
				<div class="card-subtitle">Максимальное количество</div>
				<div class="card-value camp-maximum-entries">
					<span v-for="entry in maximumEntries" :key="entry.key" class="camp-maximum-entry">
						{{ entry.label }}: <strong>{{ entry.value != null ? entry.value : '∞' }}</strong>
					</span>
				</div>
			</div>
			<div v-if="!powerGeneratedDisplay" class="card-element">
				<div class="card-subtitle">Требует энергию</div>
				<div class="card-value">{{ requiresPowerDisplay }}</div>
			</div>
			<div v-if="powerGeneratedDisplay" class="card-element">
				<div class="card-subtitle">Производит энергию</div>
				<div class="card-value">{{ powerGeneratedDisplay }}</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Form ID</div>
				<div class="card-value">{{ item.formId }}</div>
			</div>
			<div class="card-element">
				<div class="card-subtitle">Editor ID</div>
				<div class="card-value"><template v-for="(part, index) in editorIdParts" :key="index"><template v-if="index">_<wbr></template>{{ part }}</template></div>
			</div>
		</div>

		<!--<div class="card components-card" v-if="item.recipe?.components && item.recipe.components.length > 0">
			<F76CampRecipeComponents :components="item.recipe?.components ?? []" />
		</div>-->
	</div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/f76-info-card';

.components-card {
	margin-top: 1rem;
	padding-top: 0 !important;
	text-align: left;
}

.camp-placement-badges {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.4rem;
}

.camp-placement-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.65rem;
	border-radius: 6px;
	font-size: 0.8rem;
	background: rgba(255, 255, 255, 0.04);
	color: #71717a;

	&.is-available {
		background: rgba(38, 149, 73, 0.15);
		color: #4ade80;
	}
}

.camp-placement-icon {
	width: 0.65rem;
	height: 0.65rem;
	flex-shrink: 0;
}

.camp-maximum-entries {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.3rem 1rem;
	font-size: 0.85rem;
	color: var(--bs-body-color);
}

.camp-maximum-entry {
	font-size: 0.85rem;
	white-space: nowrap;
}

@media (max-width: 991.98px) {
	.camp-placement-badges,
	.camp-maximum-entries {
		justify-content: flex-start;
	}
}
</style>
