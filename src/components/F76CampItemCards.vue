<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, computed } from 'vue';
import { prepareCampImage, atomicShopHandleImageError } from '@/utils';
import { useQueryClient } from '@tanstack/vue-query';
import { usePrefetchCampItem } from '@/composables/useApi';

import type { RecipeSiblingItem } from '@/types';

const props = defineProps<{
	items: RecipeSiblingItem[];
	lang: 'ru' | 'en';
}>();

const INITIAL_LIMIT = 5;
const expanded = ref(false);

const visibleItems = computed(() =>
	expanded.value ? props.items : props.items.slice(0, INITIAL_LIMIT)
);

const remainingCount = computed(() => props.items.length - INITIAL_LIMIT);

const pick = (ru: string | null | undefined, en: string | null | undefined) =>
	props.lang === 'ru' ? (ru || en) : (en || ru);

const formIdToImageFilename = (formId: string) => {
	const numeric = parseInt(formId.replace(/^0x/i, ''), 16) & 0x00FFFFFF;
	return numeric.toString(16).padStart(8, '0') + '.webp';
};

const remainingLabel = computed(() => {
	const n = remainingCount.value;
	return props.lang === 'ru'
		? `И еще ${n}…`
		: `And ${n} more…`;
});

const queryClient = useQueryClient();
const prefetchItem = (formId: string) => usePrefetchCampItem(queryClient, formId);
</script>

<template>
	<div class="item-cards-list">
		<RouterLink v-for="sibling in visibleItems" :key="sibling.formId" :to="`/f76-camp/${sibling.formId}-${sibling.slug}`" class="item-card" @mouseenter="prefetchItem(sibling.formId)">
			<img :src="prepareCampImage(formIdToImageFilename(sibling.formId), 100)" class="item-card-icon" :alt="pick(sibling.nameRu, sibling.nameEn) || ''" loading="lazy" @error="atomicShopHandleImageError">
			<span class="item-card-name">{{ pick(sibling.nameRu, sibling.nameEn) }}</span>
		</RouterLink>

		<button v-if="!expanded && remainingCount > 0" type="button" class="item-card item-card-more" @click="expanded = true">
			<span class="item-card-name item-card-more-text">{{ remainingLabel }}</span>
		</button>
	</div>
</template>

<style scoped lang="scss">
.item-cards-list {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 0.6rem;
}

.item-card {
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

.item-card-more {
	cursor: pointer;
	font-family: inherit;
	justify-content: flex-start;
	text-align: left;
	background: none;
	border: none;
	padding: 0.5rem;

	.item-card-more-text {
		color: #a1a1aa;
		transition: color 0.15s ease;
	}

	&:hover {
		background: none;
		border: none;

		.item-card-more-text {
			color: var(--bs-body-color);
		}
	}
}

.item-card-icon {
	width: 44px;
	height: 44px;
	object-fit: contain;
	flex-shrink: 0;
	border-radius: 6px;
}

.item-card-name {
	font-size: .875rem;
	color: var(--bs-body-color);
	line-height: 1.25;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

@media (max-width: 767.98px) {
	.item-cards-list {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
