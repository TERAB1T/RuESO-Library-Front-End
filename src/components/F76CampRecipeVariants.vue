<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError, pluralizeRu } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampItem } from '@/composables/useApi';

import type { RecipeInfo, RecipeSiblingItem } from '@/types';

const props = defineProps<{
	recipe: RecipeInfo | null;
	recipeItems: RecipeSiblingItem[];
	lang: 'ru' | 'en';
}>();

const INITIAL_LIMIT = 25;
const expanded = ref(false);

const hasVariants = computed(() => props.recipeItems.length > 0 && !!props.recipe);

const visibleItems = computed(() =>
	expanded.value ? props.recipeItems : props.recipeItems.slice(0, INITIAL_LIMIT)
);

const remainingCount = computed(() => props.recipeItems.length - INITIAL_LIMIT);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const recipeName = computed(() => pick(props.recipe?.nameRu, props.recipe?.nameEn) || props.recipe?.editorId || '');

const remainingLabel = computed(() => {
	const n = remainingCount.value;
	return props.lang === 'ru'
		? `И еще ${n}…`
		: `And ${n} more…`;
});

const t = computed(() => props.lang === 'ru'
	? { title: 'Варианты' }
	: { title: 'Variants' }
);

const queryClient = useQueryClient();
const prefetchItem = (formId: string) => usePrefetchCampItem(queryClient, formId);
</script>

<template>
	<div v-if="hasVariants" class="recipe-variants-block">
		<div class="fo-sect-h">
			<span class="fo-bar"></span>
			<h3 class="fo-h3">{{ t.title }}</h3>
		</div>

		<div class="recipe-variants-subtitle">
			<template v-if="lang === 'ru'">
				Этот предмет относится к группе «<strong>{{ recipeName }}</strong>». В нее также {{ recipeItems.length === 1 ? 'входит' : 'входят' }}:
			</template>
			<template v-else>
				This item belongs to the “<strong>{{ recipeName }}</strong>” group. It also includes:
			</template>
		</div>

		<div class="recipe-variants-list">
			<RouterLink v-for="sibling in visibleItems" :key="sibling.formId" :to="`/f76-camp/${sibling.formId}-${sibling.slug}`" class="recipe-variant-card" @mouseenter="prefetchItem(sibling.formId)">
				<img :src="prepareCampImage(formIdToImageFilename(sibling.formId), 100)" class="recipe-variant-icon" :alt="pick(sibling.nameRu, sibling.nameEn) || ''" loading="lazy" @error="atomicShopHandleImageError">
				<span class="recipe-variant-name">{{ pick(sibling.nameRu, sibling.nameEn) }}</span>
			</RouterLink>

			<button v-if="!expanded && remainingCount > 0" type="button" class="recipe-variant-card recipe-variant-more" @click="expanded = true">
				<span class="recipe-variant-name recipe-variant-more-text">{{ remainingLabel }}</span>
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.recipe-variants-block {
	margin-top: 2.25rem;
}

.recipe-variants-subtitle {
	font-size: 1.0325rem;
	line-height: 1.6;
	margin-bottom: 1.3rem;
}

.recipe-variants-list {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 0.6rem;
}

.recipe-variant-card {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.5rem;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.07);
	text-decoration: none;
	min-width: 0;
	transition: border-color 0.15s ease, background-color 0.15s ease;

	&:hover {
		border-color: #6c757d;
		background: rgba(255, 255, 255, 0.05);
	}
}

.recipe-variant-more {
	cursor: pointer;
	font-family: inherit;
	justify-content: flex-start;
	text-align: left;
	background: none;
	border: none;
	padding: 0.5rem;

	.recipe-variant-more-text {
		color: #a1a1aa;
		transition: color 0.15s ease;
	}

	&:hover {
		background: none;
		border: none;

		.recipe-variant-more-text {
			color: var(--bs-body-color);
		}
	}
}

.recipe-variant-icon {
	width: 44px;
	height: 44px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 6px;
}

.recipe-variant-name {
	font-size: .875rem;
    font-weight: 500;
	color: var(--bs-body-color);
	line-height: 1.25;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

@media (max-width: 767.98px) {
	.recipe-variants-list {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
